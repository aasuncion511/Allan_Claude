import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { approveCustomerDocument, rejectCustomerDocument } from "../actions";

const TYPE_LABELS: Record<string, string> = {
  DRIVERS_LICENSE: "Driver's License",
  GOVERNMENT_ID: "Government ID",
  PROOF_OF_BILLING: "Proof of Billing",
  OTHER: "Other",
};

export default async function DocumentReviewPage() {
  const { organizationId } = await requirePermission("customers");

  const [pending, reviewed] = await Promise.all([
    prisma.customerDocument.findMany({
      where: { organizationId, status: "PENDING" },
      include: { customer: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customerDocument.findMany({
      where: { organizationId, status: { not: "PENDING" } },
      include: { customer: true },
      orderBy: { reviewedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Document Review"
        description={`${pending.length} document${pending.length === 1 ? "" : "s"} waiting for review.`}
      />

      <div className="mb-10 space-y-4">
        {pending.map((doc) => {
          const approve = approveCustomerDocument.bind(null, doc.id);
          const reject = rejectCustomerDocument.bind(null, doc.id);
          return (
            <div key={doc.id} className="flex gap-4 rounded-xl border border-line bg-surface p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.fileUrl}
                alt={TYPE_LABELS[doc.type] ?? doc.type}
                className="h-28 w-40 flex-none rounded-lg border border-line object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  <Link href={`/customers/${doc.customerId}`} className="hover:text-brand-dark">
                    {doc.customer.name}
                  </Link>
                </p>
                <p className="text-xs text-ink-soft">
                  {TYPE_LABELS[doc.type] ?? doc.type} · Uploaded {formatDate(doc.createdAt)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <form action={approve}>
                    <button
                      type="submit"
                      className="rounded-lg bg-success-surface px-3 py-1.5 text-xs font-semibold text-success-text hover:opacity-80"
                    >
                      ✅ Approve
                    </button>
                  </form>
                  <form action={reject} className="flex items-center gap-2">
                    <input
                      name="rejectionReason"
                      placeholder="Reason (e.g. blurry photo)"
                      className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink outline-none focus:border-brand"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-danger-surface px-3 py-1.5 text-xs font-semibold text-danger-text hover:opacity-80"
                    >
                      ⚠ Reject
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
        {pending.length === 0 && (
          <p className="rounded-xl border border-line bg-surface p-8 text-center text-sm text-ink-soft">
            Nothing waiting for review.
          </p>
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-ink">Recently Reviewed</h2>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reviewed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {reviewed.map((doc) => (
              <tr key={doc.id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <Link href={`/customers/${doc.customerId}`} className="text-ink hover:text-brand-dark">
                    {doc.customer.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{TYPE_LABELS[doc.type] ?? doc.type}</td>
                <td className="px-4 py-3">
                  {doc.status === "APPROVED" ? (
                    <span className="text-success-text">Approved</span>
                  ) : (
                    <span className="text-danger-text" title={doc.rejectionReason ?? undefined}>
                      Rejected
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft">{doc.reviewedAt ? formatDate(doc.reviewedAt) : "—"}</td>
              </tr>
            ))}
            {reviewed.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-soft">
                  No documents reviewed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
