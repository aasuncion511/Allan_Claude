import { requireUser } from "@/lib/auth";
import { hasActiveAccess, daysLeftInTrial } from "@/lib/subscription";
import { Nav } from "@/components/nav";
import { SubscriptionGate } from "@/components/subscription-gate";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const org = user.organization;

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Nav userName={user.name} orgName={org.name} />
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <SubscriptionGate
          hasAccess={hasActiveAccess(org)}
          daysLeftInTrial={daysLeftInTrial(org)}
        >
          {children}
        </SubscriptionGate>
      </main>
    </div>
  );
}
