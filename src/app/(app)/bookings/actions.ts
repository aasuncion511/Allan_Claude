"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type BookingStatus = "RESERVED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

function parseBookingForm(formData: FormData) {
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  const dailyRate = Number(formData.get("dailyRate"));
  const days = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000)
  );

  return {
    vehicleId: String(formData.get("vehicleId")),
    customerId: String(formData.get("customerId")),
    startDate,
    endDate,
    status: String(formData.get("status") ?? "RESERVED") as BookingStatus,
    dailyRate,
    totalAmount: dailyRate * days,
    securityDeposit: Number(formData.get("securityDeposit") ?? 0),
    amountPaid: Number(formData.get("amountPaid") ?? 0),
    pickupLocation: String(formData.get("pickupLocation") ?? "").trim() || null,
    dropoffLocation:
      String(formData.get("dropoffLocation") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

async function syncVehicleStatus(vehicleId: string, bookingStatus: BookingStatus) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
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
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: nextStatus },
  });
}

export async function createBooking(formData: FormData) {
  await requireUser();
  const data = parseBookingForm(formData);
  await prisma.booking.create({ data });
  await syncVehicleStatus(data.vehicleId, data.status);
  revalidatePath("/bookings");
  revalidatePath("/fleet");
  revalidatePath(`/fleet/${data.vehicleId}`);
  revalidatePath("/dashboard");
  redirect(`/bookings`);
}

export async function updateBooking(bookingId: string, formData: FormData) {
  await requireUser();
  const data = parseBookingForm(formData);
  const existing = await prisma.booking.findUnique({ where: { id: bookingId } });
  await prisma.booking.update({ where: { id: bookingId }, data });
  await syncVehicleStatus(data.vehicleId, data.status);
  if (existing && existing.vehicleId !== data.vehicleId) {
    await syncVehicleStatus(existing.vehicleId, "CANCELLED");
  }
  revalidatePath("/bookings");
  revalidatePath("/fleet");
  revalidatePath(`/fleet/${data.vehicleId}`);
  revalidatePath("/dashboard");
  redirect(`/bookings`);
}

export async function deleteBooking(bookingId: string) {
  await requireUser();
  const booking = await prisma.booking.delete({ where: { id: bookingId } });
  await syncVehicleStatus(booking.vehicleId, "CANCELLED");
  revalidatePath("/bookings");
  revalidatePath("/fleet");
  revalidatePath("/dashboard");
  redirect("/bookings");
}
