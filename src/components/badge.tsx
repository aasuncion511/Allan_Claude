const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-success-surface text-success-text",
  BOOKED: "bg-sky-50 text-sky-700",
  RESERVED: "bg-warning-surface text-warning-text",
  HOLD: "bg-violet-50 text-violet-700",
  PAYMENT_PENDING: "bg-warning-surface text-warning-text",
  MAINTENANCE: "bg-orange-50 text-orange-700",
  OUT_OF_SERVICE: "bg-danger-surface text-danger-text",
  ACTIVE: "bg-sky-50 text-sky-700",
  COMPLETED: "bg-success-surface text-success-text",
  CANCELLED: "bg-canvas text-ink-soft",
  NEW: "bg-warning-surface text-warning-text",
  CONTACTED: "bg-sky-50 text-sky-700",
  CONVERTED: "bg-success-surface text-success-text",
  CLOSED: "bg-canvas text-ink-soft",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-canvas text-ink-soft";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
