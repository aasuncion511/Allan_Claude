import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { updateInquiryStatus } from "./actions";

export default async function BookingsPage() {
  const { organizationId } = await requirePermission("bookings");
  const bookings = await prisma.booking.findMany({
    where: { organizationId },
    include: { vehicle: true, customer: true, corporateClient: true },
    orderBy: { startDate: "desc" },
  });
  const inquiries = await prisma.bookingInquiry.findMany({
    where: { organizationId, status: { in: ["NEW", "CONTACTED"] } },
    include: { vehicle: true, customer: true },
    orderBy: { createdAt: "desc" },
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

      {inquiries.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-amber-800/50 bg-amber-950/20">
          <div className="border-b border-amber-800/50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-300">
              {inquiries.length} callback request{inquiries.length === 1 ? "" : "s"} — no payment, follow up to close
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-amber-900/50">
              {inquiries.map((inq) => {
                const markContacted = updateInquiryStatus.bind(null, inq.id, "CONTACTED");
                const markConverted = updateInquiryStatus.bind(null, inq.id, "CONVERTED");
                const markClosed = updateInquiryStatus.bind(null, inq.id, "CLOSED");
                return (
                  <tr key={inq.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{inq.customer.name}</div>
                      <div className="text-xs text-slate-400">
                        {inq.customer.phone} · {inq.customer.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {inq.vehicle.year} {inq.vehicle.make} {inq.vehicle.model}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatDate(inq.startDate)} – {formatDate(inq.endDate)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{inq.message}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inq.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <div className="flex justify-end gap-2">
                        {inq.status === "NEW" && (
                          <form action={markContacted}>
                            <button className="font-medium text-sky-400 hover:underline">Mark Contacted</button>
                          </form>
                        )}
                        <form action={markConverted}>
                          <button className="font-medium text-emerald-400 hover:underline">Converted</button>
                        </form>
                        <form action={markClosed}>
                          <button className="font-medium text-slate-500 hover:underline">Dismiss</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
                  {b.corporateClient && (
                    <div className="text-xs text-sky-400">🏢 {b.corporateClient.name}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatDate(b.startDate)} – {formatDate(b.endDate)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatCurrency(b.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <span className={b.amountPaid < b.totalAmount && !b.corporateClient ? "text-amber-400" : "text-slate-300"}>
                    {formatCurrency(b.amountPaid)}
                  </span>
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
