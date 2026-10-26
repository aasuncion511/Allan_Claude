"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { createCheckoutSession, pesosToCentavos } from "@/lib/paymongo";
import { getBaseUrl } from "@/lib/url";

export type CreateChargeState = { error?: string; checkoutUrl?: string } | undefined;

/** Staff create a charge (balance due, damage, late fee, etc.) and get a PayMongo
 *  link to hand the customer — staff never touch the payment themselves. */
export async function createChargeAndCheckout(
  bookingId: string,
  _prevState: CreateChargeState,
  formData: FormData
): Promise<CreateChargeState> {
  const { organizationId } = await requirePermission("bookings");

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, organizationId },
    include: { vehicle: true, organization: true },
  });
  if (!booking) notFound();

  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  if (!description) return { error: "Please describe what this charge is for." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Please enter a valid amount." };

  if (!booking.organization.paymongoSecretKey) {
    return { error: "Online payment isn't set up for this organization yet (Settings → Storefront)." };
  }

  const charge = await prisma.bookingCharge.create({
    data: { organizationId, bookingId, description, amount, status: "PENDING" },
  });

  const baseUrl = await getBaseUrl();
  try {
    const session = await createCheckoutSession({
      secretKey: booking.organization.paymongoSecretKey,
      amountCentavos: pesosToCentavos(amount),
      description: `${description} — ${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`,
      successUrl: `${baseUrl}/bookings/${bookingId}/edit`,
      cancelUrl: `${baseUrl}/bookings/${bookingId}/edit`,
      metadata: { kind: "charge", chargeId: charge.id, organizationId },
    });
    await prisma.bookingCharge.update({
      where: { id: charge.id },
      data: { paymongoCheckoutId: session.id },
    });
    revalidatePath(`/bookings/${bookingId}/edit`);
    return { checkoutUrl: session.checkoutUrl };
  } catch {
    await prisma.bookingCharge.update({ where: { id: charge.id }, data: { status: "CANCELLED" } });
    return { error: "Couldn't create the payment link. Please try again." };
  }
}

export async function cancelCharge(bookingId: string, chargeId: string) {
  const { organizationId } = await requirePermission("bookings");
  const charge = await prisma.bookingCharge.findFirst({ where: { id: chargeId, organizationId, bookingId } });
  if (!charge) notFound();
  if (charge.status === "PENDING") {
    await prisma.bookingCharge.update({ where: { id: chargeId }, data: { status: "CANCELLED" } });
  }
  revalidatePath(`/bookings/${bookingId}/edit`);
}

export async function markChargePaidManually(bookingId: string, chargeId: string) {
  const user = await requirePermission("bookings");
  const charge = await prisma.bookingCharge.findFirst({
    where: { id: chargeId, organizationId: user.organizationId, bookingId },
  });
  if (!charge) notFound();
  if (charge.status !== "PENDING") return;

  await prisma.$transaction([
    prisma.bookingCharge.update({
      where: { id: chargeId },
      data: { status: "PAID", paidVia: "manual", recordedByUserId: user.id, paidAt: new Date() },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { amountPaid: { increment: charge.amount } },
    }),
  ]);
  revalidatePath(`/bookings/${bookingId}/edit`);
  revalidatePath("/dashboard");
}
