import { prisma } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/paymongo";
import { isVehicleAvailable } from "@/lib/availability";
import { upsertGhlContact, isGhlConfigured } from "@/lib/ghl";

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
    const metadata = session?.attributes?.metadata ?? {};

    const {
      vehicleId,
      customerId,
      startDate: startDateRaw,
      endDate: endDateRaw,
      dailyRate: dailyRateRaw,
      totalAmount: totalAmountRaw,
      reservationFee: reservationFeeRaw,
    } = metadata as Record<string, string>;

    if (vehicleId && customerId && startDateRaw && endDateRaw && checkoutId) {
      const existing = await prisma.booking.findFirst({
        where: { paymongoCheckoutId: checkoutId },
      });

      if (!existing) {
        const startDate = new Date(startDateRaw);
        const endDate = new Date(endDateRaw);
        const dailyRate = Number(dailyRateRaw ?? 0);
        const totalAmount = Number(totalAmountRaw ?? 0);
        const reservationFee = Number(reservationFeeRaw ?? org.reservationFeeAmount);

        // Best-effort re-check; in the rare case of a double-booked race, we
        // still honor the booking since payment has already been captured —
        // flag it for staff to resolve manually rather than silently drop it.
        const stillAvailable = await isVehicleAvailable(vehicleId, startDate, endDate);
        const now = new Date();

        await prisma.booking.create({
          data: {
            organizationId: org.id,
            vehicleId,
            customerId,
            startDate,
            endDate,
            status: startDate <= now && endDate >= now ? "ACTIVE" : "RESERVED",
            source: "ONLINE",
            dailyRate,
            totalAmount,
            amountPaid: reservationFee,
            paymentStatus: "PAID",
            paymongoCheckoutId: checkoutId,
            notes: stillAvailable
              ? null
              : "⚠ Booked online while another booking overlapped these dates — please review.",
          },
        });

        if (startDate <= now && endDate >= now) {
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
                tags: ["booked-online"],
              }
            );
          }
        }
      }
    }
  }

  return Response.json({ received: true });
}
