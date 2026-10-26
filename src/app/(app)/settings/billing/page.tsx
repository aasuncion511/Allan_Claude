import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { PlanCard, ManageBillingButton } from "@/components/billing-client";
import { PLANS } from "@/lib/stripe";
import { daysLeftInTrial } from "@/lib/subscription";
import { formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  TRIALING: "Free trial",
  ACTIVE: "Active",
  PAST_DUE: "Payment past due",
  CANCELED: "Canceled",
  INCOMPLETE: "Incomplete",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const user = await requireUser();
  const org = user.organization;
  const trialDays = daysLeftInTrial(org);
  const currentPlanId = PLANS.find((p) => p.priceId === org.stripePriceId)?.id;

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Manage your subscription plan"
        actions={org.stripeCustomerId ? <ManageBillingButton /> : undefined}
      />

      {checkout === "success" && (
        <p className="mb-6 rounded-lg bg-success-surface px-4 py-3 text-sm text-success-text">
          Subscription updated. It may take a few seconds to reflect below.
        </p>
      )}
      {checkout === "cancelled" && (
        <p className="mb-6 rounded-lg bg-surface px-4 py-3 text-sm text-ink">
          Checkout was cancelled — no changes were made.
        </p>
      )}

      <div className="mb-8 rounded-xl border border-line bg-surface p-5">
        <p className="text-xs uppercase tracking-wide text-ink-soft">
          Current Status
        </p>
        <p className="mt-1 text-xl font-semibold text-ink">
          {STATUS_LABEL[org.subscriptionStatus] ?? org.subscriptionStatus}
        </p>
        {trialDays !== null && (
          <p className="mt-1 text-sm text-ink-soft">
            {trialDays} day{trialDays === 1 ? "" : "s"} left in your trial
          </p>
        )}
        {org.currentPeriodEnd && (
          <p className="mt-1 text-sm text-ink-soft">
            {org.cancelAtPeriodEnd ? "Cancels" : "Renews"} on{" "}
            {formatDate(org.currentPeriodEnd)}
          </p>
        )}
        {user.role !== "OWNER" && (
          <p className="mt-2 text-xs text-ink-soft">
            Only the account owner can change plans or payment details.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} isCurrent={plan.id === currentPlanId} />
        ))}
      </div>
    </div>
  );
}
