"use server";

import { prisma } from "@/lib/db";
import { hashPassword, generateTempPassword } from "@/lib/auth";
import { sendTransactionalEmail, isResendConfigured } from "@/lib/resend";
import { checkPasswordResetRateLimit } from "@/lib/rate-limit";

export type ForgotPasswordState = { error?: string; success?: boolean } | undefined;

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email is required." };

  const limitError = await checkPasswordResetRateLimit("admin");
  if (limitError) return { error: limitError };

  if (!isResendConfigured()) {
    return { error: "Password reset email isn't set up yet — ask your administrator for help." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const tempPassword = generateTempPassword();
    const result = await sendTransactionalEmail({
      to: user.email,
      subject: "Your Fleet Manager password has been reset",
      html: `<p>Hi ${user.name},</p><p>Your password has been reset. Your new temporary password is:</p><p style="font-size:18px;font-weight:bold;letter-spacing:1px;">${tempPassword}</p><p>Sign in with it, then change it right away under Settings &gt; Team &gt; My Account.</p><p>If you didn't request this, contact your account owner immediately.</p>`,
    });
    // Only overwrite the real password once the email actually sent — never
    // lock an owner out of their own account because of a transient delivery failure.
    if (result.ok) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(tempPassword) },
      });
    } else {
      console.error("[forgot-password] send failed:", result.error);
    }
  }

  // Same message whether or not the account exists, to avoid confirming
  // which emails have accounts.
  return { success: true };
}
