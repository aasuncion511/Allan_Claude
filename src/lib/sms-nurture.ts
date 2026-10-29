import { prisma } from "@/lib/db";
import { isGhlConfigured, sendGhlSms, upsertGhlContact } from "@/lib/ghl";
import { isSemaphoreConfigured, sendSemaphoreSms } from "@/lib/semaphore";
import { formatCurrency } from "@/lib/format";

/** Which provider a given org's nurture run sends through — resolved once per
 * org in runSmsNurtureForOrg, then threaded through every send. GHL (the
 * client's own bring-your-own location) takes priority when configured;
 * Semaphore is the shared platform fallback for orgs without one. */
type SmsChannel =
  | { type: "ghl"; config: { locationId: string; apiToken: string } }
  | { type: "semaphore" };

/** Fixed-date Philippine holidays. Movable ones (Holy Week, Lunar New Year,
 * National Heroes Day) aren't included — there's no admin UI yet to add
 * custom dates, so keep this to dates that never shift. */
const PH_FIXED_HOLIDAYS: { month: number; day: number; label: string }[] = [
  { month: 1, day: 1, label: "New Year's Day" },
  { month: 4, day: 9, label: "Araw ng Kagitingan" },
  { month: 5, day: 1, label: "Labor Day" },
  { month: 6, day: 12, label: "Independence Day" },
  { month: 8, day: 21, label: "Ninoy Aquino Day" },
  { month: 11, day: 1, label: "All Saints' Day" },
  { month: 11, day: 30, label: "Bonifacio Day" },
  { month: 12, day: 8, label: "Immaculate Conception" },
  { month: 12, day: 25, label: "Christmas Day" },
  { month: 12, day: 30, label: "Rizal Day" },
  { month: 12, day: 31, label: "Last Day of the Year" },
];

/** Today's calendar date in Philippine time, regardless of server timezone. */
function phToday(): { year: number; month: number; day: number; isoDate: string } {
  const isoDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day, isoDate };
}

function todayHoliday(): { label: string; isoDate: string } | null {
  const today = phToday();
  const match = PH_FIXED_HOLIDAYS.find((h) => h.month === today.month && h.day === today.day);
  return match ? { label: match.label, isoDate: today.isoDate } : null;
}

/** UTC-midnight boundaries for a PH calendar date N days from today — matches
 * how plain `<input type="date">` values are stored (new Date("YYYY-MM-DD")). */
function dateBoundsInDaysFromToday(daysFromToday: number) {
  const today = phToday();
  const start = new Date(Date.UTC(today.year, today.month - 1, today.day + daysFromToday));
  const end = new Date(Date.UTC(today.year, today.month - 1, today.day + daysFromToday + 1));
  return { start, end, isoDate: start.toISOString().slice(0, 10) };
}

type OrgForNurture = {
  id: string;
  name: string;
  ghlLocationId: string | null;
  ghlApiToken: string | null;
  smsRemindersEnabled: boolean;
  smsBirthdayGreetingsEnabled: boolean;
  smsHolidayGreetingsEnabled: boolean;
  smsInactivityMonths: number;
};

type SendOutcome = { sent: number; failed: number; skipped: number };

async function sendAndLog(
  channel: SmsChannel,
  org: { id: string },
  customer: { id: string; name: string; email: string | null; phone: string },
  kind: "PICKUP_REMINDER" | "RETURN_REMINDER" | "BIRTHDAY" | "HOLIDAY",
  dedupeKey: string,
  message: string
): Promise<"sent" | "failed" | "skipped"> {
  const existing = await prisma.smsLog.findUnique({
    where: { organizationId_customerId_dedupeKey: { organizationId: org.id, customerId: customer.id, dedupeKey } },
  });
  if (existing) return "skipped";

  let result: { ok: true } | { ok: false; error: string };
  if (channel.type === "semaphore") {
    result = await sendSemaphoreSms({ to: customer.phone, message });
  } else {
    const contactId = await upsertGhlContact(channel.config, {
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone,
      source: "Fleet Manager SMS nurture",
    });
    if (!contactId) {
      await prisma.smsLog.create({
        data: {
          organizationId: org.id,
          customerId: customer.id,
          kind,
          dedupeKey,
          message,
          status: "FAILED",
          error: "Could not sync/find the customer as a GHL contact",
        },
      });
      return "failed";
    }
    result = await sendGhlSms(channel.config, { contactId, message });
  }

  await prisma.smsLog.create({
    data: {
      organizationId: org.id,
      customerId: customer.id,
      kind,
      dedupeKey,
      message,
      status: result.ok ? "SENT" : "FAILED",
      error: result.ok ? null : result.error,
    },
  });
  return result.ok ? "sent" : "failed";
}

async function runPickupReminders(org: OrgForNurture, channel: SmsChannel) {
  const outcome: SendOutcome = { sent: 0, failed: 0, skipped: 0 };
  const { start, end } = dateBoundsInDaysFromToday(1);
  const bookings = await prisma.booking.findMany({
    where: {
      organizationId: org.id,
      status: "RESERVED",
      pickupReminderSentAt: null,
      startDate: { gte: start, lt: end },
    },
    include: { customer: true, vehicle: true },
  });
  for (const booking of bookings) {
    if (!booking.customer.phone || booking.customer.smsOptOut) {
      outcome.skipped++;
      continue;
    }
    const message = `Hi ${booking.customer.name}! Reminder: your ${booking.vehicle.year} ${booking.vehicle.make} ${
      booking.vehicle.model
    } pickup is tomorrow${booking.startTime ? ` at ${booking.startTime}` : ""}. — ${org.name}`;
    const result = await sendAndLog(channel, org, booking.customer, "PICKUP_REMINDER", `pickup:${booking.id}`, message);
    if (result === "sent") {
      await prisma.booking.update({ where: { id: booking.id }, data: { pickupReminderSentAt: new Date() } });
    }
    outcome[result]++;
  }
  return outcome;
}

