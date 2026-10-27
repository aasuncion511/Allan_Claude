"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { isVehicleAvailable } from "@/lib/availability";
import { createCheckoutSession, getCheckoutSession, pesosToCentavos } from "@/lib/paymongo";
import { getBaseUrl } from "@/lib/url";
import { upsertGhlContact, isGhlConfigured } from "@/lib/ghl";
import { computeBookingPricing, type RentalOption, type BookingLocationMethod } from "@/lib/booking-pricing";
import { createOrResumeHold, getHoldState, type HoldState } from "@/lib/holds";
import type { ReservationCategory } from "@/lib/reservation-pricing";

type TripDetails = {
  rentalOption: RentalOption;
  pickupMethod: BookingLocationMethod;
  dropoffMethod: BookingLocationMethod;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  startTime: string | null;
  endTime: string | null;
  excessHours: number;
  carwashRequested: boolean;
  destinationDetails: string | null;
  purposeOfTravel: string | null;
  howFoundUs: string | null;
};

/** Reads the trip-detail fields a customer filled in, re-validated against what this org
 *  actually offers — a manipulated form can't unlock driver service an org doesn't provide. */
function parseTripDetails(
  formData: FormData,
  org: { offersDriverService: boolean; carwashFeeAmount: number }
): TripDetails | { error: string } {
  const rentalOption: RentalOption =
    org.offersDriverService && formData.get("rentalOption") === "WITH_DRIVER" ? "WITH_DRIVER" : "SELF_DRIVE";
  const pickupMethod: BookingLocationMethod = formData.get("pickupMethod") === "DELIVERED" ? "DELIVERED" : "GARAGE";
  const dropoffMethod: BookingLocationMethod = formData.get("dropoffMethod") === "DELIVERED" ? "DELIVERED" : "GARAGE";

  const pickupLocation = String(formData.get("pickupLocation") ?? "").trim() || null;
  if (pickupMethod === "DELIVERED" && !pickupLocation) {
    return { error: "Please enter where you'd like the car delivered." };
  }
  const dropoffLocation = String(formData.get("dropoffLocation") ?? "").trim() || null;
  if (dropoffMethod === "DELIVERED" && !dropoffLocation) {
    return { error: "Please enter your drop-off location." };
  }

  const excessHoursRaw = Number(formData.get("excessHours"));
  const excessHours = Number.isFinite(excessHoursRaw) ? Math.max(0, Math.min(24, Math.round(excessHoursRaw))) : 0;

  return {
    rentalOption,
    pickupMethod,
    dropoffMethod,
    pickupLocation: pickupMethod === "DELIVERED" ? pickupLocation : null,
    dropoffLocation: dropoffMethod === "DELIVERED" ? dropoffLocation : null,
    startTime: String(formData.get("startTime") ?? "").trim() || null,
    endTime: String(formData.get("endTime") ?? "").trim() || null,
    excessHours,
    carwashRequested: org.carwashFeeAmount > 0 && formData.get("carwashRequested") === "on",
    destinationDetails: String(formData.get("destinationDetails") ?? "").trim() || null,
    purposeOfTravel: String(formData.get("purposeOfTravel") ?? "").trim() || null,
    howFoundUs: String(formData.get("howFoundUs") ?? "").trim() || null,
  };
}

function parseDateRange(formData: FormData): { startDate: Date; endDate: Date } | { error: string } {
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return { error: "Please choose a valid date range." };
  }
  if (startDate < new Date(new Date().toDateString())) {
    return { error: "Start date can't be in the past." };
  }
  return { startDate, endDate };
}

export type AvailabilityState = { available: boolean; error?: string };

export async function checkAvailabilityAction(
  vehicleId: string,
  startDateIso: string,
  endDateIso: string
): Promise<AvailabilityState> {
  const startDate = new Date(startDateIso);
  const endDate = new Date(endDateIso);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return { available: false, error: "Please choose a valid date range." };
  }
  const customer = await getCurrentCustomer();
  const available = await isVehicleAvailable(vehicleId, startDate, endDate, undefined, customer?.id);
  return available
    ? { available: true }
    : { available: false, error: "Those dates overlap an existing booking or hold. Pick different dates." };
}

