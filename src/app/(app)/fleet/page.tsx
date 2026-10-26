import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/badge";
import { formatCurrency } from "@/lib/format";

export default async function FleetPage() {
  const { organizationId } = await requirePermission("fleet");
  const vehicles = await prisma.vehicle.findMany({
    where: { organizationId },
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
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
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
              className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2"
            >
              <StatusBadge status={status} />
              <span className="text-sm font-semibold text-ink">
                {counts[status] ?? 0}
              </span>
            </div>
          )
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Plate No.</th>
              <th className="px-4 py-3">Daily Rate</th>
              <th className="px-4 py-3">Odometer</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {vehicles.map((v) => (
              <tr key={v.id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${v.id}`}
                    className="font-medium text-ink hover:text-brand-dark"
                  >
                    {v.year} {v.make} {v.model}
                  </Link>
                  {v.color && (
                    <span className="ml-2 text-xs text-ink-soft">
                      {v.color}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink">{v.plateNumber}</td>
                <td className="px-4 py-3 text-ink">
                  {formatCurrency(v.dailyRate)}/day
                </td>
                <td className="px-4 py-3 text-ink">
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
                  className="px-4 py-10 text-center text-ink-soft"
                >
                  No units yet.{" "}
                  <Link href="/fleet/new" className="text-brand">
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
