"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission, requireOwner } from "@/lib/auth";
import { getBaseUrl } from "@/lib/url";
import { sendBookingConfirmationEmail } from "@/lib/booking-contract";
import { requestRefund } from "@/lib/refunds";
import {
  collectSecurityDeposit,
  refundSecurityDeposit,
  type DepositCollectionMethod,
  type DepositRefundMethod,
} from "@/lib/security-deposit";
import type { RefundReason } from "@/lib/paymongo";
import { syncVehicleStatus, type BookingStatusForVehicle } from "@/lib/vehicle-status";

type BookingStatus = BookingStatusForVehicle;

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

async function assertOwnedByOrg(organizationId: string, vehicleId: string, customerId: string) {
  const [vehicle, customer] = await Promise.all([
    prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId } }),
    prisma.customer.findFirst({ where: { id: customerId, organizationId } }),
  ]);
  if (!vehicle || !customer) notFound();
}

export async function createBooking(formData: FormData) {
  const { organizationId } = await requirePermission("bookings");
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
  const { organizationId } = await requirePermission("bookings");
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

export async function updateInquiryStatus(inquiryId: string, status: "CONTACTED" | "CONVERTED" | "CLOSED") {
  const { organizationId } = await requirePermission("bookings");
  const existing = await prisma.bookingInquiry.findFirst({ where: { id: inquiryId, organizationId } });
  if (!existing) notFound();
  await prisma.bookingInquiry.update({ where: { id: inquiryId }, data: { status } });
  revalidatePath("/bookings");
}

export async function resendConfirmationEmail(bookingId: string) {
  const { organizationId } = await requirePermission("bookings");
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, organizationId } });
  if (!booking) notFound();
  const baseUrl = await getBaseUrl();
  await sendBookingConfirmationEmail(booking.id, baseUrl);
  revalidatePath(`/bookings/${bookingId}/edit`);
}

export async function markSignedPhysically(bookingId: string, formData: FormData) {
  const { organizationId } = await requirePermission("bookings");
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, organizationId } });
  if (!booking) notFound();
  const signedName = String(formData.get("signedName") ?? "").trim();
  if (!signedName) return;
  await prisma.booking.update({
    where: { id: booking.id },
    data: { signedAt: new Date(), signedName, signedMethod: "PHYSICAL", signedIp: null },
  });
  revalidatePath(`/bookings/${bookingId}/edit`);
}

const REFUND_REASONS: RefundReason[] = ["duplicate", "fraudulent", "requested_by_customer", "others"];

export type RefundActionState = { error?: string; success?: boolean } | undefined;

export async function requestBookingRefundAction(
  bookingId: string,
  _prevState: RefundActionState,
  formData: FormData
): Promise<RefundActionState> {
  const user = await requireOwner();
  const amount = Number(formData.get("amount"));
  const reasonRaw = String(formData.get("paymongoReason") ?? "requested_by_customer");
  const paymongoReason: RefundReason = REFUND_REASONS.includes(reasonRaw as RefundReason)
    ? (reasonRaw as RefundReason)
    : "others";
  const notes = String(formData.get("notes") ?? "").trim();

  const result = await requestRefund({
    organizationId: user.organizationId,
    bookingId,
    requestedByUserId: user.id,
    amount,
    paymongoReason,
    notes,
  });

  if (!result.ok) return { error: result.error };
  revalidatePath(`/bookings/${bookingId}/edit`);
  revalidatePath("/bookings/refunds");
  revalidatePath("/bookings");
  revalidatePath("/fleet");
  revalidatePath("/dashboard");
  return { success: true };
}

export type DepositActionState = { error?: string; success?: boolean } | undefined;

export async function collectSecurityDepositAction(
  bookingId: string,
  _prevState: DepositActionState,
  formData: FormData
): Promise<DepositActionState> {
  const { organizationId } = await requirePermission("bookings");
  const method = String(formData.get("method") ?? "cash") as DepositCollectionMethod;
  const result = await collectSecurityDeposit({ organizationId, bookingId, method });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/bookings/${bookingId}/edit`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function refundSecurityDepositAction(
  bookingId: string,
  _prevState: DepositActionState,
  formData: FormData
): Promise<DepositActionState> {
  const user = await requirePermission("bookings");
  const method = String(formData.get("method") ?? "cash") as DepositRefundMethod;
  const result = await refundSecurityDeposit({
    organizationId: user.organizationId,
    bookingId,
    refundedByUserId: user.id,
    method,
  });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/bookings/${bookingId}/edit`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteBooking(bookingId: string) {
  const { organizationId } = await requirePermission("bookings");
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
