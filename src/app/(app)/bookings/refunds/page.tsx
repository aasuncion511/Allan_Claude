import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";

const REASON_LABELS: Record<string, string> = {
  duplicate: "Duplicate charge",
  fraudulent: "Fraudulent",
  requested_by_customer: "Requested by customer",
  others: "Other",
};

export default async function RefundsLogPage() {
  const { organizationId } = await requireOwner();

  const refunds = await prisma.refund.findMany({
    where: { organizationId },
    include: { booking: { include: { vehicle: true, customer: true } } },
    orderBy: { createdAt: "desc" },
  });

  const requesters = await prisma.user.findMany({
    where: { id: { in: refunds.map((r) => r.requestedByUserId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(requesters.map((u) => [u.id, u.name]));

  const succeededTotal = refunds.filter((r) => r.status === "SUCCEEDED").reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader
        title="Refund Log"
        description="Every refund processed as an exception to the non-refundable reservation policy, across all bookings."
      />

      <div className="mb-6 rounded-xl border border-line bg-surface p-5">
        <p className="text-xs uppercase tracking-wide text-ink-soft">Total Refunded (Succeeded)</p>
        <p className="text-2xl font-bold text-danger-text">{formatCurrency(succeededTotal)}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Justification</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {refunds.map((r) => (
              <tr key={r.id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <Link href={`/bookings/${r.bookingId}/edit`} className="text-ink hover:text-brand-dark">
                    {r.booking.vehicle.year} {r.booking.vehicle.make} {r.booking.vehicle.model}
                  </Link>
                  <div className="text-xs text-ink-soft">{r.booking.customer.name}</div>
                </td>
                <td className="px-4 py-3 text-ink">{formatCurrency(r.amount)}</td>
                <td className="px-4 py-3 text-ink">{REASON_LABELS[r.paymongoReason] ?? r.paymongoReason}</td>
                <td className="px-4 py-3 max-w-xs text-ink-soft">{r.notes}</td>
                <td className="px-4 py-3">
                  {r.status === "SUCCEEDED" && <span className="text-success-text">Succeeded</span>}
                  {r.status === "PENDING" && <span className="text-warning-text">Pending</span>}
                  {r.status === "FAILED" && (
                    <span className="text-danger-text" title={r.error ?? undefined}>
                      Failed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft">{nameById.get(r.requestedByUserId) ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
            {refunds.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">
                  No refunds processed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
