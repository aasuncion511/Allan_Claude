import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { suspendOrganization, reactivateOrganization } from "./actions";

export default async function PlatformAdminPage() {
  await requirePlatformAdmin();

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { where: { role: "OWNER" }, take: 1, select: { name: true, email: true } },
      _count: { select: { vehicles: true, bookings: true } },
    },
  });

  const statusTone: Record<string, string> = {
    ACTIVE: "bg-success-surface text-success-text",
    TRIALING: "bg-sky-50 text-sky-700",
    PAST_DUE: "bg-warning-surface text-warning-text",
    CANCELED: "bg-danger-surface text-danger-text",
    INCOMPLETE: "bg-canvas text-ink-soft",
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard" className="mb-4 inline-block text-sm text-brand hover:underline">
        ← Back to Dashboard
      </Link>
      <PageHeader
        title="Platform Admin"
        description={`${orgs.length} client organization${orgs.length === 1 ? "" : "s"} on the platform. Cross-tenant — visible only to platform operators.`}
      />

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Trial Ends</th>
              <th className="px-4 py-3">Fleet</th>
              <th className="px-4 py-3">Bookings</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {orgs.map((org) => {
              const owner = org.users[0];
              const suspend = suspendOrganization.bind(null, org.id);
              const reactivate = reactivateOrganization.bind(null, org.id);
              return (
                <tr key={org.id} className="hover:bg-canvas">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{org.name}</p>
                    <a
                      href={`/r/${org.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-brand hover:underline"
                    >
                      /r/{org.slug}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {owner ? (
                      <>
                        <p className="text-ink">{owner.name}</p>
                        <p className="text-xs">{owner.email}</p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[org.subscriptionStatus] ?? "bg-canvas text-ink-soft"}`}
                    >
                      {org.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {org.trialEndsAt ? formatDate(org.trialEndsAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink">{org._count.vehicles}</td>
                  <td className="px-4 py-3 text-ink">{org._count.bookings}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatDate(org.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {org.subscriptionStatus === "CANCELED" ? (
                      <form action={reactivate}>
                        <button
                          type="submit"
                          className="text-xs font-medium text-success-text hover:underline"
                        >
                          Reactivate
                        </button>
                      </form>
                    ) : (
                      <form action={suspend}>
                        <button
                          type="submit"
                          className="text-xs font-medium text-danger-text hover:underline"
                        >
                          Suspend
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-ink-soft">
                  No organizations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
