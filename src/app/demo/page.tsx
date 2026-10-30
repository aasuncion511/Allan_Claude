"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startDemoAction } from "./actions";

export default function DemoPage() {
  const [state, formAction, pending] = useActionState(startDemoAction, undefined);

  if (state && "success" in state) {
    const expires = new Date(state.expiresAt);
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-xl">
          <div className="mb-2 text-3xl">🎉</div>
          <h1 className="text-xl font-semibold text-ink">Your demo is ready!</h1>
          <p className="mt-2 text-sm text-ink-soft">
            We&apos;ve loaded a sample fleet, customers, and a couple of bookings so you can see
            everything in action right away.
          </p>

          <div className="mt-5 space-y-2 rounded-lg bg-canvas p-4 text-left text-sm">
            <p className="text-ink-soft">
              Login email: <span className="font-mono text-ink">{state.email}</span>
            </p>
            <p className="text-ink-soft">
              Temporary password: <span className="font-mono text-ink">{state.tempPassword}</span>
            </p>
            <p className="text-ink-soft">
              Expires: <span className="font-medium text-ink">{expires.toLocaleString("en-PH")}</span>
            </p>
            <p className="text-xs text-warning-text">
              Save these — you&apos;ll need them to log back in within the next 72 hours.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Enter Your Admin Dashboard
            </Link>
            <a
              href={`/r/${state.slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"
            >
              View Your Demo Storefront
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl">🚗</div>
          <h1 className="text-xl font-semibold text-ink">Try it free for 72 hours</h1>
          <p className="mt-1 text-sm text-ink-soft">
            No card, no commitment — get your own live sandbox with a sample fleet already loaded.
          </p>
        </div>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Your Name</label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="Juan Dela Cruz"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Email</label>
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
              Company Name <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <input
              name="companyName"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="Reyna Car Rentals"
            />
          </div>
          {state && "error" in state && (
            <p className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger-text">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Setting up your demo…" : "Start My Free Demo"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-soft">
          Ready to go live instead?{" "}
          <Link href="/signup" className="text-brand hover:underline">
            Start your real account
          </Link>
        </p>
      </div>
    </div>
  );
}
