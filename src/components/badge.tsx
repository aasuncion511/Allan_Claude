const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-400",
  BOOKED: "bg-sky-500/15 text-sky-400",
  RESERVED: "bg-amber-500/15 text-amber-400",
  MAINTENANCE: "bg-orange-500/15 text-orange-400",
  OUT_OF_SERVICE: "bg-red-500/15 text-red-400",
  ACTIVE: "bg-sky-500/15 text-sky-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-400",
  CANCELLED: "bg-slate-500/15 text-slate-400",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-500/15 text-slate-400";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
