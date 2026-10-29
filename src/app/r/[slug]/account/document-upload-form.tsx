"use client";

import { useActionState, useRef, useEffect } from "react";
import { customerUploadDocumentAction } from "../customer-actions";

type Doc = {
  id: string;
  type: string;
  status: string;
  rejectionReason: string | null;
  createdAt: Date;
};

const TYPE_LABELS: Record<string, string> = {
  DRIVERS_LICENSE: "Driver's License",
  GOVERNMENT_ID: "Government ID",
  PROOF_OF_BILLING: "Proof of Billing",
  OTHER: "Other",
};

export function DocumentUploadForm({ slug, documents }: { slug: string; documents: Doc[] }) {
  const action = customerUploadDocumentAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-sm font-medium text-ink";

  return (
    <div>
      {documents.length > 0 && (
        <div className="mb-4 space-y-2">
          {documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm"
            >
              <span className="text-ink">{TYPE_LABELS[d.type] ?? d.type}</span>
              {d.status === "PENDING" && <span className="text-xs font-medium text-amber-600">Pending review</span>}
              {d.status === "APPROVED" && <span className="text-xs font-medium text-success-text">✅ Approved</span>}
              {d.status === "REJECTED" && (
                <span className="text-xs font-medium text-danger-text" title={d.rejectionReason ?? undefined}>
                  ⚠ Rejected{d.rejectionReason ? ` — ${d.rejectionReason}` : ""}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-4">
        <div>
          <label className={label}>Document Type</label>
          <select name="type" defaultValue="DRIVERS_LICENSE" className={field}>
            <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
            <option value="GOVERNMENT_ID">Government ID</option>
            <option value="PROOF_OF_BILLING">Proof of Billing</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className={label}>Photo</label>
          <input name="file" type="file" accept="image/png,image/jpeg,image/webp" required className={field} />
        </div>
        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-text">{state.error}</p>
        )}
        {state?.success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success-text">
            Uploaded — pending review.
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload Document"}
        </button>
      </form>
    </div>
  );
}
