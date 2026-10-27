import { prisma } from "@/lib/db";
import { runSmsNurtureForOrg } from "@/lib/sms-nurture";
import { isCronAuthorized } from "@/lib/cron-auth";

/**
 * Daily entry point for automated SMS nurturing (pickup/return reminders,
 * birthday/holiday greetings, inactivity list cleanup) — see
 * src/lib/sms-nurture.ts. Call this once a day from an external scheduler
 * (e.g. a free cron-job.org task or a scheduled GitHub Action), since this
 * app has no built-in background job runner. See src/lib/cron-auth.ts for
 * how to authenticate the call.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const orgs = await prisma.organization.findMany({
    where: { ghlLocationId: { not: null }, ghlApiToken: { not: null } },
    select: {
      id: true,
      name: true,
      ghlLocationId: true,
      ghlApiToken: true,
      smsRemindersEnabled: true,
      smsBirthdayGreetingsEnabled: true,
      smsHolidayGreetingsEnabled: true,
      smsInactivityMonths: true,
    },
  });

  const results = [];
  for (const org of orgs) {
    results.push(await runSmsNurtureForOrg(org));
  }

  return Response.json({ ranAt: new Date().toISOString(), organizations: results.length, results });
}

export const POST = GET;
