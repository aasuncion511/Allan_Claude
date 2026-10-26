import { prisma } from "@/lib/db";

/**
 * True when no non-cancelled booking for this vehicle overlaps the given
 * range. A HOLD only blocks the calendar until its holdExpiresAt passes —
 * an expired hold is treated as released, even if its row hasn't been
 * cleaned up yet.
 */
export async function isVehicleAvailable(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const now = new Date();
  const overlap = await prisma.booking.findFirst({
    where: {
      vehicleId,
      status: { not: "CANCELLED" },
      startDate: { lt: endDate },
      endDate: { gt: startDate },
      OR: [{ status: { not: "HOLD" } }, { holdExpiresAt: { gt: now } }],
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
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
      OR: [{ status: { not: "HOLD" } }, { holdExpiresAt: { gt: now } }],
    },
    select: { startDate: true, endDate: true, status: true },
    orderBy: { startDate: "asc" },
  });
  return bookings;
}
