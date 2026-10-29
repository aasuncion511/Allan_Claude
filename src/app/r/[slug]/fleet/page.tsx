import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { PublicVehicleCard } from "@/components/public-vehicle-card";
import { TripSearchBar } from "@/components/trip-search-bar";
import { isVehicleAvailable } from "@/lib/availability";
import { formatDate } from "@/lib/format";

export default async function StorefrontFleetPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const { slug } = await params;
  const { start, end } = await searchParams;
  const org = await getPublicOrgBySlug(slug);
  if (!org) notFound();

  const vehicles = await prisma.vehicle.findMany({
    where: { organizationId: org.id, status: { notIn: ["MAINTENANCE", "OUT_OF_SERVICE"] } },
    orderBy: { dailyRate: "asc" },
  });

  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const hasValidDates =
    startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate;

  let availableNow: typeof vehicles = [];
  let otherVehicles: typeof vehicles = vehicles;

  if (hasValidDates) {
    const checks = await Promise.all(
      vehicles.map((v) => isVehicleAvailable(v.id, startDate!, endDate!))
    );
    availableNow = vehicles.filter((_, i) => checks[i]);
    otherVehicles = vehicles.filter((_, i) => !checks[i]);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold text-ink">Our Fleet</h1>
      <p className="mt-2 text-slate-600">
        {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} available with {org.name}.
      </p>

      <div className="mt-6">
        <TripSearchBar slug={org.slug} defaultStart={start} defaultEnd={end} />
      </div>

      {hasValidDates ? (
        <>
          <h2 className="mb-1 mt-10 text-xl font-bold text-ink">
            Available for {formatDate(startDate!)} – {formatDate(endDate!)}
          </h2>
          <p className="mb-6 text-sm text-ink-soft">
            {availableNow.length} unit{availableNow.length === 1 ? "" : "s"} open for your dates.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {availableNow.map((v) => (
              <div key={v.id} className="relative">
                <span className="absolute left-3 top-3 z-10 rounded-full bg-success-surface px-2.5 py-1 text-xs font-semibold text-success-text">
                  Available for your dates
                </span>
                <PublicVehicleCard slug={org.slug} vehicle={v} />
              </div>
            ))}
          </div>
          {availableNow.length === 0 && (
            <p className="rounded-xl border border-warning-text/40 bg-warning-surface px-4 py-3 text-sm text-warning-text">
              Nothing is open for those exact dates — try adjusting them, or check the other units below.
            </p>
          )}

          {otherVehicles.length > 0 && (
            <>
              <h2 className="mb-1 mt-12 text-xl font-bold text-ink">Other Units (Different Dates)</h2>
              <p className="mb-6 text-sm text-ink-soft">Booked over part of your range — try different dates.</p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {otherVehicles.map((v) => (
                  <div key={v.id} className="relative opacity-70">
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-soft">
                      Other dates available
                    </span>
                    <PublicVehicleCard slug={org.slug} vehicle={v} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <PublicVehicleCard key={v.id} slug={org.slug} vehicle={v} />
          ))}
        </div>
      )}

      {vehicles.length === 0 && (
        <p className="mt-12 text-center text-ink-soft">
          No vehicles are listed yet — check back soon.
        </p>
      )}
    </div>
  );
}
