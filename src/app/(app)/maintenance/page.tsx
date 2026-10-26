import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function MaintenancePage() {
  const { organizationId } = await requirePermission("maintenance");
  const logs = await prisma.maintenanceLog.findMany({
    where: { organizationId },
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
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + Log Maintenance
          </Link>
        }
      />

      <h2 className="mb-3 text-lg font-semibold text-ink">
        Upcoming / Overdue
      </h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Last Service</th>
              <th className="px-4 py-3">Next Due Date</th>
              <th className="px-4 py-3">Next Due Odometer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {upcoming.map((l) => {
              const overdue = l.nextDueDate && l.nextDueDate < now;
              return (
                <tr key={l.id} className="hover:bg-canvas">
                  <td className="px-4 py-3">
                    <Link
                      href={`/fleet/${l.vehicle.id}`}
                      className="text-ink hover:text-brand-dark"
                    >
                      {l.vehicle.plateNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{l.type}</td>
                  <td
                    className={`px-4 py-3 font-medium ${overdue ? "text-danger-text" : "text-warning-text"}`}
                  >
                    {l.nextDueDate ? formatDate(l.nextDueDate) : "—"}
                    {overdue && " (overdue)"}
                  </td>
                  <td className="px-4 py-3 text-ink">
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
                  className="px-4 py-6 text-center text-ink-soft"
                >
                  Nothing due in the next 30 days.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-ink">
        Service History
      </h2>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Odometer</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${l.vehicle.id}`}
                    className="text-ink hover:text-brand-dark"
                  >
                    {l.vehicle.plateNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">{l.type}</td>
                <td className="px-4 py-3 text-ink">
                  {formatDate(l.date)}
                </td>
                <td className="px-4 py-3 text-ink">
                  {l.odometer ? `${l.odometer.toLocaleString()} km` : "—"}
                </td>
                <td className="px-4 py-3 text-ink">
                  {l.vendor ?? "—"}
                </td>
                <td className="px-4 py-3 text-danger-text">
                  {formatCurrency(l.cost)}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-ink-soft"
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
