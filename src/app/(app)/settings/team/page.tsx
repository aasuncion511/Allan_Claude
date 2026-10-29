import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { InviteForm, ChangePasswordForm } from "@/components/team-client";
import { formatDate } from "@/lib/format";
import { removeTeammate } from "./actions";

export default async function TeamPage() {
  const user = await requireUser();
  const members = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Team"
        description={`${members.length} login${members.length === 1 ? "" : "s"} for ${user.organization.name}`}
      />

      <div className="mb-8 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {members.map((m) => {
              const remove = removeTeammate.bind(null, m.id);
              return (
                <tr key={m.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 text-ink">{m.name}</td>
                  <td className="px-4 py-3 text-ink">{m.email}</td>
                  <td className="px-4 py-3 text-ink">
                    {m.role === "OWNER" ? (
                      <span className="rounded-full bg-success-surface px-2.5 py-1 text-xs font-medium text-brand">
                        Owner — full access
                      </span>
                    ) : (
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                        Staff
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {formatDate(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.role === "OWNER" && m.id !== user.id && (
                      <div className="flex items-center justify-end gap-4">
                        <Link
                          href={`/settings/team/${m.id}/edit`}
                          className="text-xs font-medium text-brand hover:underline"
                        >
                          Permissions
                        </Link>
                        <form action={remove}>
                          <button
                            type="submit"
                            className="text-xs font-medium text-danger-text hover:underline"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {user.role === "OWNER" ? (
        <>
          <h2 className="mb-3 text-lg font-semibold text-ink">
            Add a Teammate
          </h2>
          <div className="mb-8 rounded-xl border border-line bg-surface p-6">
            <InviteForm />
          </div>
        </>
      ) : (
        <p className="mb-8 text-sm text-ink-soft">
          Only the account owner can add or remove teammates, or change what
          they can access.
        </p>
      )}

      <h2 className="mb-3 text-lg font-semibold text-ink">My Account</h2>
      <div className="rounded-xl border border-line bg-surface p-6">
        <p className="mb-4 text-sm text-ink-soft">
          Change the password for your own login ({user.email}).
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
