import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { MaintenanceForm } from "@/components/maintenance-form";
import { createMaintenanceLog } from "../actions";

export default async function NewMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string }>;
}) {
  const { vehicleId } = await searchParams;
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { plateNumber: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Log Maintenance"
        description="Record a service event and its next due date"
      />
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-400">Add a unit first.</p>
        ) : (
          <MaintenanceForm
            action={createMaintenanceLog}
            vehicles={vehicles}
            defaultVehicleId={vehicleId}
          />
        )}
      </div>
    </div>
  );
}
