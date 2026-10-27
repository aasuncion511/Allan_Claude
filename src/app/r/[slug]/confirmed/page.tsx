import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { PaymentStatus } from "./payment-status";

export default async function BookingConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ vehicleId?: string }>;
}) {
  const { slug } = await params;
  const { vehicleId } = await searchParams;
  const org = await getPublicOrgBySlug(slug);
  if (!org) notFound();

  const customer = await getCurrentCustomer();
  const booking =
    customer && customer.organizationId === org.id && vehicleId
      ? await prisma.booking.findFirst({
          where: { customerId: customer.id, vehicleId, organizationId: org.id },
          orderBy: { createdAt: "desc" },
          include: { vehicle: true, corporateClient: true },
        })
      : null;

  const isCorporate = Boolean(booking?.corporateClient);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      {!booking ? (
        <>
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="text-2xl font-bold text-ink">Payment received!</h1>
          <p className="mt-2 text-slate-600">
            We&rsquo;re confirming your reservation with {org.name} now — you&rsquo;ll see it in your account once
            it&rsquo;s locked in.
          </p>
        </>
      ) : isCorporate ? (
        <>
          <div className="mb-4 text-5xl">🏢</div>
          <h1 className="text-2xl font-bold text-ink">Booking confirmed!</h1>
          <p className="mt-2 text-slate-600">
            {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model} is reserved for your dates and
            billed to {booking.corporateClient!.name}. No payment is needed now.
          </p>
        </>
      ) : (
        <PaymentStatus
          bookingId={booking.id}
          serverNowUtc={new Date().toISOString()}
          expiresAtUtc={(booking.holdExpiresAt ?? new Date()).toISOString()}
          vehicleLabel={`${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`}
          orgName={org.name}
        />
      )}

      <a
        href={`/r/${slug}/account`}
        className="mt-6 inline-block rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-ink hover:bg-slate-50"
      >
        View My Bookings
      </a>
    </div>
  );
}
