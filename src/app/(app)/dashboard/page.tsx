import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/badge";
import { MonthlyChart } from "@/components/monthly-chart";
import { formatCurrency, formatDate } from "@/lib/format";
import { getFleetSummary, filterByYear, sumRows, distinctYears } from "@/lib/metrics";

const STATUS_LIST = ["AVAILABLE", "BOOKED", "RESERVED", "MAINTENANCE", "OUT_OF_SERVICE"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const { organizationId } = await requirePermission("dashboard");
  const now = new Date();
  const [{ overall, perVehicle }, vehicles, collectionsBookings, pendingCharges, corporateBookings] =
    await Promise.all([
      getFleetSummary(organizationId),
      prisma.vehicle.findMany({ where: { organizationId } }),
      // Balance still owed on a booking that's already past pick-up — not a
      // freshly reserved booking still waiting for its pick-up date.
      prisma.booking.findMany({
        where: {
          organizationId,
          corporateClientId: null,
          status: { notIn: ["CANCELLED", "HOLD"] },
          startDate: { lte: now },
        },
        include: { vehicle: true, customer: true },
        orderBy: { startDate: "asc" },
      }),
      prisma.bookingCharge.findMany({
        where: { organizationId, status: "PENDING" },
        include: { booking: { include: { vehicle: true, customer: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.booking.findMany({
        where: { organizationId, corporateClientId: { not: null }, status: { not: "CANCELLED" } },
        include: { vehicle: true, customer: true, corporateClient: true },
        orderBy: { startDate: "desc" },
      }),
    ]);

  const withBalance = collectionsBookings
    .map((b) => ({ booking: b, balance: b.totalAmount - b.amountPaid }))
    .filter((b) => b.balance > 0.01);
  const collectionsTotal =
    withBalance.reduce((sum, b) => sum + b.balance, 0) + pendingCharges.reduce((sum, c) => sum + c.amount, 0);
  const collectionsCount = withBalance.length + pendingCharges.length;
  const corporateOutstanding = corporateBookings.reduce((sum, b) => sum + (b.totalAmount - b.amountPaid), 0);

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
                    ? "bg-brand text-white"
                    : "border border-line text-ink hover:bg-canvas"
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
          tone="lead"
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
            className="flex items-center justify-between rounded-xl border border-line bg-surface p-4"
          >
            <StatusBadge status={status} />
            <span className="text-lg font-semibold text-ink">
              {statusCounts[status] ?? 0}
            </span>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-warning-text/40 bg-warning-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning-text">For Collections</p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatCurrency(collectionsTotal)}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {collectionsCount} item{collectionsCount === 1 ? "" : "s"} past pick-up with a balance or charge still
            due — not simply-reserved bookings waiting for pick-up day
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Corporate — Invoiced</p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatCurrency(corporateOutstanding)}</p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {corporateBookings.length} booking{corporateBookings.length === 1 ? "" : "s"} billed to accredited
            companies, not collected through the app
          </p>
        </div>
      </div>

      {(withBalance.length > 0 || pendingCharges.length > 0) && (
        <div className="mb-8 overflow-x-auto rounded-xl border border-warning-text/40 bg-warning-surface">
          <div className="border-b border-warning-text/40 px-4 py-3">
            <p className="text-sm font-semibold text-warning-text">For Collections — balance or charge due now</p>
          </div>
          <table className="w-full min-w-[640px] text-left text-sm">
            <tbody className="divide-y divide-warning-text/20">
              {withBalance.map(({ booking, balance }) => (
                <tr key={booking.id}>
                  <td className="px-4 py-3 text-ink">{booking.customer.name}</td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.model}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">Balance due since {formatDate(booking.startDate)}</td>
                  <td className="px-4 py-3 text-warning-text">{formatCurrency(balance)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/bookings/${booking.id}/edit`} className="text-xs font-medium text-brand hover:underline">
                      Collect
                    </Link>
                  </td>
                </tr>
              ))}
              {pendingCharges.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-ink">{c.booking.customer.name}</td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {c.booking.vehicle.year} {c.booking.vehicle.make} {c.booking.vehicle.model}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">{c.description}</td>
                  <td className="px-4 py-3 text-warning-text">{formatCurrency(c.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/bookings/${c.bookingId}/edit`} className="text-xs font-medium text-brand hover:underline">
                      Collect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-8 rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Monthly Revenue vs. Expense — {selectedYear}
        </h2>
        {yearRows.length > 0 ? (
          <MonthlyChart data={yearRows} />
        ) : (
          <p className="py-10 text-center text-sm text-ink-soft">
            No financial activity recorded for {selectedYear} yet.
          </p>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-ink">
        Revenue &amp; Expense per Unit — {selectedYear}
      </h2>
      <div className="mb-8 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Plate No.</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">Expense</th>
              <th className="px-4 py-3">Net Profit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {perVehicleThisYear.map((v) => (
              <tr key={v.vehicleId} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${v.vehicleId}`}
                    className="font-medium text-ink hover:text-brand-dark"
                  >
                    {v.label}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">{v.plateNumber}</td>
                <td className="px-4 py-3 text-brand">
                  {formatCurrency(v.yearTotals.revenue)}
                </td>
                <td className="px-4 py-3 text-danger-text">
                  {formatCurrency(v.yearTotals.expense)}
                </td>
                <td
                  className={`px-4 py-3 font-medium ${v.yearTotals.profit >= 0 ? "text-brand" : "text-danger-text"}`}
                >
                  {formatCurrency(v.yearTotals.profit)}
                </td>
              </tr>
            ))}
            {perVehicleThisYear.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-ink-soft"
                >
                  No units yet.
                </td>
              </tr>
            )}
          </tbody>
          {perVehicleThisYear.length > 0 && (
            <tfoot>
              <tr className="border-t border-line bg-canvas font-semibold">
                <td className="px-4 py-3 text-ink" colSpan={2}>
                  Grand Total ({selectedYear})
                </td>
                <td className="px-4 py-3 text-brand">
                  {formatCurrency(yearTotals.revenue)}
                </td>
                <td className="px-4 py-3 text-danger-text">
                  {formatCurrency(yearTotals.expense)}
                </td>
                <td
                  className={`px-4 py-3 ${yearTotals.profit >= 0 ? "text-brand" : "text-danger-text"}`}
                >
                  {formatCurrency(yearTotals.profit)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          All-Time Grand Total (Every Unit, Every Month)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-ink-soft">Revenue</p>
            <p className="text-xl font-semibold text-brand">
              {formatCurrency(allTimeTotals.revenue)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Expenses</p>
            <p className="text-xl font-semibold text-danger-text">
              {formatCurrency(allTimeTotals.expense)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Net Profit</p>
            <p
              className={`text-xl font-semibold ${allTimeTotals.profit >= 0 ? "text-brand" : "text-danger-text"}`}
            >
              {formatCurrency(allTimeTotals.profit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
