"use client";

import { useActionState } from "react";
import { formatCurrency } from "@/lib/format";
import { createHoldConversionCheckout, type BookingCheckoutState } from "../fleet/[vehicleId]/actions";

export function ConvertHoldButton({ slug, bookingId, balance }: { slug: string; bookingId: string; balance: number }) {
  const action = createHoldConversionCheckout.bind(null, slug, bookingId);
  const [state, formAction, pending] = useActionState<BookingCheckoutState, FormData>(action, undefined);

  return (
    <form action={formAction} className="mt-4">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Redirecting to payment…" : `Pay remaining ${formatCurrency(balance)} to confirm`}
      </button>
      {state?.error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
