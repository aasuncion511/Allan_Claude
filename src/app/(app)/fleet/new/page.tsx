import { PageHeader } from "@/components/page-header";
import { VehicleForm } from "@/components/vehicle-form";
import { createVehicle } from "../actions";

export default function NewVehiclePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Unit" description="Register a new vehicle in your fleet" />
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <VehicleForm action={createVehicle} submitLabel="Add Unit" />
      </div>
    </div>
  );
}