async function loadBookableContext(slug: string, vehicleId: string) {
  const customer = await getCurrentCustomer();
  if (!customer || customer.organization.slug !== slug) {
    return { error: "Please enter your contact details first." } as const;
  }
  const org = await prisma.organization.findUnique({ where: { id: customer.organizationId } });
  if (!org || org.slug !== slug) return { error: "This rental company could not be found." } as const;

  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId: org.id } });
  if (!vehicle) return { error: "This vehicle could not be found." } as const;
  if (vehicle.status === "MAINTENANCE" || vehicle.status === "OUT_OF_SERVICE") {
    return { error: "This unit isn't available for booking right now." } as const;
  }
  return { customer, org, vehicle } as const;
}

export type BookingCheckoutState = { error?: string } | undefined;

export type HoldActionState =
  | { error?: string; bookingId?: undefined }
  | { bookingId: string; serverNowUtc: string; expiresAtUtc: string; reservationFee: number; error?: undefined }
  | undefined;

/**
 * Creates (or resumes) a FREE, server-controlled hold — no payment, no
 * checkout. The 25-minute (org-configured) expiry is set once, here, and is
 * never touched again by refresh/navigation/PayMongo round-trips. See
 * src/lib/holds.ts for the atomic concurrency guarantee.
 */
export async function createOrResumeHoldAction(
  slug: string,
  vehicleId: string,
  _prevState: HoldActionState,
  formData: FormData
): Promise<HoldActionState> {
  const range = parseDateRange(formData);
  if ("error" in range) return range;
  const { startDate, endDate } = range;

  const ctx = await loadBookableContext(slug, vehicleId);
  if ("error" in ctx) return ctx;
  const { customer, org, vehicle } = ctx;

  const trip = parseTripDetails(formData, org);
  if ("error" in trip) return trip;

  const available = await isVehicleAvailable(vehicleId, startDate, endDate, undefined, customer.id);
  if (!available) {
    return { error: "Sorry, this unit is already booked or held for part of those dates. Please choose different dates." };
  }

  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
  const pricing = computeBookingPricing({
    dailyRate: vehicle.dailyRate,
    days,
    rentalOption: trip.rentalOption,
    pickupMethod: trip.pickupMethod,
    dropoffMethod: trip.dropoffMethod,
    carwashRequested: trip.carwashRequested,
    excessHours: trip.excessHours,
    driverFeePerDay: org.driverFeePerDay,
    deliveryFeeAmount: org.deliveryFeeAmount,
    dropoffFeeAmount: org.dropoffFeeAmount,
    carwashFeeAmount: org.carwashFeeAmount,
    excessHourlyRate: org.excessHourlyRate,
  });

  const result = await createOrResumeHold({
    organizationId: org.id,
    vehicleId: vehicle.id,
    customerId: customer.id,
    startDate,
    endDate,
    dailyRate: vehicle.dailyRate,
    totalAmount: pricing.totalAmount,
    org,
    reservationCategory: vehicle.reservationCategory as ReservationCategory | null,
    trip: {
      rentalOption: trip.rentalOption,
      pickupMethod: trip.pickupMethod,
      dropoffMethod: trip.dropoffMethod,
      pickupLocation: trip.pickupLocation,
      dropoffLocation: trip.dropoffLocation,
      startTime: trip.startTime,
      endTime: trip.endTime,
      excessHours: trip.excessHours,
      carwashRequested: trip.carwashRequested,
      destinationDetails: trip.destinationDetails,
      purposeOfTravel: trip.purposeOfTravel,
      howFoundUs: trip.howFoundUs,
      driverFee: pricing.driverFee,
      deliveryFee: pricing.deliveryFee,
      dropoffFee: pricing.dropoffFee,
      carwashFee: pricing.carwashFee,
      excessTimeFee: pricing.excessTimeFee,
    },
  });

  if (!result.ok) return { error: result.error };
  return {
    bookingId: result.bookingId,
    serverNowUtc: result.serverNowUtc,
    expiresAtUtc: result.expiresAtUtc,
    reservationFee: result.reservationFee,
  };
}

/** Resync point for the frontend countdown — never trust a local timer alone. */
export async function getHoldStateAction(bookingId: string): Promise<HoldState | { status: "NOT_FOUND" }> {
  const customer = await getCurrentCustomer();
  if (!customer) return { status: "NOT_FOUND" };
  return getHoldState(bookingId, customer.id);
}

