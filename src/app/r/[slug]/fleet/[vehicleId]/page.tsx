import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { formatCurrency } from "@/lib/format";
import { StatusBadge } from "@/components/badge";

export default async function VehicleDetailPage({
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

  const isBookable = vehicle.status !== "MAINTENANCE" && vehicle.status !== "OUT_OF_SERVICE";

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
          {vehicle.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vehicle.photoUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-7xl">
              🚗
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {[vehicle.category, vehicle.seats ? `${vehicle.seats} Seater` : null, vehicle.transmission, vehicle.color]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-4 text-3xl font-bold text-emerald-700">
            {formatCurrency(vehicle.dailyRate)}
            <span className="text-base font-normal text-slate-500">/day</span>
          </p>
          {vehicle.description && (
            <p className="mt-4 text-slate-600">{vehicle.description}</p>
          )}
          <div className="mt-6">
            {isBookable ? (
              <a
                href={`/r/${org.slug}/book/${vehicle.id}`}
                className="inline-block rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-500"
              >
                Reserve This Car
              </a>
            ) : (
              <StatusBadge status={vehicle.status} />
            )}
          </div>
          {org.reservationFeeAmount > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              A {formatCurrency(org.reservationFeeAmount)} reservation fee
              confirms your booking instantly online.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
