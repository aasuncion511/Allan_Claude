import { prisma } from "@/lib/db";

/**
 * True when no non-cancelled booking for this vehicle overlaps the given
 * range. A HOLD only blocks the calendar until its holdExpiresAt passes —
 * an expired hold is treated as released, even if its row hasn't been
 * cleaned up yet — UNLESS its payment is PENDING (a PayMongo checkout the
 * Expire API refused because payment already succeeded or is still
 * pending/processing). That safe state keeps blocking regardless of the
 * timer, per the v2 handoff: never release inventory on a frontend timer
 * reaching zero while a payment might still land. See src/lib/holds.ts,
 * whose atomic INSERT mirrors this exact rule.
 */
export async function isVehicleAvailable(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string,
  /** A customer's own active hold on this exact vehicle/range isn't a
   *  conflict for THEM — they'll just resume it (see createOrResumeHold).
   *  Without this, a customer navigating back to a vehicle they already
   *  hold would be falsely told it's unavailable. */
  ignoreHoldsForCustomerId?: string
): Promise<boolean> {
  const now = new Date();
  const overlap = await prisma.booking.findFirst({
    where: {
      vehicleId,
      status: { not: "CANCELLED" },
      startDate: { lt: endDate },
      endDate: { gt: startDate },
      OR: [{ status: { not: "HOLD" } }, { holdExpiresAt: { gt: now } }, { paymentStatus: "PENDING" }],
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      ...(ignoreHoldsForCustomerId
        ? { NOT: { status: "HOLD", customerId: ignoreHoldsForCustomerId } }
        : {}),
    },
  });
  return !overlap;
}

/** Ranges to show as blocked on a public calendar: confirmed bookings + active holds. */
export async function getBlockedRanges(
  vehicleId: string
): Promise<{ startDate: Date; endDate: Date; status: string }[]> {
  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      vehicleId,
      status: { not: "CANCELLED" },
      endDate: { gte: now },
      OR: [{ status: { not: "HOLD" } }, { holdExpiresAt: { gt: now } }, { paymentStatus: "PENDING" }],
    },
    select: { startDate: true, endDate: true, status: true },
    orderBy: { startDate: "asc" },
  });
  return bookings;
}
