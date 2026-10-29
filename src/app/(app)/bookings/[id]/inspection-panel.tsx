"use client";

import { useActionState } from "react";
import { formatDate } from "@/lib/format";
import { recordInspectionAction, type InspectionActionState } from "./inspection-actions";
import type { InspectionTypeValue } from "@/lib/booking-inspection";

type Inspection = {
  id: string;
  odometer: number | null;
  fuelLevel: string | null;
  photos: unknown;
  notes: string | null;
  performedAt: Date;
};

function InspectionForm({
  bookingId,
  type,
}: {
  bookingId: string;
  type: InspectionTypeValue;
}) {
  const action = recordInspectionAction.bind(null, bookingId, type) as (
    state: InspectionActionState,
    formData: FormData
  ) => Promise<InspectionActionState>;
  const [state, formAction, pending] = useActionState(action, undefined);

  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-medium text-ink-soft";

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Odometer (km)</label>
          <input name="odometer" type="number" min="0" className={field} />
        </div>
        <div>
          <label className={label}>Fuel Level</label>
          <select name="fuelLevel" defaultValue="Full" className={field}>
            <option value="Full">Full</option>
            <option value="3/4">3/4</option>
            <option value="1/2">1/2</option>
            <option value="1/4">1/4</option>
            <option value="Empty">Empty</option>
          </select>
        </div>
      </div>
      <div>
        <label className={label}>Condition Photos</label>
        <input name="photos" type="file" accept="image/png,image/jpeg,image/webp" multiple className={field} />
      </div>
      <div>
        <label className={label}>Notes</label>
        <textarea name="notes" rows={2} className={field} placeholder="Scratches, dents, interior condition, etc." />
      </div>
      {type === "RETURN" && (
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-warning-text/30 bg-warning-surface p-3">
          <div>
            <label className={label}>Damage/Cleaning Charge (₱, optional)</label>
            <input name="damageChargeAmount" type="number" step="0.01" min="0" className={field} />
          </div>
          <div>
            <label className={label}>Charge Reason</label>
            <input name="damageChargeDescription" placeholder="e.g. Rear bumper scratch" className={field} />
          </div>
          <p className="col-span-2 text-xs text-warning-text">
            If filled in, this adds a pending charge to the booking — collect it the same way as any other charge.
          </p>
        </div>
      )}
      {state?.error && (
        <p className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger-text">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Saving…" : `Record ${type === "RELEASE" ? "Release" : "Return"} Inspection`}
      </button>
    </form>
  );
}

function InspectionSummary({ inspection }: { inspection: Inspection }) {
  const photos = Array.isArray(inspection.photos) ? (inspection.photos as string[]) : [];
  return (
    <div className="space-y-2 text-sm">
      <p className="text-success-text">✅ Recorded on {formatDate(inspection.performedAt)}</p>
      <div className="grid grid-cols-2 gap-3 text-ink-soft">
        <p>Odometer: {inspection.odometer ?? "—"} km</p>
        <p>Fuel: {inspection.fuelLevel ?? "—"}</p>
      </div>
      {inspection.notes && <p className="text-ink-soft">Notes: {inspection.notes}</p>}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="Condition photo" className="h-20 w-28 rounded-lg border border-line object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}

export function InspectionPanel({
  bookingId,
  release,
  return: returnInspection,
}: {
  bookingId: string;
  release: Inspection | null;
  return: Inspection | null;
}) {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Release Inspection</h2>
        {release ? <InspectionSummary inspection={release} /> : <InspectionForm bookingId={bookingId} type="RELEASE" />}
      </div>
      <div className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Return Inspection</h2>
        {returnInspection ? (
          <InspectionSummary inspection={returnInspection} />
        ) : (
          <InspectionForm bookingId={bookingId} type="RETURN" />
        )}
      </div>
    </div>
  );
}
