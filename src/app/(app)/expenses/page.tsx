import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function ExpensesPage() {
  const [expenses, fuelLogs, maintenanceLogs] = await Promise.all([
    prisma.expense.findMany({
      include: { vehicle: true },
      orderBy: { date: "desc" },
    }),
    prisma.fuelLog.aggregate({ _sum: { cost: true } }),
    prisma.maintenanceLog.aggregate({ _sum: { cost: true } }),
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
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            + Add Expense
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Other Expenses
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {formatCurrency(otherTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Fuel + Maintenance
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {formatCurrency(
              (fuelLogs._sum.cost ?? 0) + (maintenanceLogs._sum.cost ?? 0)
            )}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Grand Total (All Expenses)
          </p>
          <p className="mt-2 text-2xl font-semibold text-red-400">
            {formatCurrency(grandTotal)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${e.vehicle.id}`}
                    className="text-slate-100 hover:text-emerald-400"
                  >
                    {e.vehicle.plateNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {e.category.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatDate(e.date)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {e.vendor ?? "—"}
                </td>
                <td className="px-4 py-3 text-red-400">
                  {formatCurrency(e.amount)}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-slate-500"
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
