import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOrgId } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organizationId = await requireOrgId();
  const customer = await prisma.customer.findFirst({
    where: { id, organizationId },
    include: {
      bookings: {
        include: { vehicle: true },
        orderBy: { startDate: "desc" },
      },
    },
  });
  if (!customer) notFound();

  const totalSpent = customer.bookings.reduce(
    (sum, b) => sum + b.amountPaid,
    0
  );

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={customer.phone}
        actions={
          <Link
            href={`/customers/${customer.id}/edit`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Edit
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-950 p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Email
          </p>
          <p className="text-sm text-slate-200">{customer.email ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Driver&rsquo;s License
          </p>
          <p className="text-sm text-slate-200">
            {customer.driverLicense ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Total Bookings
          </p>
          <p className="text-sm text-slate-200">{customer.bookings.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Total Paid
          </p>
          <p className="text-sm font-semibold text-emerald-400">
            {formatCurrency(totalSpent)}
          </p>
        </div>
        {customer.address && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Address
            </p>
            <p className="text-sm text-slate-200">{customer.address}</p>
          </div>
        )}
        {customer.notes && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Notes
            </p>
            <p className="text-sm text-slate-200">{customer.notes}</p>
          </div>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-slate-100">
        Booking History
      </h2>
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {customer.bookings.map((b) => (
              <tr key={b.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${b.vehicle.id}`}
                    className="text-slate-100 hover:text-emerald-400"
                  >
                    {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatDate(b.startDate)} – {formatDate(b.endDate)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatCurrency(b.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
            {customer.bookings.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
