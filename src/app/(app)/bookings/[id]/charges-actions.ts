"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { createCheckoutSession, pesosToCentavos } from "@/lib/paymongo";
import { getBaseUrl } from "@/lib/url";
import { composeChargeDescription } from "@/lib/charge-reasons";
import { upsertGhlContact, sendGhlEmail, sendGhlSms, isGhlConfigured } from "@/lib/ghl";
import { formatCurrency } from "@/lib/format";

function readReasonAndDetail(formData: FormData): { description: string } | { error: string } {
  const reason = String(formData.get("reason") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim();
  if (!reason) return { error: "Please choose what this charge is for." };
  if (reason === "other" && !detail) return { error: "Please describe what \"Other\" covers." };
  return { description: composeChargeDescription(reason, detail) };
}

export type CreateChargeState = { error?: string; checkoutUrl?: string; chargeId?: string } | undefined;

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

  const parsed = readReasonAndDetail(formData);
  if ("error" in parsed) return parsed;
  const { description } = parsed;

  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Please enter a valid amount." };

  if (!booking.organization.paymongoSecretKey) {
    return {
      error:
        "Online payment isn't set up for this organization yet (Settings → Storefront). Use \"Record Cash Payment\" below instead.",
    };
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
      data: { paymongoCheckoutId: session.id, paymongoCheckoutUrl: session.checkoutUrl },
    });
    revalidatePath(`/bookings/${bookingId}/edit`);
    return { checkoutUrl: session.checkoutUrl, chargeId: charge.id };
  } catch {
    await prisma.bookingCharge.update({ where: { id: charge.id }, data: { status: "CANCELLED" } });
    return { error: "Couldn't create the payment link. Please try again." };
  }
}

export type RecordCashState = { error?: string; success?: boolean } | undefined;

/** Staff record a cash (or any other offline) payment directly — no PayMongo
 *  involved at all, so this works even when online payment isn't configured. */
export async function recordCashPayment(
  bookingId: string,
  _prevState: RecordCashState,
  formData: FormData
): Promise<RecordCashState> {
  const user = await requirePermission("bookings");

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, organizationId: user.organizationId },
  });
  if (!booking) notFound();

  const parsed = readReasonAndDetail(formData);
  if ("error" in parsed) return parsed;
  const { description } = parsed;

  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Please enter a valid amount." };

  await prisma.$transaction([
    prisma.bookingCharge.create({
      data: {
        organizationId: user.organizationId,
        bookingId,
        description,
        amount,
        status: "PAID",
        paidVia: "manual",
        recordedByUserId: user.id,
        paidAt: new Date(),
      },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { amountPaid: { increment: amount } },
    }),
  ]);

  revalidatePath(`/bookings/${bookingId}/edit`);
  revalidatePath("/dashboard");
  return { success: true };
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

export type SendLinkState = { error?: string; success?: boolean } | undefined;

async function loadChargeForSend(organizationId: string, bookingId: string, chargeId: string) {
  const charge = await prisma.bookingCharge.findFirst({
    where: { id: chargeId, organizationId, bookingId, status: "PENDING" },
  });
  if (!charge || !charge.paymongoCheckoutUrl) return null;
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, organizationId },
    include: { customer: true, organization: true, vehicle: true },
  });
  if (!booking) return null;
  return { charge, booking };
}

/** Emails the customer the already-created payment link for a pending charge,
 *  via the org's own GHL location — same channel as the booking confirmation. */
export async function sendChargeLinkEmail(
  bookingId: string,
  chargeId: string,
  _prevState: SendLinkState,
  _formData: FormData
): Promise<SendLinkState> {
  const { organizationId } = await requirePermission("bookings");
  const loaded = await loadChargeForSend(organizationId, bookingId, chargeId);
  if (!loaded) return { error: "This charge no longer has an active payment link." };
  const { charge, booking } = loaded;

  if (!booking.customer.email) return { error: "This customer has no email address on file." };
  if (!isGhlConfigured(booking.organization)) {
    return { error: "GoHighLevel isn't connected — add a Location ID and API key in Settings → Storefront." };
  }

  const ghlConfig = { locationId: booking.organization.ghlLocationId!, apiToken: booking.organization.ghlApiToken! };
  const contactId = await upsertGhlContact(ghlConfig, {
    name: booking.customer.name,
    email: booking.customer.email,
    phone: booking.customer.phone ?? undefined,
    source: "Fleet Manager balance payment",
  });
  if (!contactId) return { error: "Could not sync/find the customer as a GHL contact." };

  const html = `
    <p>Hi ${booking.customer.name},</p>
    <p>Here's your payment link for the ${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model} rental:</p>
    <p><strong>${charge.description}</strong> — ${formatCurrency(charge.amount)}</p>
    <p><a href="${charge.paymongoCheckoutUrl}" style="display:inline-block;padding:10px 20px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">Pay now</a></p>
    <p>Or copy this link: ${charge.paymongoCheckoutUrl}</p>
    <p>— ${booking.organization.name}</p>
  `;

  const result = await sendGhlEmail(ghlConfig, {
    contactId,
    subject: `Payment request — ${charge.description} (${formatCurrency(charge.amount)})`,
    html,
  });
  return result.ok ? { success: true } : { error: result.error };
}

/** Texts the customer the payment link for a pending charge, via GHL SMS
 *  (same channel as the automated pickup/return reminders). */
export async function sendChargeLinkSms(
  bookingId: string,
  chargeId: string,
  _prevState: SendLinkState,
  _formData: FormData
): Promise<SendLinkState> {
  const { organizationId } = await requirePermission("bookings");
  const loaded = await loadChargeForSend(organizationId, bookingId, chargeId);
  if (!loaded) return { error: "This charge no longer has an active payment link." };
  const { charge, booking } = loaded;

  if (!booking.customer.phone) return { error: "This customer has no phone number on file." };
  if (!isGhlConfigured(booking.organization)) {
    return { error: "GoHighLevel isn't connected — add a Location ID and API key in Settings → Storefront." };
  }

  const ghlConfig = { locationId: booking.organization.ghlLocationId!, apiToken: booking.organization.ghlApiToken! };
  const contactId = await upsertGhlContact(ghlConfig, {
    name: booking.customer.name,
    email: booking.customer.email ?? "",
    phone: booking.customer.phone,
    source: "Fleet Manager balance payment",
  });
  if (!contactId) return { error: "Could not sync/find the customer as a GHL contact." };

  const message = `${booking.organization.name}: ${charge.description} — ${formatCurrency(charge.amount)}. Pay here: ${charge.paymongoCheckoutUrl}`;
  const result = await sendGhlSms(ghlConfig, { contactId, message });
  return result.ok ? { success: true } : { error: result.error };
}
