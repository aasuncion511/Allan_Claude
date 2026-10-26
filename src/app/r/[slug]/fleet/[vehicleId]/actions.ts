"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { isVehicleAvailable } from "@/lib/availability";
import { createCheckoutSession, pesosToCentavos } from "@/lib/paymongo";
import { getBaseUrl } from "@/lib/url";
import { upsertGhlContact, isGhlConfigured } from "@/lib/ghl";

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
  const available = await isVehicleAvailable(vehicleId, startDate, endDate);
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

/** kind="reservation" pays the full reservation fee for an instant confirmed booking.
 *  kind="hold" pays the smaller hold fee to block the calendar for 2 hours. */
export async function createBookingCheckout(
  slug: string,
  vehicleId: string,
  kind: "reservation" | "hold",
  _prevState: BookingCheckoutState,
  formData: FormData
): Promise<BookingCheckoutState> {
  const range = parseDateRange(formData);
  if ("error" in range) return range;
  const { startDate, endDate } = range;

  const ctx = await loadBookableContext(slug, vehicleId);
  if ("error" in ctx) return ctx;
  const { customer, org, vehicle } = ctx;

  const available = await isVehicleAvailable(vehicleId, startDate, endDate);
  if (!available) {
    return { error: "Sorry, this unit is already booked or held for part of those dates. Please choose different dates." };
  }

  if (!org.paymongoSecretKey) {
    return {
      error: "Online payment isn't set up for this rental company yet. Please contact them directly to book.",
    };
  }

  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
  const totalAmount = vehicle.dailyRate * days;
  const amount = kind === "hold" ? org.holdFeeAmount : org.reservationFeeAmount;
  const baseUrl = await getBaseUrl();

  let checkoutUrl: string;
  try {
    const session = await createCheckoutSession({
      secretKey: org.paymongoSecretKey,
      amountCentavos: pesosToCentavos(amount),
      description:
        kind === "hold"
          ? `2-hour hold — ${vehicle.year} ${vehicle.make} ${vehicle.model} (${slug})`
          : `Reservation fee — ${vehicle.year} ${vehicle.make} ${vehicle.model} (${slug})`,
      successUrl: `${baseUrl}/r/${slug}/confirmed?vehicleId=${vehicleId}`,
      cancelUrl: `${baseUrl}/r/${slug}/fleet/${vehicleId}`,
      metadata: {
        kind,
        organizationId: org.id,
        vehicleId: vehicle.id,
        customerId: customer.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dailyRate: String(vehicle.dailyRate),
        totalAmount: String(totalAmount),
        amountPaid: String(amount),
      },
    });
    checkoutUrl = session.checkoutUrl;
  } catch {
    return { error: "Couldn't start checkout. Please try again in a moment." };
  }
  redirect(checkoutUrl);
}

/** Pays the remaining balance of the reservation fee to convert an active HOLD into a confirmed booking. */
export async function createHoldConversionCheckout(
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
  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "HOLD") return { error: "This hold is no longer active." };
  if (!booking.holdExpiresAt || booking.holdExpiresAt < new Date()) {
    return { error: "This hold has expired. Please book again." };
  }
  if (!org.paymongoSecretKey) {
    return { error: "Online payment isn't set up for this rental company yet. Please contact them directly." };
  }

  const balance = Math.max(0, org.reservationFeeAmount - booking.amountPaid);
  const baseUrl = await getBaseUrl();

  if (balance === 0) {
    // Hold fee already covers the full reservation fee — confirm immediately, no second charge.
    const now = new Date();
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: booking.startDate <= now && booking.endDate >= now ? "ACTIVE" : "RESERVED",
        holdExpiresAt: null,
      },
    });
    redirect(`/r/${slug}/confirmed?vehicleId=${booking.vehicleId}`);
  }

  let checkoutUrl: string;
  try {
    const session = await createCheckoutSession({
      secretKey: org.paymongoSecretKey,
      amountCentavos: pesosToCentavos(balance),
      description: `Balance to confirm — ${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model} (${slug})`,
      successUrl: `${baseUrl}/r/${slug}/confirmed?vehicleId=${booking.vehicleId}`,
      cancelUrl: `${baseUrl}/r/${slug}/account`,
      metadata: {
        kind: "convert",
        organizationId: org.id,
        bookingId: booking.id,
        amountPaid: String(balance),
      },
    });
    checkoutUrl = session.checkoutUrl;
  } catch {
    return { error: "Couldn't start checkout. Please try again in a moment." };
  }
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

  const available = await isVehicleAvailable(vehicleId, startDate, endDate);
  if (!available) {
    return { error: "Sorry, this unit is already booked or held for part of those dates. Please choose different dates." };
  }

  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000));
  const totalAmount = vehicle.dailyRate * days;
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
      totalAmount,
      amountPaid: 0,
      paymentStatus: "INVOICED",
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
