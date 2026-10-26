"use client";

import { useActionState, useRef, useEffect } from "react";
import { inviteTeammate } from "@/app/(app)/settings/team/actions";
import { PermissionCheckboxes } from "@/components/permission-checkboxes";
import { DEFAULT_STAFF_PERMISSIONS } from "@/lib/permissions";

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteTeammate, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === undefined) return;
    if (!state.error) formRef.current?.reset();
  }, [state]);

  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-sm font-medium text-ink";

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
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
      <PermissionCheckboxes defaults={DEFAULT_STAFF_PERMISSIONS} />
      {state?.error && (
        <p className="rounded-lg bg-danger-surface px-3 py-2 text-sm text-danger-text">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add Teammate"}
      </button>
    </form>
  );
}
