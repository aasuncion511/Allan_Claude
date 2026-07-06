import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { createFuelLog } from "../actions";

export default async function NewFuelLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organizationId = await requireOrgId();
  const vehicle = await prisma.vehicle.findFirst({ where: { id, organizationId } });
  if (!vehicle) notFound();

  const action = createFuelLog.bind(null, vehicle.id);
  const field =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-500";
  const label = "mb-1 block text-sm font-medium text-slate-300";

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Log Fuel"
        description={`${vehicle.plateNumber} — ${vehicle.make} ${vehicle.model}`}
      />
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        <form action={action} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Date</label>
              <input
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={field}
              />
            </div>
            <div>
              <label className={label}>Odometer (km)</label>
              <input
                name="odometer"
                type="number"
                defaultValue={vehicle.odometer}
                className={field}
              />
            </div>
            <div>
              <label className={label}>Liters</label>
              <input
                name="liters"
                type="number"
                step="0.01"
                required
                className={field}
              />
            </div>
            <div>
              <label className={label}>Cost (₱)</label>
              <input
                name="cost"
                type="number"
                step="0.01"
                required
                className={field}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              name="fullTank"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-slate-700 bg-slate-800"
            />
            Full tank (needed for accurate consumption calculation)
          </label>
          <div>
            <label className={label}>Notes</label>
            <textarea name="notes" rows={2} className={field} />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Log Fuel
          </button>
        </form>
      </div>
    </div>
  );
}
