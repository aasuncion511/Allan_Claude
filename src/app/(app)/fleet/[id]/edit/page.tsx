import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { VehicleForm } from "@/components/vehicle-form";
import { updateVehicle } from "../../actions";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organizationId = await requireOrgId();
  const vehicle = await prisma.vehicle.findFirst({ where: { id, organizationId } });
  if (!vehicle) notFound();

  const action = updateVehicle.bind(null, vehicle.id);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={`Edit ${vehicle.make} ${vehicle.model}`}
        description={vehicle.plateNumber}
      />
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <VehicleForm action={action} defaults={vehicle} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
