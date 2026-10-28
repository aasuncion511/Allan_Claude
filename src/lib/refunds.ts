import { prisma } from "@/lib/db";
import { getCheckoutSession, createRefund, pesosToCentavos, type RefundReason } from "@/lib/paymongo";
import { formatCurrency } from "@/lib/format";
import { syncVehicleStatus } from "@/lib/vehicle-status";

/**
 * The deliberate exception path to the v2 handoff's published non-refundable
 * reservation policy ("except where legally required or where the merchant
 * cannot supply the promised vehicle/service — admins must retain an
 * exceptional/refund resolution path"). Gated by the "refunds" permission,
 * separate from general "bookings" access, since this moves real money
 * against a disclosed policy and needs its own audit trail (the Refund
 * model's required `notes` field).
 */
export async function requestRefund(params: {
  organizationId: string;
  bookingId: string;
  requestedByUserId: string;
  amount: number;
  paymongoReason: RefundReason;
  notes: string;
}): Promise<{ ok: true; refundId: string } | { ok: false; error: string }> {
  if (!params.notes.trim()) {
    return { ok: false, error: "A justification is required — this is an exception to the published non-refundable policy." };
  }

  const org = await prisma.organization.findUnique({ where: { id: params.organizationId } });
  const booking = await prisma.booking.findFirst({
    where: { id: params.bookingId, organizationId: params.organizationId },
  });
  if (!org || !booking) return { ok: false, error: "Booking not found." };
  if (!org.paymongoSecretKey) return { ok: false, error: "PayMongo isn't configured for this organization." };
  if (!booking.paymongoCheckoutId) return { ok: false, error: "This booking has no online payment to refund." };

  // booking.amountPaid is net of any prior refunds already (see below) — the
  // refundable cap is simply what's currently recorded as collected.
  const refundable = booking.amountPaid;

  if (!Number.isFinite(params.amount) || params.amount <= 0 || params.amount > refundable) {
    return {
      ok: false,
      error: `Refund amount must be between ₱0.01 and the refundable balance (${formatCurrency(refundable)}).`,
    };
  }

  const refund = await prisma.refund.create({
    data: {
      organizationId: org.id,
      bookingId: booking.id,
      amount: params.amount,
      paymongoReason: params.paymongoReason,
      notes: params.notes.trim(),
      status: "PENDING",
      requestedByUserId: params.requestedByUserId,
    },
  });

  try {
    const checkout = await getCheckoutSession(org.paymongoSecretKey, booking.paymongoCheckoutId);
    if (!checkout.paymentId) {
      throw new Error("No completed payment was found on this booking's PayMongo checkout session.");
    }

    const result = await createRefund(org.paymongoSecretKey, {
      paymentId: checkout.paymentId,
      amountCentavos: pesosToCentavos(params.amount),
      reason: params.paymongoReason,
      notes: params.notes.trim(),
    });

    const failed = result.status === "failed";
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: failed ? "FAILED" : "SUCCEEDED",
        paymongoRefundId: result.id,
        processedAt: new Date(),
        error: failed ? "PayMongo reported the refund as failed." : null,
      },
    });

    if (!failed) {
      // Net the refund out of amountPaid so Revenue, the Bookings list, and
      // Collections all keep reflecting actual cash currently held — none
      // of them should keep counting money that's since been returned.
      const isFullRefund = booking.amountPaid - params.amount <= 0.01;
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          amountPaid: { decrement: params.amount },
          ...(isFullRefund
            ? // Fully refunded (policy violation / can't supply the vehicle) —
              // this booking isn't happening, so release the hold on the
              // vehicle's calendar rather than leaving it falsely reserved
              // against money that's no longer held.
              { paymentStatus: "REFUNDED", status: "CANCELLED", holdExpiresAt: null }
            : {}),
        },
      });
      if (isFullRefund) {
        await syncVehicleStatus(org.id, booking.vehicleId, "CANCELLED");
      }
    }

    return failed
      ? { ok: false, error: "PayMongo reported the refund as failed. See the refund log for details." }
      : { ok: true, refundId: refund.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error contacting PayMongo.";
    await prisma.refund.update({ where: { id: refund.id }, data: { status: "FAILED", error: message } });
    return { ok: false, error: message };
  }
}
