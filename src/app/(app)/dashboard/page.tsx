import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/badge";
import { MonthlyChart } from "@/components/monthly-chart";
import { formatCurrency } from "@/lib/format";
import { getFleetSummary, filterByYear, sumRows, distinctYears } from "@/lib/metrics";

const STATUS_LIST = ["AVAILABLE", "BOOKED", "RESERVED", "MAINTENANCE", "OUT_OF_SERVICE"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const organizationId = await requireOrgId();
  const [{ overall, perVehicle }, vehicles] = await Promise.all([
    getFleetSummary(organizationId),
    prisma.vehicle.findMany({ where: { organizationId } }),
  ]);

  const years = distinctYears(overall);
  const selectedYear = yearParam ? Number(yearParam) : years[0] ?? new Date().getFullYear();

  const yearRows = filterByYear(overall, selectedYear);
  const yearTotals = sumRows(yearRows);
  const allTimeTotals = sumRows(overall);

  const statusCounts = vehicles.reduce<Record<string, number>>((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1;
    return acc;
  }, {});

  const perVehicleThisYear = perVehicle.map((v) => {
    const rows = filterByYear(v.monthly, selectedYear);
    const totals = sumRows(rows);
    return { ...v, yearTotals: totals };
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Fleet-wide performance overview"
        actions={
          <div className="flex gap-2">
            {years.map((y) => (
              <Link
                key={y}
                href={`/dashboard?year=${y}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  y === selectedYear
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={`${selectedYear} Revenue`}
          value={formatCurrency(yearTotals.revenue)}
          tone="positive"
        />
        <StatCard
          label={`${selectedYear} Expenses`}
          value={formatCurrency(yearTotals.expense)}
          tone="negative"
        />
        <StatCard
          label={`${selectedYear} Net Profit`}
          value={formatCurrency(yearTotals.profit)}
          tone={yearTotals.profit >= 0 ? "positive" : "negative"}
        />
        <StatCard label="Fleet Size" value={String(vehicles.length)} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-5">
        {STATUS_LIST.map((status) => (
          <div
            key={status}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4"
          >
            <StatusBadge status={status} />
            <span className="text-lg font-semibold text-slate-100">
              {statusCounts[status] ?? 0}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-8 rounded-xl border border-slate-800 bg-slate-950 p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Monthly Revenue vs. Expense — {selectedYear}
        </h2>
        {yearRows.length > 0 ? (
          <MonthlyChart data={yearRows} />
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">
            No financial activity recorded for {selectedYear} yet.
          </p>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-slate-100">
        Revenue &amp; Expense per Unit — {selectedYear}
      </h2>
      <div className="mb-8 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Plate No.</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">Expense</th>
              <th className="px-4 py-3">Net Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {perVehicleThisYear.map((v) => (
              <tr key={v.vehicleId} className="hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${v.vehicleId}`}
                    className="font-medium text-slate-100 hover:text-emerald-400"
                  >
                    {v.label}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-300">{v.plateNumber}</td>
                <td className="px-4 py-3 text-emerald-400">
                  {formatCurrency(v.yearTotals.revenue)}
                </td>
                <td className="px-4 py-3 text-red-400">
                  {formatCurrency(v.yearTotals.expense)}
                </td>
                <td
                  className={`px-4 py-3 font-medium ${v.yearTotals.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {formatCurrency(v.yearTotals.profit)}
                </td>
              </tr>
            ))}
            {perVehicleThisYear.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No units yet.
                </td>
              </tr>
            )}
          </tbody>
          {perVehicleThisYear.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-800 bg-slate-950 font-semibold">
                <td className="px-4 py-3 text-slate-200" colSpan={2}>
                  Grand Total ({selectedYear})
                </td>
                <td className="px-4 py-3 text-emerald-400">
                  {formatCurrency(yearTotals.revenue)}
                </td>
                <td className="px-4 py-3 text-red-400">
                  {formatCurrency(yearTotals.expense)}
                </td>
                <td
                  className={`px-4 py-3 ${yearTotals.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {formatCurrency(yearTotals.profit)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          All-Time Grand Total (Every Unit, Every Month)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Revenue</p>
            <p className="text-xl font-semibold text-emerald-400">
              {formatCurrency(allTimeTotals.revenue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Expenses</p>
            <p className="text-xl font-semibold text-red-400">
              {formatCurrency(allTimeTotals.expense)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Net Profit</p>
            <p
              className={`text-xl font-semibold ${allTimeTotals.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {formatCurrency(allTimeTotals.profit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
