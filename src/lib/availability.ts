import { prisma } from "@/lib/db";

/** True when no non-cancelled booking for this vehicle overlaps the given range. */
export async function isVehicleAvailable(
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const overlap = await prisma.booking.findFirst({
    where: {
      vehicleId,
      status: { not: "CANCELLED" },
      startDate: { lt: endDate },
      endDate: { gt: startDate },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
  });
  return !overlap;
}
