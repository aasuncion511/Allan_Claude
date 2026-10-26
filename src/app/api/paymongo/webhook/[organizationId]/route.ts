import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { isVehicleAvailable } from "@/lib/availability";
import { upsertGhlContact, isGhlConfigured } from "@/lib/ghl";
import { HOLD_WINDOW_MS } from "@/lib/hold";

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
    const kind =
      metadata.kind === "hold" || metadata.kind === "convert" || metadata.kind === "charge"
        ? metadata.kind
        : "reservation";

    if (!checkoutId) return Response.json({ received: true });

    if (kind === "charge") {
      await handleCharge(org.id, checkoutId, metadata);
      return Response.json({ received: true });
    }

    const alreadyHandled = await prisma.booking.findFirst({ where: { paymongoCheckoutId: checkoutId } });
    if (alreadyHandled) return Response.json({ received: true });

    if (kind === "convert") {
      await handleConvert(org.id, checkoutId, metadata);
    } else {
      await handleNewBooking(org, checkoutId, kind, metadata);
    }
  }

  return Response.json({ received: true });
}

async function handleNewBooking(
  org: { id: string; reservationFeeAmount: number; holdFeeAmount: number; ghlLocationId: string | null; ghlApiToken: string | null },
  checkoutId: string,
  kind: "reservation" | "hold",
  metadata: Record<string, string>
) {
  const {
    vehicleId,
    customerId,
    startDate: startDateRaw,
    endDate: endDateRaw,
    dailyRate: dailyRateRaw,
    totalAmount: totalAmountRaw,
    amountPaid: amountPaidRaw,
  } = metadata;

  if (!vehicleId || !customerId || !startDateRaw || !endDateRaw) return;

  const startDate = new Date(startDateRaw);
  const endDate = new Date(endDateRaw);
  const dailyRate = Number(dailyRateRaw ?? 0);
  const totalAmount = Number(totalAmountRaw ?? 0);
  const amountPaid = Number(amountPaidRaw ?? (kind === "hold" ? org.holdFeeAmount : org.reservationFeeAmount));

  // Best-effort re-check; in the rare case of a double-booked race, we still
  // honor the booking since payment has already been captured — flag it for
  // staff to resolve manually rather than silently drop it.
  const stillAvailable = await isVehicleAvailable(vehicleId, startDate, endDate);
  const now = new Date();
  const isHold = kind === "hold";

  await prisma.booking.create({
    data: {
      organizationId: org.id,
      vehicleId,
      customerId,
      startDate,
      endDate,
      status: isHold ? "HOLD" : startDate <= now && endDate >= now ? "ACTIVE" : "RESERVED",
      holdExpiresAt: isHold ? new Date(now.getTime() + HOLD_WINDOW_MS) : null,
      source: "ONLINE",
      dailyRate,
      totalAmount,
      amountPaid,
      paymentStatus: "PAID",
      paymongoCheckoutId: checkoutId,
      notes: stillAvailable
        ? null
        : "⚠ Booked online while another booking/hold overlapped these dates — please review.",
    },
  });

  if (!isHold && startDate <= now && endDate >= now) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (vehicle && vehicle.status !== "MAINTENANCE" && vehicle.status !== "OUT_OF_SERVICE") {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { status: "BOOKED" } });
    }
  }

  if (isGhlConfigured(org)) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (customer) {
      await upsertGhlContact(
        { locationId: org.ghlLocationId!, apiToken: org.ghlApiToken! },
        {
          name: customer.name,
          email: customer.email ?? "",
          phone: customer.phone,
          tags: [isHold ? "hold-created" : "booked-online"],
        }
      );
    }
  }
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

async function handleConvert(organizationId: string, checkoutId: string, metadata: Record<string, string>) {
  const { bookingId, amountPaid: amountPaidRaw } = metadata;
  if (!bookingId) return;

  const booking = await prisma.booking.findFirst({ where: { id: bookingId, organizationId } });
  if (!booking || booking.status !== "HOLD") return;

  const now = new Date();
  const additionalPaid = Number(amountPaidRaw ?? 0);

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: booking.startDate <= now && booking.endDate >= now ? "ACTIVE" : "RESERVED",
      holdExpiresAt: null,
      amountPaid: booking.amountPaid + additionalPaid,
      paymongoCheckoutId: checkoutId,
    },
  });

  if (booking.startDate <= now && booking.endDate >= now) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: booking.vehicleId } });
    if (vehicle && vehicle.status !== "MAINTENANCE" && vehicle.status !== "OUT_OF_SERVICE") {
      await prisma.vehicle.update({ where: { id: booking.vehicleId }, data: { status: "BOOKED" } });
    }
  }
}
