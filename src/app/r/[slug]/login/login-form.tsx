"use client";

import Link from "next/link";
import { useActionState } from "react";
import { customerLoginAction } from "../customer-actions";
import { PasswordInput } from "@/components/password-input";

export function CustomerLoginForm({
  slug,
  redirectTo,
}: {
  slug: string;
  redirectTo?: string;
}) {
  const action = customerLoginAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, undefined);

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[var(--store-accent)]";
  const label = "mb-1 block text-sm font-medium text-ink";

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <div>
        <label className={label}>Email</label>
        <input name="email" type="email" required className={field} />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-ink">Password</label>
          <Link href={`/r/${slug}/forgot-password`} className="text-xs text-[var(--store-accent)] hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput name="password" required className={field} />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-text">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--store-accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--store-accent-dark)] disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-ink-soft">
        New here?{" "}
        <Link
          href={`/r/${slug}/signup${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-medium text-[var(--store-accent)] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
