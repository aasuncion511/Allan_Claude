"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";

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

async function syncVehicleStatus(
  organizationId: string,
  vehicleId: string,
  bookingStatus: BookingStatus
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

async function assertOwnedByOrg(organizationId: string, vehicleId: string, customerId: string) {
  const [vehicle, customer] = await Promise.all([
    prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId } }),
    prisma.customer.findFirst({ where: { id: customerId, organizationId } }),
  ]);
  if (!vehicle || !customer) notFound();
}

export async function createBooking(formData: FormData) {
  const organizationId = await requireOrgId();
  const data = parseBookingForm(formData);
  await assertOwnedByOrg(organizationId, data.vehicleId, data.customerId);
  await prisma.booking.create({ data: { ...data, organizationId } });
  await syncVehicleStatus(organizationId, data.vehicleId, data.status);
  revalidatePath("/bookings");
  revalidatePath("/fleet");
  revalidatePath(`/fleet/${data.vehicleId}`);
  revalidatePath("/dashboard");
  redirect(`/bookings`);
}

export async function updateBooking(bookingId: string, formData: FormData) {
  const organizationId = await requireOrgId();
  const data = parseBookingForm(formData);
  await assertOwnedByOrg(organizationId, data.vehicleId, data.customerId);
  const existing = await prisma.booking.findFirst({
    where: { id: bookingId, organizationId },
  });
  if (!existing) notFound();
  await prisma.booking.updateMany({
    where: { id: bookingId, organizationId },
    data,
  });
  await syncVehicleStatus(organizationId, data.vehicleId, data.status);
  if (existing.vehicleId !== data.vehicleId) {
    await syncVehicleStatus(organizationId, existing.vehicleId, "CANCELLED");
  }
  revalidatePath("/bookings");
  revalidatePath("/fleet");
  revalidatePath(`/fleet/${data.vehicleId}`);
  revalidatePath("/dashboard");
  redirect(`/bookings`);
}

export async function deleteBooking(bookingId: string) {
  const organizationId = await requireOrgId();
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, organizationId },
  });
  if (!booking) notFound();
  await prisma.booking.deleteMany({ where: { id: bookingId, organizationId } });
  await syncVehicleStatus(organizationId, booking.vehicleId, "CANCELLED");
  revalidatePath("/bookings");
  revalidatePath("/fleet");
  revalidatePath("/dashboard");
  redirect("/bookings");
}
