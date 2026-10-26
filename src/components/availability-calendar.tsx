type BlockedRange = { startDate: Date; endDate: Date };

function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildBlockedSet(ranges: BlockedRange[]): Set<string> {
  const set = new Set<string>();
  for (const range of ranges) {
    const cursor = new Date(range.startDate);
    cursor.setHours(0, 0, 0, 0);
    const end = new Date(range.endDate);
    end.setHours(0, 0, 0, 0);
    // endDate is the drop-off day — it's free again for the next renter's pickup.
    while (cursor < end) {
      set.add(toKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return set;
}

function MonthGrid({ year, month, blocked, today }: { year: number; month: number; blocked: Set<string>; today: string }) {
  const first = new Date(year, month, 1);
  const label = first.toLocaleDateString("en-PH", { year: "numeric", month: "long" });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();
  const cells: (number | null)[] = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div>
      <p className="mb-2 text-center text-sm font-semibold text-slate-700">{label}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = toKey(new Date(year, month, day));
          const isPast = key < today;
          const isBlocked = blocked.has(key);
          return (
            <div
              key={i}
              className={
                "flex h-7 items-center justify-center rounded text-xs " +
                (isPast
                  ? "text-slate-300"
                  : isBlocked
                    ? "bg-red-100 text-red-700 line-through"
                    : "bg-emerald-50 text-emerald-800")
              }
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Read-only two-month availability view. Blocked = confirmed booking or an active hold. */
export function AvailabilityCalendar({ blockedRanges }: { blockedRanges: BlockedRange[] }) {
  const blocked = buildBlockedSet(blockedRanges);
  const now = new Date();
  const today = toKey(now);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <MonthGrid year={now.getFullYear()} month={now.getMonth()} blocked={blocked} today={today} />
        <MonthGrid
          year={now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()}
          month={(now.getMonth() + 1) % 12}
          blocked={blocked}
          today={today}
        />
      </div>
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-emerald-50" /> Available
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-red-100" /> Booked / Held
        </span>
      </div>
    </div>
  );
}
