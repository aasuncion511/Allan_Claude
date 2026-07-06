import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { InviteForm } from "@/components/team-client";
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

      <div className="mb-8 overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900">
            {members.map((m) => {
              const remove = removeTeammate.bind(null, m.id);
              return (
                <tr key={m.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-100">{m.name}</td>
                  <td className="px-4 py-3 text-slate-300">{m.email}</td>
                  <td className="px-4 py-3 text-slate-300">{m.role}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatDate(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.role === "OWNER" && m.id !== user.id && (
                      <form action={remove}>
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </form>
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
          <h2 className="mb-3 text-lg font-semibold text-slate-100">
            Add a Teammate
          </h2>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6">
            <InviteForm />
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">
          Only the account owner can add or remove teammates.
        </p>
      )}
    </div>
  );
}
