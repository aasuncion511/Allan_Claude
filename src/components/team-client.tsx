"use client";

import { useActionState, useRef, useEffect } from "react";
import { inviteTeammate } from "@/app/(app)/settings/team/actions";

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteTeammate, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === undefined) return;
    if (!state.error) formRef.current?.reset();
  }, [state]);

  const field =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-500";
  const label = "mb-1 block text-sm font-medium text-slate-300";

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Name</label>
          <input name="name" required className={field} />
        </div>
        <div>
          <label className={label}>Email</label>
          <input name="email" type="email" required className={field} />
        </div>
        <div>
          <label className={label}>Temporary Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className={field}
          />
        </div>
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add Teammate"}
      </button>
    </form>
  );
}
