import { prisma } from "@/lib/db";

/**
 * Security deposit lifecycle — deliberately separate from the rental-payment
 * Refund model and from amountPaid. Neither function below ever touches
 * amountPaid: the deposit is held, not earned, so it must stay invisible to
 * Revenue (src/lib/metrics.ts sums amountPaid only) while still showing up
 * on the "Security Deposit on Hand" figure (sum of securityDeposit where
 * status === HELD). Routine operation — gated by "bookings", available to
 * both staff and owner, unlike the owner-only rental-payment refund.
 */

export type DepositCollectionMethod = "cash" | "included_in_payment";
export type DepositRefundMethod = "cash" | "gcash" | "bank_transfer";

export async function collectSecurityDeposit(params: {
  organizationId: string;
  bookingId: string;
  method: DepositCollectionMethod;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const booking = await prisma.booking.findFirst({
    where: { id: params.bookingId, organizationId: params.organizationId },
  });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.securityDepositStatus !== "NOT_COLLECTED") {
    return { ok: false, error: "This booking's deposit has already been collected." };
  }
  if (booking.securityDeposit <= 0) {
    return { ok: false, error: "No security deposit amount is set on this booking." };
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      securityDepositStatus: "HELD",
      securityDepositCollectedMethod: params.method,
      securityDepositCollectedAt: new Date(),
    },
  });

  return { ok: true };
}

export async function refundSecurityDeposit(params: {
  organizationId: string;
  bookingId: string;
  refundedByUserId: string;
  method: DepositRefundMethod;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const booking = await prisma.booking.findFirst({
    where: { id: params.bookingId, organizationId: params.organizationId },
  });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.securityDepositStatus !== "HELD") {
    return { ok: false, error: "This booking has no held security deposit to refund." };
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      securityDepositStatus: "REFUNDED",
      securityDepositRefundMethod: params.method,
      securityDepositRefundedAt: new Date(),
      securityDepositRefundedByUserId: params.refundedByUserId,
    },
  });

  return { ok: true };
}

/** Org-wide "Security Deposit on Hand" — held deposits, excluded from revenue. */
export async function getSecurityDepositOnHand(organizationId: string): Promise<number> {
  const result = await prisma.booking.aggregate({
    where: { organizationId, securityDepositStatus: "HELD" },
    _sum: { securityDeposit: true },
  });
  return result._sum.securityDeposit ?? 0;
}
