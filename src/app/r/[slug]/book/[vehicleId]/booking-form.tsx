"use client";

import { useActionState } from "react";
import { createBookingCheckout } from "./actions";
import { formatCurrency } from "@/lib/format";

export function BookingForm({
  slug,
  vehicleId,
  dailyRate,
  reservationFee,
}: {
  slug: string;
  vehicleId: string;
  dailyRate: number;
  reservationFee: number;
}) {
  const action = createBookingCheckout.bind(null, slug, vehicleId);
  const [state, formAction, pending] = useActionState(action, undefined);

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500";
  const label = "mb-1 block text-sm font-medium text-slate-700";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Pick-up Date</label>
          <input name="startDate" type="date" required min={today} className={field} />
        </div>
        <div>
          <label className={label}>Drop-off Date</label>
          <input name="endDate" type="date" required min={today} className={field} />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Daily rate: {formatCurrency(dailyRate)}. Total is calculated from your
        dates. A {formatCurrency(reservationFee)} reservation fee is charged
        now to lock in your booking; the balance is settled at pick-up.
      </p>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Redirecting to payment…" : `Pay ${formatCurrency(reservationFee)} & Reserve`}
      </button>
    </form>
  );
}
