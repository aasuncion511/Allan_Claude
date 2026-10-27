"use client";

import { useActionState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { requestBookingRefundAction, type RefundActionState } from "../actions";

type Refund = {
  id: string;
  amount: number;
  paymongoReason: string;
  notes: string;
  status: string;
  error: string | null;
  createdAt: Date;
  requestedByName: string;
};

const REASON_LABELS: Record<string, string> = {
  duplicate: "Duplicate charge",
  fraudulent: "Fraudulent",
  requested_by_customer: "Requested by customer",
  others: "Other",
};

export function RefundPanel({
  bookingId,
  refundable,
  refunds,
  canRefund,
}: {
  bookingId: string;
  refundable: number;
  refunds: Refund[];
  canRefund: boolean;
}) {
  const action = requestBookingRefundAction.bind(null, bookingId);
  const [state, formAction, pending] = useActionState<RefundActionState, FormData>(action, undefined);

  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-medium text-ink-soft";

  return (
    <div className="mt-8 rounded-xl border border-line bg-surface p-6">
      <h2 className="mb-1 text-sm font-semibold text-ink">Refunds</h2>
      <p className="mb-4 text-xs text-ink-soft">
        Reservation payments are non-refundable under the published policy, except where legally required or the
        unit can&apos;t be supplied. Use this only as that exception — every refund needs a justification and is
        logged here and in the{" "}
        <a href="/bookings/refunds" className="text-brand hover:underline">
          org-wide refund log
        </a>
        .
      </p>

      {refunds.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">By</th>
                <th className="px-3 py-2">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {refunds.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 text-ink">{formatCurrency(r.amount)}</td>
                  <td className="px-3 py-2 text-ink">
                    {REASON_LABELS[r.paymongoReason] ?? r.paymongoReason}
                    <div className="text-ink-soft">{r.notes}</div>
                  </td>
                  <td className="px-3 py-2">
                    {r.status === "SUCCEEDED" && <span className="text-success-text">Succeeded</span>}
                    {r.status === "PENDING" && <span className="text-warning-text">Pending</span>}
                    {r.status === "FAILED" && (
                      <span className="text-danger-text" title={r.error ?? undefined}>
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink-soft">{r.requestedByName}</td>
                  <td className="px-3 py-2 text-ink-soft">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!canRefund ? (
        <p className="text-xs text-ink-soft">
          You don&apos;t have the Refunds permission — ask an owner to grant it in Settings → Team if you need to
          process one.
        </p>
      ) : refundable <= 0 ? (
        <p className="text-xs text-ink-soft">Nothing left to refund on this booking.</p>
      ) : (
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Amount (₱, up to {formatCurrency(refundable)})</label>
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={refundable}
                defaultValue={refundable}
                required
                className={field}
              />
            </div>
            <div>
              <label className={label}>Reason (for PayMongo)</label>
              <select name="paymongoReason" defaultValue="requested_by_customer" className={field}>
                <option value="requested_by_customer">Requested by customer</option>
                <option value="duplicate">Duplicate charge</option>
                <option value="fraudulent">Fraudulent</option>
                <option value="others">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Justification (required — this is a policy exception)</label>
            <textarea
              name="notes"
              rows={2}
              required
              placeholder="e.g. Unit was unavailable due to an accident; customer offered alternate dates and declined."
              className={field}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-danger-text/40 px-4 py-2 text-sm font-semibold text-danger-text hover:bg-danger-surface disabled:opacity-50"
          >
            {pending ? "Processing refund…" : "Process Refund"}
          </button>
          {state?.error && (
            <p className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger-text">{state.error}</p>
          )}
          {state?.success && (
            <p className="rounded-lg bg-success-surface px-3 py-2 text-sm text-success-text">Refund processed.</p>
          )}
        </form>
      )}
    </div>
  );
}