async function runReturnReminders(org: OrgForNurture, channel: SmsChannel) {
  const outcome: SendOutcome = { sent: 0, failed: 0, skipped: 0 };
  const { start, end } = dateBoundsInDaysFromToday(1);
  const bookings = await prisma.booking.findMany({
    where: {
      organizationId: org.id,
      status: "ACTIVE",
      returnReminderSentAt: null,
      endDate: { gte: start, lt: end },
    },
    include: { customer: true, vehicle: true },
  });
  for (const booking of bookings) {
    if (!booking.customer.phone || booking.customer.smsOptOut) {
      outcome.skipped++;
      continue;
    }
    const balance = Math.max(0, booking.totalAmount - booking.amountPaid);
    const balanceLine = balance > 0 ? ` Remaining balance: ${formatCurrency(balance)}.` : "";
    const message = `Hi ${booking.customer.name}! Reminder: your ${booking.vehicle.year} ${booking.vehicle.make} ${
      booking.vehicle.model
    } rental is due back tomorrow${booking.endTime ? ` at ${booking.endTime}` : ""}.${balanceLine} Thanks for renting with ${
      org.name
    }!`;
    const result = await sendAndLog(channel, org, booking.customer, "RETURN_REMINDER", `return:${booking.id}`, message);
    if (result === "sent") {
      await prisma.booking.update({ where: { id: booking.id }, data: { returnReminderSentAt: new Date() } });
    }
    outcome[result]++;
  }
  return outcome;
}

async function runBirthdayGreetings(org: OrgForNurture, channel: SmsChannel) {
  const outcome: SendOutcome = { sent: 0, failed: 0, skipped: 0 };
  const today = phToday();
  const customers = await prisma.customer.findMany({
    where: { organizationId: org.id, birthday: { not: null }, smsOptOut: false },
  });
  for (const customer of customers) {
    const bday = customer.birthday!;
    if (bday.getUTCMonth() + 1 !== today.month || bday.getUTCDate() !== today.day) continue;
    const message = `Happy Birthday, ${customer.name}! 🎉 Wishing you a wonderful day from all of us at ${org.name}.`;
    const result = await sendAndLog(channel, org, customer, "BIRTHDAY", `birthday:${today.year}`, message);
    outcome[result]++;
  }
  return outcome;
}

async function runHolidayGreetings(org: OrgForNurture, channel: SmsChannel) {
  const outcome: SendOutcome = { sent: 0, failed: 0, skipped: 0 };
  const holiday = todayHoliday();
  if (!holiday) return outcome;

  const customers = await prisma.customer.findMany({
    where: { organizationId: org.id, smsOptOut: false },
  });
  for (const customer of customers) {
    const message = `Happy ${holiday.label}! Wishing you and your family a wonderful celebration. — ${org.name}`;
    const result = await sendAndLog(
      channel,
      org,
      customer,
      "HOLIDAY",
      `holiday:${holiday.isoDate}`,
      message
    );
    outcome[result]++;
  }
  return outcome;
}

/** Opts out customers with no booking activity for org.smsInactivityMonths — "removes the number from the list" for nurture sends (does not delete the customer or their phone number, only stops automated SMS). */
async function runInactivityPurge(org: OrgForNurture): Promise<number> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - org.smsInactivityMonths);

  const customers = await prisma.customer.findMany({
    where: { organizationId: org.id, smsOptOut: false },
    include: { bookings: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } },
  });

  let purged = 0;
  for (const customer of customers) {
    const lastActivity = customer.bookings[0]?.createdAt ?? customer.createdAt;
    if (lastActivity < cutoff) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { smsOptOut: true, smsOptOutReason: `No activity for ${org.smsInactivityMonths}+ months` },
      });
      purged++;
    }
  }
  return purged;
}

/** GHL (the client's own location) is tried first when configured — it's
 * their existing CRM, already synced with contacts. Semaphore is the shared
 * platform fallback for orgs that haven't set up GHL, so nurture SMS still
 * goes out once SEMAPHORE_API_KEY is configured platform-wide. */
export async function runSmsNurtureForOrg(org: OrgForNurture) {
  const channel: SmsChannel | null = isGhlConfigured(org)
    ? { type: "ghl", config: { locationId: org.ghlLocationId!, apiToken: org.ghlApiToken! } }
    : isSemaphoreConfigured()
      ? { type: "semaphore" }
      : null;

  if (!channel) {
    return { organizationId: org.id, skipped: "No SMS provider configured (GHL or Semaphore)" as const };
  }

  const pickup = org.smsRemindersEnabled
    ? await runPickupReminders(org, channel)
    : { sent: 0, failed: 0, skipped: 0 };
  const returns = org.smsRemindersEnabled
    ? await runReturnReminders(org, channel)
    : { sent: 0, failed: 0, skipped: 0 };
  const birthdays = org.smsBirthdayGreetingsEnabled
    ? await runBirthdayGreetings(org, channel)
    : { sent: 0, failed: 0, skipped: 0 };
  const holidays = org.smsHolidayGreetingsEnabled
    ? await runHolidayGreetings(org, channel)
    : { sent: 0, failed: 0, skipped: 0 };
  const purged = await runInactivityPurge(org);

  return { organizationId: org.id, pickup, returns, birthdays, holidays, purged, channel: channel.type };
}