/**
 * Creates (or reuses) a PayMongo checkout session for the category
 * reservation fee on an EXISTING free hold. Verified payment (via the
 * webhook) is what actually confirms the booking — this just starts
 * checkout. Never trusts a client-sent amount: the fee is read fresh from
 * org config + the vehicle's reservationCategory every time.
 */
export async function createReservationCheckoutAction(
  slug: string,
  bookingId: string,
  _prevState: BookingCheckoutState,
  _formData: FormData
): Promise<BookingCheckoutState> {
  const customer = await getCurrentCustomer();
  if (!customer || customer.organization.slug !== slug) {
    return { error: "Please sign in to continue." };
  }
  const org = await prisma.organization.findUnique({ where: { id: customer.organizationId } });
  if (!org) return { error: "This rental company could not be found." };

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerId: customer.id, organizationId: org.id },
    include: { vehicle: true },
  });
  if (!booking) return { error: "Hold not found." };
  if (booking.status !== "HOLD") return { error: "This hold is no longer active." };
  if (!booking.holdExpiresAt || booking.holdExpiresAt < new Date()) {
    return { error: "Your hold has expired. Please check availability again." };
  }
  if (!org.paymongoSecretKey) {
    return { error: "Online payment isn't set up for this rental company yet. Please contact them directly." };
  }

  // Use the fee snapshotted at hold creation, not today's org config — a
  // mid-flight price change must never shift the amount under a customer
  // whose timer is already running.
  const amount = booking.reservationFeeDue;
  if (!amount || amount <= 0) {
    return { error: "Reservation pricing isn't configured for this vehicle. Please contact us directly." };
  }

  const baseUrl = await getBaseUrl();

  // Reuse an existing unpaid/active checkout rather than creating a duplicate.
  if (booking.paymongoCheckoutId && booking.paymongoCheckoutUrl) {
    try {
      const status = await getCheckoutSession(org.paymongoSecretKey, booking.paymongoCheckoutId);
      if (status.paymentState === "unpaid" || status.paymentState === "failed") {
        redirect(booking.paymongoCheckoutUrl);
      }
      // paid/pending/processing — a webhook may just be in flight; send them
      // back to the confirmation page to see current status rather than
      // starting a second charge attempt.
      redirect(`/r/${slug}/confirmed?vehicleId=${booking.vehicleId}`);
    } catch {
      // Retrieval failed (network hiccup) — fall through and start a fresh session.
    }
  }

  let checkoutUrl: string;
  let checkoutId: string;
  try {
    const session = await createCheckoutSession({
      secretKey: org.paymongoSecretKey,
      amountCentavos: pesosToCentavos(amount),
      description: `Reservation fee — ${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model} (${slug})`,
      successUrl: `${baseUrl}/r/${slug}/confirmed?vehicleId=${booking.vehicleId}`,
      cancelUrl: `${baseUrl}/r/${slug}/fleet/${booking.vehicleId}`,
      metadata: {
        kind: "reservation_v2",
        organizationId: org.id,
        bookingId: booking.id,
      },
    });
    checkoutUrl = session.checkoutUrl;
    checkoutId = session.id;
  } catch {
    return { error: "Couldn't start checkout. Please try again in a moment." };
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymongoCheckoutId: checkoutId,
      paymongoCheckoutUrl: checkoutUrl,
      checkoutInitiatedAt: booking.checkoutInitiatedAt ?? new Date(),
    },
  });

  redirect(checkoutUrl);
}

export type InquiryState = { error?: string; success?: boolean } | undefined;

/** "Request a callback" — captures a lead, no payment, no calendar hold. */
export async function createCallbackInquiry(
  slug: string,
  vehicleId: string,
  _prevState: InquiryState,
  formData: FormData
): Promise<InquiryState> {
  const range = parseDateRange(formData);
  if ("error" in range) return range;
  const { startDate, endDate } = range;

  const ctx = await loadBookableContext(slug, vehicleId);
  if ("error" in ctx) return ctx;
  const { customer, org, vehicle } = ctx;

  const message = String(formData.get("message") ?? "").trim() || null;

  await prisma.bookingInquiry.create({
    data: {
      organizationId: org.id,
      vehicleId: vehicle.id,
      customerId: customer.id,
      startDate,
      endDate,
      message,
    },
  });

  if (isGhlConfigured(org)) {
    await upsertGhlContact(
      { locationId: org.ghlLocationId!, apiToken: org.ghlApiToken! },
      {
        name: customer.name,
        email: customer.email ?? "",
        phone: customer.phone,
        tags: ["hot-lead", "callback-requested"],
      }
    );
  }

  return { success: true };
}

