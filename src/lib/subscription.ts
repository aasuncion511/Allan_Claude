export const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? 14);

export function trialEndDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 86_400_000);
}

type OrgSubscriptionFields = {
  subscriptionStatus: string;
  trialEndsAt: Date | null;
};

/** Whether the organization currently has access to the app. */
export function hasActiveAccess(org: OrgSubscriptionFields): boolean {
  if (org.subscriptionStatus === "ACTIVE") return true;
  if (org.subscriptionStatus === "TRIALING") {
    return !org.trialEndsAt || org.trialEndsAt.getTime() > Date.now();
  }
  return false;
}

export function daysLeftInTrial(org: OrgSubscriptionFields): number | null {
  if (org.subscriptionStatus !== "TRIALING" || !org.trialEndsAt) return null;
  const ms = org.trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
