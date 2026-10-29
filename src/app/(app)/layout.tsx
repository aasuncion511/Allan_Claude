import { requireUser } from "@/lib/auth";
import { hasActiveAccess, daysLeftInTrial } from "@/lib/subscription";
import { PERMISSION_KEYS, hasPermission } from "@/lib/permissions";
import { Nav } from "@/components/nav";
import { SubscriptionGate } from "@/components/subscription-gate";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const org = user.organization;
  const permissions = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, hasPermission(user, key)])
  ) as Record<(typeof PERMISSION_KEYS)[number], boolean>;

  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      <Nav
        userName={user.name}
        orgName={org.name}
        permissions={permissions}
        isPlatformAdmin={user.isPlatformAdmin}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden items-center justify-between border-b border-line bg-surface px-8 py-3 text-sm text-ink-soft md:flex">
          <span>{org.name}</span>
          <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink-soft">
            Operations Workspace
          </span>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <SubscriptionGate
            hasAccess={hasActiveAccess(org)}
            daysLeftInTrial={daysLeftInTrial(org)}
          >
            {children}
          </SubscriptionGate>
        </main>
      </div>
    </div>
  );
}
