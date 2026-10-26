import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCurrency } from "@/lib/format";
import { ConvertHoldButton } from "./convert-hold-button";

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

  const isActiveHold = booking?.status === "HOLD" && booking.holdExpiresAt && booking.holdExpiresAt > new Date();
  const isCorporate = Boolean(booking?.corporateClient);
  const balance = booking ? Math.max(0, org.reservationFeeAmount - booking.amountPaid) : 0;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 text-5xl">{isActiveHold ? "⏳" : isCorporate ? "🏢" : "✅"}</div>
      <h1 className="text-2xl font-bold text-ink">
        {isActiveHold ? "Your car is held for 2 hours!" : isCorporate ? "Booking confirmed!" : "Payment received!"}
      </h1>

      {isActiveHold ? (
        <>
          <p className="mt-2 text-slate-600">
            {booking!.vehicle.year} {booking!.vehicle.make} {booking!.vehicle.model} is held until{" "}
            {booking!.holdExpiresAt!.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}. Confirm now
            to lock it in — your {formatCurrency(booking!.amountPaid)} hold fee is credited toward the total.
          </p>
          {balance > 0 ? (
            <ConvertHoldButton slug={slug} bookingId={booking!.id} balance={balance} />
          ) : (
            <p className="mt-2 text-sm text-brand">Your hold fee already covers the reservation fee — you&apos;re confirmed!</p>
          )}
        </>
      ) : isCorporate ? (
        <p className="mt-2 text-slate-600">
          {booking!.vehicle.year} {booking!.vehicle.make} {booking!.vehicle.model} is reserved for your dates and
          billed to {booking!.corporateClient!.name}. No payment is needed now.
        </p>
      ) : (
        <p className="mt-2 text-slate-600">
          We&rsquo;re confirming your reservation with {org.name} now — this usually takes just a few seconds.
          You&rsquo;ll see it in your account once it&rsquo;s locked in.
        </p>
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
