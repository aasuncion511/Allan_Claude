import { prisma } from "@/lib/db";
import { isCronAuthorized } from "@/lib/cron-auth";
import { expireCheckoutSession } from "@/lib/paymongo";
import { confirmHoldPayment, notifyReservationConfirmed } from "@/lib/holds";

/**
 * Background sweep for expired free holds — the v2 handoff's "database-
 * level expiry/scheduled worker processes holds even when all browser
 * windows are closed" requirement. Lazy-expiry checks in
 * src/lib/availability.ts and src/lib/holds.ts already stop an expired
 * hold from blocking NEW attempts even if this never ran, but this is what
 * actually calls PayMongo's Expire API and reconciles payment state —
 * neither of which the lazy checks can do. Call this every 1-2 minutes
 * from an external scheduler. See src/lib/cron-auth.ts for authentication.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  const now = new Date();

  // Pass 1: holds whose timer just ran out, not yet flagged for reconciliation.
  const freshlyExpired = await prisma.booking.findMany({
    where: { status: "HOLD", holdExpiresAt: { lte: now }, paymentStatus: { not: "PENDING" } },
    include: { organization: true },
  });

  // Pass 2: previously-flagged holds (PayMongo earlier refused to expire,
  // or we couldn't reach PayMongo) — re-check whether they've resolved.
  const pendingReconciliation = await prisma.booking.findMany({
    where: { status: "HOLD", paymentStatus: "PENDING" },
    include: { organization: true },
  });

  const results = [];
  for (const hold of [...freshlyExpired, ...pendingReconciliation]) {
    results.push(await resolveHold(hold, baseUrl));
  }

  return Response.json({
    ranAt: now.toISOString(),
    freshlyExpired: freshlyExpired.length,
    pendingReconciliation: pendingReconciliation.length,
    results,
  });
}

function appendNote(existing: string | null, note: string): string {
  return existing ? `${existing}\n${note}` : note;
}

async function resolveHold(
  hold: Awaited<ReturnType<typeof prisma.booking.findMany<{ include: { organization: true } }>>>[number],
  baseUrl: string
) {
  const org = hold.organization;

  // No checkout was ever started, or PayMongo isn't even configured — safe to release outright.
  if (!hold.paymongoCheckoutId || !org.paymongoSecretKey) {
    await prisma.booking.update({
      where: { id: hold.id },
      data: { status: "CANCELLED", notes: appendNote(hold.notes, "Free hold expired without payment.") },
    });
    return { bookingId: hold.id, outcome: "released_no_checkout" };
  }

  try {
    const result = await expireCheckoutSession(org.paymongoSecretKey, hold.paymongoCheckoutId);

    if (result.expired) {
      await prisma.booking.update({
        where: { id: hold.id },
        data: {
          status: "CANCELLED",
          checkoutExpiredAt: new Date(),
          notes: appendNote(hold.notes, "Free hold expired; PayMongo confirmed the checkout session expired unpaid."),
        },
      });
      return { bookingId: hold.id, outcome: "released_checkout_expired" };
    }

    if (result.paymentState === "paid") {
      // Payment actually succeeded (e.g. landed right as the timer hit
      // zero) — confirm it here even if the webhook never arrives.
      const confirmed = await confirmHoldPayment(hold.id, hold.paymongoCheckoutId, org.id);
      if (confirmed.confirmed) await notifyReservationConfirmed(hold.id, baseUrl);
      return { bookingId: hold.id, outcome: "confirmed_via_reconciliation" };
    }

    // pending/processing — PayMongo refused to expire. NEVER release
    // inventory here; keep the safe PAYMENT_RESOLUTION_PENDING state and
    // let the next sweep re-check.
    await prisma.booking.update({
      where: { id: hold.id },
      data: {
        paymentStatus: "PENDING",
        notes: appendNote(
          hold.notes,
          `Hold timer expired but PayMongo reports payment "${result.paymentState}" — held for reconciliation, not released.`
        ),
      },
    });
    return { bookingId: hold.id, outcome: "payment_resolution_pending", paymentState: result.paymentState };
  } catch (err) {
    // Network/API failure — be conservative: never release on an
    // ambiguous outcome. Flag for admin and retry on the next sweep.
    await prisma.booking.update({
      where: { id: hold.id },
      data: {
        paymentStatus: "PENDING",
        notes: appendNote(
          hold.notes,
          `Could not reach PayMongo to resolve this hold (${
            err instanceof Error ? err.message : "unknown error"
          }) — held for reconciliation, not released.`
        ),
      },
    });
    return { bookingId: hold.id, outcome: "reconciliation_error" };
  }
}
