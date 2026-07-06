import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/badge";
import { formatCurrency } from "@/lib/format";

export default async function FleetPage() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { plateNumber: "asc" },
  });

  const counts = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Fleet"
        description={`${vehicles.length} unit${vehicles.length === 1 ? "" : "s"} in your fleet`}
        actions={
          <Link
            href="/fleet/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            + Add Unit
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        {["AVAILABLE", "BOOKED", "RESERVED", "MAINTENANCE", "OUT_OF_SERVICE"].map(
          (status) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
            >
              <StatusBadge status={status} />
              <span className="text-sm font-semibold text-slate-200">
                {counts[status] ?? 0}
              </span>
            </div>
          )
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Plate No.</th>
              <th className="px-4 py-3">Daily Rate</th>
              <th className="px-4 py-3">Odometer</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {vehicles.map((v) => (
              <tr key={v.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${v.id}`}
                    className="font-medium text-slate-100 hover:text-emerald-400"
                  >
                    {v.year} {v.make} {v.model}
                  </Link>
                  {v.color && (
                    <span className="ml-2 text-xs text-slate-500">
                      {v.color}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300">{v.plateNumber}</td>
                <td className="px-4 py-3 text-slate-300">
                  {formatCurrency(v.dailyRate)}/day
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {v.odometer.toLocaleString()} km
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={v.status} />
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No units yet.{" "}
                  <Link href="/fleet/new" className="text-emerald-400">
                    Add your first unit
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
