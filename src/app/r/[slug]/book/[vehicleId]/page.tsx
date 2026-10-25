import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { BookingForm } from "./booking-form";
import { formatCurrency } from "@/lib/format";

export default async function BookVehiclePage({
  params,
}: {
  params: Promise<{ slug: string; vehicleId: string }>;
}) {
  const { slug, vehicleId } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org) notFound();

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, organizationId: org.id },
  });
  if (!vehicle) notFound();

  const customer = await getCurrentCustomer();
  const signedInHere = customer?.organizationId === org.id;

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-bold text-slate-900">
        Reserve the {vehicle.year} {vehicle.make} {vehicle.model}
      </h1>
      <p className="mt-1 text-slate-600">{formatCurrency(vehicle.dailyRate)}/day</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        {signedInHere ? (
          <BookingForm
            slug={slug}
            vehicleId={vehicle.id}
            dailyRate={vehicle.dailyRate}
            reservationFee={org.reservationFeeAmount}
          />
        ) : (
          <div className="text-center">
            <p className="text-slate-600">
              Sign in or create an account to reserve this car.
            </p>
            <a
              href={`/r/${slug}/login?redirectTo=${encodeURIComponent(`/r/${slug}/book/${vehicle.id}`)}`}
              className="mt-4 inline-block rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Sign in to continue
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
