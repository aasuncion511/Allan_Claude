import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function ExpensesPage() {
  const { organizationId } = await requirePermission("expenses");
  const [expenses, fuelLogs, maintenanceLogs] = await Promise.all([
    prisma.expense.findMany({
      where: { organizationId },
      include: { vehicle: true },
      orderBy: { date: "desc" },
    }),
    prisma.fuelLog.aggregate({ where: { organizationId }, _sum: { cost: true } }),
    prisma.maintenanceLog.aggregate({ where: { organizationId }, _sum: { cost: true } }),
  ]);

  const otherTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const grandTotal =
    otherTotal + (fuelLogs._sum.cost ?? 0) + (maintenanceLogs._sum.cost ?? 0);

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Other operating costs, per unit. Fuel and maintenance are logged from each unit's page."
        actions={
          <Link
            href="/expenses/new"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + Add Expense
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Other Expenses
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatCurrency(otherTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Fuel + Maintenance
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {formatCurrency(
              (fuelLogs._sum.cost ?? 0) + (maintenanceLogs._sum.cost ?? 0)
            )}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Grand Total (All Expenses)
          </p>
          <p className="mt-2 text-2xl font-semibold text-danger-text">
            {formatCurrency(grandTotal)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${e.vehicle.id}`}
                    className="text-ink hover:text-brand-dark"
                  >
                    {e.vehicle.plateNumber}
                  </Link>
                </td>
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
            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-ink-soft"
                >
                  No expenses logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
