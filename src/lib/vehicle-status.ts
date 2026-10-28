import { prisma } from "@/lib/db";

export type BookingStatusForVehicle = "RESERVED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

/** Keeps a vehicle's status in step with one of its bookings changing state.
 *  Never overrides MAINTENANCE/OUT_OF_SERVICE — those are set independently
 *  by the fleet manager and shouldn't be clobbered by a booking update. */
export async function syncVehicleStatus(
  organizationId: string,
  vehicleId: string,
  bookingStatus: BookingStatusForVehicle
) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, organizationId },
  });
  if (!vehicle) return;
  if (vehicle.status === "MAINTENANCE" || vehicle.status === "OUT_OF_SERVICE") {
    return;
  }
  const nextStatus =
    bookingStatus === "ACTIVE"
      ? "BOOKED"
      : bookingStatus === "RESERVED"
        ? "RESERVED"
        : "AVAILABLE";
  await prisma.vehicle.updateMany({
    where: { id: vehicleId, organizationId },
    data: { status: nextStatus },
  });
}
