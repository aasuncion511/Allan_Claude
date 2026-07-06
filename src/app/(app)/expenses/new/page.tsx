import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ExpenseForm } from "@/components/expense-form";
import { createExpense } from "../actions";

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string }>;
}) {
  const { vehicleId } = await searchParams;
  const organizationId = await requireOrgId();
  const vehicles = await prisma.vehicle.findMany({
    where: { organizationId },
    orderBy: { plateNumber: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <PageHeader title="Add Expense" description="Log an operating cost for a unit" />
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-400">Add a unit first.</p>
        ) : (
          <ExpenseForm
            action={createExpense}
            vehicles={vehicles}
            defaultVehicleId={vehicleId}
          />
        )}
      </div>
    </div>
  );
}
