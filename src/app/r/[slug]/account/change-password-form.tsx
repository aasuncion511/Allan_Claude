"use client";

import { useActionState, useRef, useEffect } from "react";
import { customerChangeOwnPasswordAction } from "../customer-actions";
import { PasswordInput } from "@/components/password-input";

export function CustomerChangePasswordForm({ slug }: { slug: string }) {
  const action = customerChangeOwnPasswordAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-sm font-medium text-ink";

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label className={label}>Current Password</label>
        <PasswordInput name="currentPassword" required className={field} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>New Password</label>
          <PasswordInput name="newPassword" required minLength={8} className={field} />
        </div>
        <div>
          <label className={label}>Confirm New Password</label>
          <PasswordInput name="confirmPassword" required minLength={8} className={field} />
        </div>
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger-text">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-success-text">Password changed.</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink hover:bg-slate-50 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Change Password"}
      </button>
    </form>
  );
}
