import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import {
  getHoldWindowMs,
  getReservationFee,
  type OrgReservationConfig,
  type ReservationCategory,
} from "@/lib/reservation-pricing";
import type { RentalOption, BookingLocationMethod } from "@/lib/booking-pricing";
import { upsertGhlContact, isGhlConfigured } from "@/lib/ghl";
import { sendBookingConfirmationEmail } from "@/lib/booking-contract";

/** Matches how @prisma/adapter-better-sqlite3 actually serializes DateTime
 *  columns on disk (verified directly against dev.db). Raw SQL literals
 *  MUST use this exact format — Date#toISOString()'s trailing "Z" sorts
 *  differently than "+00:00" at the same byte position, which would silently
 *  corrupt the lexicographic range comparisons SQLite uses for TEXT dates. */
function toSqliteDateTime(date: Date): string {
  return date.toISOString().replace("Z", "+00:00");
}

export type TripDetailsForHold = {
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
  driverFee: number;
  deliveryFee: number;
  dropoffFee: number;
  carwashFee: number;
  excessTimeFee: number;
};

export type HoldResult =
  | {
      ok: true;
      bookingId: string;
      serverNowUtc: string;
      expiresAtUtc: string;
      reservationFee: number;
    }
  | { ok: false; error: string };

/**
 * Creates a free 25-minute (org-configured) hold, or returns the customer's
 * already-active hold on the same vehicle/overlapping dates instead of
 * creating a second one. The actual concurrency guarantee comes from the
 * atomic INSERT...WHERE NOT EXISTS below, not from this read — SQLite
 * serializes writers, so at most one such INSERT can ever succeed for a
 * given vehicle/date overlap, race or no race. See v2 handoff §3 ("Timer &
 * holds" acceptance tests 6-8) and src/lib/availability.ts, which this
 * mirrors (same overlap + expired-hold-doesn't-block rule).
 */
export async function createOrResumeHold(params: {
  organizationId: string;
  vehicleId: string;
  customerId: string;
  startDate: Date;
  endDate: Date;
  dailyRate: number;
  totalAmount: number;
  org: OrgReservationConfig;
  reservationCategory: ReservationCategory | null;
  trip: TripDetailsForHold;
}): Promise<HoldResult> {
  const now = new Date();
  const nowSql = toSqliteDateTime(now);

  if (!params.reservationCategory) {
    return {
      ok: false,
      error: "This vehicle's reservation pricing hasn't been configured yet — please contact us directly to book.",
    };
  }
  const reservationFee = getReservationFee(params.org, params.reservationCategory);
  if (reservationFee == null) {
    return { ok: false, error: "Reservation pricing is not available for this vehicle." };
  }

  const existing = await prisma.booking.findFirst({
    where: {
      organizationId: params.organizationId,
      vehicleId: params.vehicleId,
      customerId: params.customerId,
      status: "HOLD",
      OR: [{ holdExpiresAt: { gt: now } }, { paymentStatus: "PENDING" }],
      startDate: { lt: params.endDate },
      endDate: { gt: params.startDate },
    },
  });
  if (existing) {
    return {
      ok: true,
      bookingId: existing.id,
      serverNowUtc: now.toISOString(),
      expiresAtUtc: existing.holdExpiresAt!.toISOString(),
      reservationFee: existing.reservationFeeDue ?? reservationFee,
    };
  }

  const id = randomUUID();
  const expiresAt = new Date(now.getTime() + getHoldWindowMs(params.org));
  const startSql = toSqliteDateTime(params.startDate);
  const endSql = toSqliteDateTime(params.endDate);
  const expiresSql = toSqliteDateTime(expiresAt);
  const t = params.trip;

  const inserted = await prisma.$executeRaw`
    INSERT INTO "Booking" (
      "id", "organizationId", "vehicleId", "customerId", "startDate", "endDate",
      "status", "source", "dailyRate", "totalAmount", "amountPaid", "paymentStatus",
      "reservationFeeDue", "holdExpiresAt",
      "rentalOption", "pickupMethod", "dropoffMethod", "pickupLocation", "dropoffLocation",
      "startTime", "endTime", "excessHours", "carwashRequested",
      "destinationDetails", "purposeOfTravel", "howFoundUs",
      "driverFee", "deliveryFee", "dropoffFee", "carwashFee", "excessTimeFee",
      "updatedAt"
    )
    SELECT
      ${id}, ${params.organizationId}, ${params.vehicleId}, ${params.customerId},
      ${startSql}, ${endSql},
      'HOLD', 'ONLINE', ${params.dailyRate}, ${params.totalAmount}, 0, 'UNPAID',
      ${reservationFee}, ${expiresSql},
      ${t.rentalOption}, ${t.pickupMethod}, ${t.dropoffMethod}, ${t.pickupLocation}, ${t.dropoffLocation},
      ${t.startTime}, ${t.endTime}, ${t.excessHours}, ${t.carwashRequested ? 1 : 0},
      ${t.destinationDetails}, ${t.purposeOfTravel}, ${t.howFoundUs},
      ${t.driverFee}, ${t.deliveryFee}, ${t.dropoffFee}, ${t.carwashFee}, ${t.excessTimeFee},
      ${nowSql}
    WHERE NOT EXISTS (
      SELECT 1 FROM "Booking"
      WHERE "vehicleId" = ${params.vehicleId}
        AND "status" != 'CANCELLED'
        AND "startDate" < ${endSql}
        AND "endDate" > ${startSql}
        AND ("status" != 'HOLD' OR "holdExpiresAt" > ${nowSql} OR "paymentStatus" = 'PENDING')
    )
  `;

  if (inserted === 0) {
    return {
      ok: false,
      error: "Sorry, this unit was just held or booked for part of those dates. Please choose different dates.",
    };
  }

  return { ok: true, bookingId: id, serverNowUtc: now.toISOString(), expiresAtUtc: expiresAt.toISOString(), reservationFee };
}

