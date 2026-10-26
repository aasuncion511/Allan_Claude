import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { getBlockedRanges } from "@/lib/availability";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { formatCurrency } from "@/lib/format";
import { StatusBadge } from "@/components/badge";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import { BookingWidget } from "./booking-widget";

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
  const blockedRanges = await getBlockedRanges(vehicleId);

  const customer = await getCurrentCustomer();
  const initialCustomer =
    customer && customer.organizationId === org.id
      ? { name: customer.name, email: customer.email ?? "", phone: customer.phone, address: customer.address ?? "" }
      : null;

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
                href="#book"
                className="inline-block rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-500"
              >
                Book This Car
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

      {isBookable && (
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Availability</h2>
            <AvailabilityCalendar blockedRanges={blockedRanges} />
          </div>
          <BookingWidget
            slug={slug}
            vehicleId={vehicle.id}
            dailyRate={vehicle.dailyRate}
            reservationFeeAmount={org.reservationFeeAmount}
            holdFeeAmount={org.holdFeeAmount}
            contactPhone={org.contactPhone}
            requirementsText={org.requirementsText}
            initialCustomer={initialCustomer}
          />
        </div>
      )}

      {org.requirementsText && (
        <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Rental Requirements</h2>
          <p className="whitespace-pre-line text-sm text-slate-600">{org.requirementsText}</p>
        </div>
      )}
    </div>
  );
}
