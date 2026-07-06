import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function BookingsPage() {
  const bookings = await prisma.booking.findMany({
    include: { vehicle: true, customer: true },
    orderBy: { startDate: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Bookings"
        description={`${bookings.length} booking${bookings.length === 1 ? "" : "s"} — unit schedule at a glance`}
        actions={
          <Link
            href="/bookings/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            + New Booking
          </Link>
        }
      />

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${b.vehicle.id}`}
                    className="font-medium text-slate-100 hover:text-emerald-400"
                  >
                    {b.vehicle.plateNumber}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {b.vehicle.make} {b.vehicle.model}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/customers/${b.customer.id}`}
                    className="text-slate-200 hover:text-emerald-400"
                  >
                    {b.customer.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatDate(b.startDate)} – {formatDate(b.endDate)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatCurrency(b.totalAmount)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatCurrency(b.amountPaid)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/bookings/${b.id}/edit`}
                    className="text-xs font-medium text-emerald-400 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No bookings yet.{" "}
                  <Link href="/bookings/new" className="text-emerald-400">
                    Create the first booking
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
