"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "./actions";
import { PasswordInput } from "@/components/password-input";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl">🚗</div>
          <h1 className="text-xl font-semibold text-ink">
            Start your free trial
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            14 days free, no card required
          </p>
        </div>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Company Name
            </label>
            <input
              name="companyName"
              required
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="Reyna Car Rentals"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Your Name
            </label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="Juan Dela Cruz"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Password
            </label>
            <PasswordInput
              name="password"
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="At least 8 characters"
            />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger-text">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