export type HoldState =
  | { status: "NOT_FOUND" }
  | { status: "EXPIRED"; serverNowUtc: string }
  | {
      status: "HELD";
      serverNowUtc: string;
      expiresAtUtc: string;
      reservationFee: number;
      vehicleId: string;
      startDate: string;
      endDate: string;
    }
  /** Checkout was started (customer sent to PayMongo) but the webhook
   *  hasn't confirmed payment yet — distinct from HELD so the UI never
   *  shows "pay to reserve" again right after a customer already paid and
   *  got redirected back. */
  | { status: "CHECKOUT_PENDING"; serverNowUtc: string }
  /** PayMongo's Expire API refused to expire the checkout because a
   *  payment was already paid/pending/processing — the v2 handoff's
   *  PAYMENT_RESOLUTION_PENDING safe state. */
  | { status: "PAYMENT_PENDING"; serverNowUtc: string }
  | { status: "CONFIRMED"; serverNowUtc: string };

/** Resync for the frontend countdown — called on mount, focus, visibility
 *  change, online, and return-from-PayMongo. Also the lazy-expiry backstop:
 *  a hold past its expiry is reported EXPIRED here even if the background
 *  cron (src/app/api/cron/hold-expiry) hasn't swept it yet. */
export async function getHoldState(bookingId: string, customerId: string): Promise<HoldState> {
  const now = new Date();
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, customerId } });
  if (!booking) return { status: "NOT_FOUND" };

  if (booking.status === "CANCELLED") return { status: "EXPIRED", serverNowUtc: now.toISOString() };

  if (booking.status === "HOLD") {
    if (booking.paymentStatus === "PENDING") {
      // Payment resolution pending at the moment the timer would otherwise
      // have expired — never report EXPIRED while this is unresolved.
      return { status: "PAYMENT_PENDING", serverNowUtc: now.toISOString() };
    }
    if (booking.checkoutInitiatedAt) {
      // Customer already went to PayMongo at least once; a stale unexpired
      // hold with no payment is possible (cancelled checkout), but once
      // checkout has started we surface "processing" rather than inviting
      // a second payment attempt — the resync loop picks up CONFIRMED/
      // EXPIRED the moment the webhook (or expiry sweep) resolves it.
      return { status: "CHECKOUT_PENDING", serverNowUtc: now.toISOString() };
    }
    if (!booking.holdExpiresAt || booking.holdExpiresAt <= now) {
      return { status: "EXPIRED", serverNowUtc: now.toISOString() };
    }
    return {
      status: "HELD",
      serverNowUtc: now.toISOString(),
      expiresAtUtc: booking.holdExpiresAt.toISOString(),
      reservationFee: booking.reservationFeeDue ?? 0,
      vehicleId: booking.vehicleId,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
    };
  }

  return { status: "CONFIRMED", serverNowUtc: now.toISOString() };
}