export type CorporateBookingState = { error?: string } | undefined;

/** Accredited corporate account books with no online payment — gated by a shared access
 *  code so a public visitor can't just pick a company name off the dropdown for free. */
export async function createCorporateBooking(
  slug: string,
  vehicleId: string,
  _prevState: CorporateBookingState,
  formData: FormData
): Promise<CorporateBookingState> {
  const range = parseDateRange(formData);
  if ("error" in range) return range;
  const { startDate, endDate } = range;

  const ctx = await loadBookableContext(slug, vehicleId);
  if ("error" in ctx) return ctx;
  const { customer, org, vehicle } = ctx;

  const corporateClientId = String(formData.get("corporateClientId") ?? "").trim();
  const accessCode = String(formData.get("accessCode") ?? "").trim();
  if (!corporateClientId || !accessCode) {
    return { error: "Please select your company and enter its access code." };
  }

  const corporateClient = await prisma.corporateClient.findFirst({
    where: { id: corporateClientId, organizationId: org.id, active: true },
  });
  if (!corporateClient || corporateClient.accessCode !== accessCode) {
    return { error: "Invalid company or access code." };
  }

  const trip = parseTripDetails(formData, org);
  if ("error" in trip) return trip;

  const available = await isVehicleAvailable(vehicleId, startDate, endDate);
  if (!available) {
    return { error: "Sorry, this unit is already booked or held for part of those dates. Please choose different dates." };
  }

  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
  const pricing = computeBookingPricing({
    dailyRate: vehicle.dailyRate,
    days,
    rentalOption: trip.rentalOption,
    pickupMethod: trip.pickupMethod,
    dropoffMethod: trip.dropoffMethod,
    carwashRequested: trip.carwashRequested,
    excessHours: trip.excessHours,
    driverFeePerDay: org.driverFeePerDay,
    deliveryFeeAmount: org.deliveryFeeAmount,
    dropoffFeeAmount: org.dropoffFeeAmount,
    carwashFeeAmount: org.carwashFeeAmount,
    excessHourlyRate: org.excessHourlyRate,
  });
  const now = new Date();

  await prisma.booking.create({
    data: {
      organizationId: org.id,
      vehicleId: vehicle.id,
      customerId: customer.id,
      corporateClientId: corporateClient.id,
      startDate,
      endDate,
      status: startDate <= now && endDate >= now ? "ACTIVE" : "RESERVED",
      source: "ONLINE",
      dailyRate: vehicle.dailyRate,
      totalAmount: pricing.totalAmount,
      amountPaid: 0,
      paymentStatus: "INVOICED",
      rentalOption: trip.rentalOption,
      pickupMethod: trip.pickupMethod,
      dropoffMethod: trip.dropoffMethod,
      pickupLocation: trip.pickupLocation,
      dropoffLocation: trip.dropoffLocation,
      startTime: trip.startTime,
      endTime: trip.endTime,
      excessHours: trip.excessHours,
      carwashRequested: trip.carwashRequested,
      destinationDetails: trip.destinationDetails,
      purposeOfTravel: trip.purposeOfTravel,
      howFoundUs: trip.howFoundUs,
      driverFee: pricing.driverFee,
      deliveryFee: pricing.deliveryFee,
      dropoffFee: pricing.dropoffFee,
      carwashFee: pricing.carwashFee,
      excessTimeFee: pricing.excessTimeFee,
    },
  });

  if (startDate <= now && endDate >= now && vehicle.status !== "MAINTENANCE" && vehicle.status !== "OUT_OF_SERVICE") {
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { status: "BOOKED" } });
  }

  if (isGhlConfigured(org)) {
    await upsertGhlContact(
      { locationId: org.ghlLocationId!, apiToken: org.ghlApiToken! },
      {
        name: customer.name,
        email: customer.email ?? "",
        phone: customer.phone,
        tags: ["corporate-booking", `corp:${corporateClient.name}`],
      }
    );
  }

  redirect(`/r/${slug}/confirmed?vehicleId=${vehicleId}`);
}
