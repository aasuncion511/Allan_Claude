"use client";

import Link from "next/link";
import { useActionState } from "react";
import { customerRequestPasswordResetAction } from "../customer-actions";

export function CustomerForgotPasswordForm({ slug }: { slug: string }) {
  const action = customerRequestPasswordResetAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, undefined);

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-sm font-medium text-ink";

  if (state?.success) {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success-text">
        If that email has an account, we&apos;ve sent a new temporary password to it. Sign in with it, then change
        it from your account page.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className={label}>Email</label>
        <input name="email" type="email" required className={field} />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-text">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send new password"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        <Link href={`/r/${slug}/login`} className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
