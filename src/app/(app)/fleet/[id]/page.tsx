import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/badge";
import { MonthlyChart } from "@/components/monthly-chart";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getVehicleMonthlySummary,
  computeFuelConsumption,
  sumRows,
  filterByYear,
} from "@/lib/metrics";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId } = await requirePermission("fleet");
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, organizationId },
    include: {
      bookings: {
        include: { customer: true },
        orderBy: { startDate: "desc" },
      },
      expenses: { orderBy: { date: "desc" } },
      maintenanceLogs: { orderBy: { date: "desc" } },
      fuelLogs: { orderBy: { date: "desc" } },
    },
  });
  if (!vehicle) notFound();

  const monthly = await getVehicleMonthlySummary(organizationId, vehicle.id);
  const currentYear = new Date().getFullYear();
  const yearRows = filterByYear(monthly, currentYear);
  const totals = sumRows(monthly);
  const consumption = computeFuelConsumption(vehicle.fuelLogs);
  const avgConsumption =
    consumption.length > 0
      ? consumption.reduce((s, c) => s + c.litersPer100km, 0) /
        consumption.length
      : null;

  const upcomingBookings = vehicle.bookings.filter(
    (b) => b.status === "RESERVED" || b.status === "ACTIVE" || b.status === "HOLD"
  );
  const recentPastBookings = vehicle.bookings
    .filter((b) => b.status === "COMPLETED" || b.status === "CANCELLED")
    .slice(0, 8);
  const scheduleRows = [...upcomingBookings, ...recentPastBookings];

  const upcomingMaintenance = vehicle.maintenanceLogs
    .filter((m) => m.nextDueDate)
    .sort((a, b) => (a.nextDueDate! < b.nextDueDate! ? -1 : 1))[0];

  return (
    <div>
      <PageHeader
        title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        description={vehicle.plateNumber}
        actions={
          <>
            <Link
              href={`/fleet/${vehicle.id}/edit`}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas"
            >
              Edit
            </Link>
            <StatusBadge status={vehicle.status} />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totals.revenue)}
          tone="positive"
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(totals.expense)}
          tone="negative"
        />
        <StatCard
          label="Net Profit"
          value={formatCurrency(totals.profit)}
          tone={totals.profit >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="Odometer"
          value={`${vehicle.odometer.toLocaleString()} km`}
        />
      </div>

      <div className="mb-8 rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink-soft">
          Monthly Revenue vs. Expense — {currentYear}
        </h2>
        {yearRows.length > 0 ? (
          <MonthlyChart data={yearRows} />
        ) : (
          <p className="py-10 text-center text-sm text-ink-soft">
            No financial activity recorded for {currentYear} yet.
          </p>
        )}
      </div>

      {/* Schedule */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Schedule</h2>
          <Link
            href={`/bookings/new?vehicleId=${vehicle.id}`}
            className="text-sm font-medium text-brand hover:underline"
          >
            + New Booking
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {scheduleRows.map((b) => (
                <tr key={b.id} className="hover:bg-canvas">
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${b.customer.id}`}
                      className="text-ink hover:text-brand-dark"
                    >
                      {b.customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {formatDate(b.startDate)} – {formatDate(b.endDate)}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {formatCurrency(b.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
              {vehicle.bookings.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-ink-soft"
                  >
                    No bookings yet for this unit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {vehicle.bookings.length > scheduleRows.length && (
          <p className="mt-2 text-xs text-ink-soft">
            Showing {scheduleRows.length} of {vehicle.bookings.length}{" "}
            bookings (all upcoming, plus the most recent completed).
          </p>
        )}
      </section>

      {/* Maintenance */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            Maintenance
          </h2>
          <Link
            href={`/maintenance/new?vehicleId=${vehicle.id}`}
            className="text-sm font-medium text-brand hover:underline"
          >
            + Log Maintenance
          </Link>
        </div>
        {upcomingMaintenance?.nextDueDate && (
          <p className="mb-3 rounded-lg bg-warning-surface px-3 py-2 text-sm text-warning-text">
            Next due: {upcomingMaintenance.type} on{" "}
            {formatDate(upcomingMaintenance.nextDueDate)}
            {upcomingMaintenance.nextDueOdometer &&
              ` or ${upcomingMaintenance.nextDueOdometer.toLocaleString()} km`}
          </p>
        )}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Odometer</th>
                <th className="px-4 py-3">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {vehicle.maintenanceLogs.slice(0, 5).map((m) => (
                <tr key={m.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 text-ink">{m.type}</td>
                  <td className="px-4 py-3 text-ink">
                    {formatDate(m.date)}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {m.odometer ? `${m.odometer.toLocaleString()} km` : "—"}
                  </td>
                  <td className="px-4 py-3 text-danger-text">
                    {formatCurrency(m.cost)}
                  </td>
                </tr>
              ))}
              {vehicle.maintenanceLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-ink-soft"
                  >
                    No maintenance logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Fuel */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            Fuel Consumption
          </h2>
          <Link
            href={`/fleet/${vehicle.id}/fuel/new`}
            className="text-sm font-medium text-brand hover:underline"
          >
            + Log Fuel
          </Link>
        </div>
        {avgConsumption !== null && (
          <p className="mb-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-700">
            Average consumption: {avgConsumption.toFixed(1)} L/100km
          </p>
        )}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Odometer</th>
                <th className="px-4 py-3">Liters</th>
                <th className="px-4 py-3">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {vehicle.fuelLogs.slice(0, 5).map((f) => (
                <tr key={f.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 text-ink">
                    {formatDate(f.date)}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {f.odometer ? `${f.odometer.toLocaleString()} km` : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {f.liters.toFixed(1)} L
                  </td>
                  <td className="px-4 py-3 text-danger-text">
                    {formatCurrency(f.cost)}
                  </td>
                </tr>
              ))}
              {vehicle.fuelLogs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-ink-soft"
                  >
                    No fuel logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Other expenses */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            Other Expenses
          </h2>
          <Link
            href={`/expenses/new?vehicleId=${vehicle.id}`}
            className="text-sm font-medium text-brand hover:underline"
          >
            + Add Expense
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {vehicle.expenses.slice(0, 5).map((e) => (
                <tr key={e.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 text-ink">
                    {e.category.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {formatDate(e.date)}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {e.vendor ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-danger-text">
                    {formatCurrency(e.amount)}
                  </td>
                </tr>
              ))}
              {vehicle.expenses.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-ink-soft"
                  >
                    No other expenses logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
