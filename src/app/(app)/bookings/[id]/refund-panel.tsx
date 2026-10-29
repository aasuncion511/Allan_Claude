"use client";

import { useState, useActionState } from "react";
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
  fraudulent: "Fraudulent transaction",
  requested_by_customer: "Customer requested cancellation",
  others: "Other (see notes)",
};

// Business-facing reasons shown in the dropdown. PayMongo's refund API only
// accepts the 4 values in REASON_LABELS above, so a few business reasons
// map onto "others" — the real detail always goes in the required notes field.
const BUSINESS_REASONS: { value: string; paymongoReason: string; label: string }[] = [
  { value: "requested_by_customer", paymongoReason: "requested_by_customer", label: "Customer requested cancellation" },
  { value: "duplicate", paymongoReason: "duplicate", label: "Duplicate charge" },
  { value: "fraudulent", paymongoReason: "fraudulent", label: "Fraudulent transaction" },
  { value: "unit_unavailable", paymongoReason: "others", label: "Vehicle unavailable / unit issue" },
  { value: "other", paymongoReason: "others", label: "Other — specify below" },
];

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
  const [businessReason, setBusinessReason] = useState(BUSINESS_REASONS[0].value);
  const selected = BUSINESS_REASONS.find((r) => r.value === businessReason) ?? BUSINESS_REASONS[0];
  const needsDetail = businessReason === "unit_unavailable" || businessReason === "other";

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
          Rental-payment refunds are owner-only and can&apos;t be delegated to staff. Ask an owner to process this
          one.
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
              <label className={label}>Reason</label>
              <select
                value={businessReason}
                onChange={(e) => setBusinessReason(e.target.value)}
                className={field}
              >
                {BUSINESS_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <input type="hidden" name="paymongoReason" value={selected.paymongoReason} />
            </div>
          </div>
          <div>
            <label className={label}>
              {needsDetail ? "Describe the reason (required)" : "Justification (required — this is a policy exception)"}
            </label>
            <textarea
              name="notes"
              rows={2}
              required
              placeholder={
                needsDetail
                  ? "e.g. Unit was unavailable due to an accident; customer offered alternate dates and declined."
                  : "Add any context an auditor would want to see."
              }
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
