import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { toggleCustomerSmsOptOut } from "../actions";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { organizationId } = await requirePermission("customers");
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
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas"
          >
            Edit
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-line bg-surface p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Email
          </p>
          <p className="text-sm text-ink">{customer.email ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Driver&rsquo;s License
          </p>
          <p className="text-sm text-ink">
            {customer.driverLicense ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Birthday
          </p>
          <p className="text-sm text-ink">
            {customer.birthday ? formatDate(customer.birthday) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Total Bookings
          </p>
          <p className="text-sm text-ink">{customer.bookings.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">
            Total Paid
          </p>
          <p className="text-sm font-semibold text-brand">
            {formatCurrency(totalSpent)}
          </p>
        </div>
        {customer.address && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              Address
            </p>
            <p className="text-sm text-ink">{customer.address}</p>
          </div>
        )}
        {customer.notes && (
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              Notes
            </p>
            <p className="text-sm text-ink">{customer.notes}</p>
          </div>
        )}
        <div className="col-span-2 sm:col-span-4 flex items-center justify-between border-t border-line pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">SMS Nurturing</p>
            <p className="text-sm text-ink">
              {customer.smsOptOut ? (
                <>⚠ Not receiving reminders/greetings{customer.smsOptOutReason ? ` — ${customer.smsOptOutReason}` : ""}</>
              ) : (
                "✅ Receiving reminders & greetings"
              )}
            </p>
          </div>
          <form action={toggleCustomerSmsOptOut.bind(null, customer.id, !customer.smsOptOut)}>
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
            >
              {customer.smsOptOut ? "Re-enable SMS" : "Opt Out of SMS"}
            </button>
          </form>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-ink">
        Booking History
      </h2>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {customer.bookings.map((b) => (
              <tr key={b.id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <Link
                    href={`/fleet/${b.vehicle.id}`}
                    className="text-ink hover:text-brand-dark"
                  >
                    {b.vehicle.year} {b.vehicle.make} {b.vehicle.model}
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
            {customer.bookings.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-ink-soft"
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
