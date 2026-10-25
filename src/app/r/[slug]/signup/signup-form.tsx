"use client";

import Link from "next/link";
import { useActionState } from "react";
import { customerSignupAction } from "../customer-actions";

export function CustomerSignupForm({
  slug,
  redirectTo,
}: {
  slug: string;
  redirectTo?: string;
}) {
  const action = customerSignupAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, undefined);

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500";
  const label = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <form action={formAction} className="space-y-4">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <div>
        <label className={label}>Full Name</label>
        <input name="name" required className={field} />
      </div>
      <div>
        <label className={label}>Email</label>
        <input name="email" type="email" required className={field} />
      </div>
      <div>
        <label className={label}>Phone</label>
        <input name="phone" required className={field} placeholder="+63 9XX XXX XXXX" />
      </div>
      <div>
        <label className={label}>Password</label>
        <input name="password" type="password" required minLength={8} className={field} />
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href={`/r/${slug}/login`} className="font-medium text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
