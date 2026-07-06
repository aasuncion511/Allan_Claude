import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function MaintenancePage() {
  const logs = await prisma.maintenanceLog.findMany({
    include: { vehicle: true },
    orderBy: { date: "desc" },
  });

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86_400_000);
  const upcoming = logs
    .filter((l) => l.nextDueDate && l.nextDueDate <= in30Days)
    .sort((a, b) => (a.nextDueDate! < b.nextDueDate! ? -1 : 1));

  return (
    <div>
      <PageHeader
        title="Maintenance"
        description="Service history and upcoming due dates across the fleet"
        actions={
          <Link
            href="/maintenance/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            + Log Maintenance
          </Link>
        }
      />

      <h2 className="mb-3 text-lg font-semibold text-slate-100">
        Upcoming / Overdue
      </h2>
      <div className="mb-8 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Last Service</th>
              <th className="px-4 py-3">Next Due Date</th>
              <th className="px-4 py-3">Next Due Odometer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {upcoming.map((l) => {
              const overdue = l.nextDueDate && l.nextDueDate < now;
              return (
                <tr key={l.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/fleet/${l.vehicle.id}`}
                      className="text-slate-100 hover:text-emerald-400"
                    >
                      {l.vehicle.plateNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{l.type}</td>
                  <td
                    className={`px-4 py-3 font-medium ${overdue ? "text-red-400" : "text-amber-400"}`}
                  >
                    {l.nextDueDate ? formatDate(l.nextDueDate) : "—"}
                    {overdue && " (overdue)"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {l.nextDueOdometer
                      ? `${l.nextDueOdometer.toLocaleString()} km`
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {upcoming.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Nothing due in the next 30 days.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-slate-100">
        Service History
      </h2>
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Odometer</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${l.vehicle.id}`}
                    className="text-slate-100 hover:text-emerald-400"
                  >
                    {l.vehicle.plateNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-300">{l.type}</td>
                <td className="px-4 py-3 text-slate-300">
                  {formatDate(l.date)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {l.odometer ? `${l.odometer.toLocaleString()} km` : "—"}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {l.vendor ?? "—"}
                </td>
                <td className="px-4 py-3 text-red-400">
                  {formatCurrency(l.cost)}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No maintenance logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
