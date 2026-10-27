import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { confirmHoldPayment, notifyReservationConfirmed } from "@/lib/holds";

/**
 * Per-organization PayMongo webhook endpoint. Each org registers its own
 * PayMongo webhook pointed at this exact URL (with its own id), since each
 * org uses its own PayMongo account — see Settings → Storefront.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await params;
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return new Response("Unknown organization", { status: 404 });
  if (!org.paymongoWebhookSecret) {
    return new Response("Webhook not configured for this organization", { status: 501 });
  }

  const signature = req.headers.get("paymongo-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const rawBody = await req.text();
  const valid = await verifyWebhookSignature(
    rawBody,
    signature,
    org.paymongoWebhookSecret,
    org.paymongoLiveMode
  );
  if (!valid) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(rawBody);
  const eventType: string | undefined = event?.data?.attributes?.type;

  if (eventType === "checkout_session.payment.paid") {
    const session = event.data.attributes.data;
    const checkoutId: string = session?.id;
    const metadata = (session?.attributes?.metadata ?? {}) as Record<string, string>;

    if (!checkoutId) return Response.json({ received: true });

    if (metadata.kind === "charge") {
      await handleCharge(org.id, checkoutId, metadata);
    } else if (metadata.kind === "reservation_v2") {
      // Confirms an EXISTING free hold (created well before checkout) —
      // never creates a booking from scratch. confirmHoldPayment is
      // idempotent via its `status !== "HOLD"` guard, so a duplicate/
      // out-of-order webhook for an already-confirmed booking is a safe
      // no-op (v2 handoff acceptance tests 14-15).
      const proto = req.headers.get("x-forwarded-proto") ?? "https";
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
      const { bookingId } = metadata;
      if (bookingId) {
        const result = await confirmHoldPayment(bookingId, checkoutId);
        if (result.confirmed) await notifyReservationConfirmed(bookingId, baseUrl);
      }
    }
    // Any other/unrecognized kind is ignored — nothing in this codebase
    // issues checkouts without a recognized kind in metadata.
  }

  return Response.json({ received: true });
}

async function handleCharge(organizationId: string, checkoutId: string, metadata: Record<string, string>) {
  const { chargeId } = metadata;
  if (!chargeId) return;

  const charge = await prisma.bookingCharge.findFirst({ where: { id: chargeId, organizationId } });
  if (!charge || charge.status !== "PENDING") return;

  await prisma.$transaction([
    prisma.bookingCharge.update({
      where: { id: charge.id },
      data: { status: "PAID", paidVia: "paymongo", paidAt: new Date(), paymongoCheckoutId: checkoutId },
    }),
    prisma.booking.update({
      where: { id: charge.bookingId },
      data: { amountPaid: { increment: charge.amount } },
    }),
  ]);
}