/**
 * Confirms a HOLD into a paid, calendar-blocking reservation. Shared by
 * both the PayMongo webhook and the hold-expiry reconciliation cron so a
 * payment can be confirmed from EITHER path with the exact same guarantee:
 * idempotent via `status !== "HOLD"`, so a duplicate/out-of-order webhook
 * or a reconciliation pass finding an already-confirmed booking is always
 * a safe no-op (v2 handoff acceptance tests 14, 15, 19 — "a late webhook
 * must not create two confirmed bookings").
 *
 * `organizationId` MUST be the org whose webhook/credentials actually
 * authenticated this confirmation (resolved from the webhook URL's signed
 * org, or from the reconciliation cron's own DB row) — never trust a
 * `bookingId` alone. A webhook event is only proof that ITS OWN org's
 * PayMongo account fired it; without this check, any org on the platform
 * could confirm (and silently steal) a hold belonging to a different org
 * by crafting their own checkout session's metadata to reference someone
 * else's booking id.
 */
export async function confirmHoldPayment(
  bookingId: string,
  checkoutId: string,
  organizationId: string
): Promise<{ confirmed: true; bookingId: string } | { confirmed: false }> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "HOLD" || booking.organizationId !== organizationId) {
    return { confirmed: false };
  }

  const now = new Date();
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: booking.startDate <= now && booking.endDate >= now ? "ACTIVE" : "RESERVED",
      holdExpiresAt: null,
      amountPaid: booking.reservationFeeDue ?? 0,
      paymentStatus: "PAID",
      paymongoCheckoutId: checkoutId,
      paymentConfirmedAt: now,
    },
  });

  if (updated.startDate <= now && updated.endDate >= now) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: updated.vehicleId } });
    if (vehicle && vehicle.status !== "MAINTENANCE" && vehicle.status !== "OUT_OF_SERVICE") {
      await prisma.vehicle.update({ where: { id: updated.vehicleId }, data: { status: "BOOKED" } });
    }
  }

  return { confirmed: true, bookingId: updated.id };
}

/** GHL sync + confirmation email for a just-confirmed reservation — shared
 *  by the webhook and the reconciliation cron (see confirmHoldPayment). */
export async function notifyReservationConfirmed(bookingId: string, baseUrl: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, organization: true },
  });
  if (!booking) return;
  const org = booking.organization;

  if (isGhlConfigured(org)) {
    const tags = ["reserved-online"];
    if (booking.purposeOfTravel) tags.push(`purpose:${booking.purposeOfTravel}`);
    if (booking.howFoundUs) tags.push(`source:${booking.howFoundUs}`);
    await upsertGhlContact(
      { locationId: org.ghlLocationId!, apiToken: org.ghlApiToken! },
      { name: booking.customer.name, email: booking.customer.email ?? "", phone: booking.customer.phone, tags }
    );
  }

  try {
    await sendBookingConfirmationEmail(booking.id, baseUrl);
  } catch {
    // Already logged/persisted inside sendBookingConfirmationEmail's own
    // try/catch paths; this outer guard is just extra safety.
  }
}
