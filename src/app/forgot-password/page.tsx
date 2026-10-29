"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl">🔑</div>
          <h1 className="text-xl font-semibold text-ink">Forgot your password?</h1>
          <p className="mt-1 text-sm text-ink-soft">
            We&apos;ll email you a new temporary password.
          </p>
        </div>
        {state?.success ? (
          <p className="rounded-lg bg-success-surface px-3 py-2 text-sm text-success-text">
            If that email has an account, we&apos;ve sent a new temporary password to it. Sign in with it, then
            change it under Settings &gt; Team.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Email</label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                placeholder="admin@example.com"
              />
            </div>
            {state?.error && (
              <p className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger-text">{state.error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send new password"}
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-ink-soft">
          <Link href="/login" className="text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
