import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getPublicOrgBySlug } from "@/lib/public-org";
import { PublicVehicleCard } from "@/components/public-vehicle-card";

export default async function StorefrontFleetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug);
  if (!org) notFound();

  const vehicles = await prisma.vehicle.findMany({
    where: { organizationId: org.id, status: { notIn: ["MAINTENANCE", "OUT_OF_SERVICE"] } },
    orderBy: { dailyRate: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-3xl font-bold text-ink">Our Fleet</h1>
      <p className="mt-2 text-slate-600">
        {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} available with {org.name}.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => (
          <PublicVehicleCard key={v.id} slug={org.slug} vehicle={v} />
        ))}
      </div>
      {vehicles.length === 0 && (
        <p className="mt-12 text-center text-ink-soft">
          No vehicles are listed yet — check back soon.
        </p>
      )}
    </div>
  );
}
