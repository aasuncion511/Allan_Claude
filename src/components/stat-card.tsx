export function StatCard({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative" | "info" | "lead";
  hint?: string;
}) {
  if (tone === "lead") {
    return (
      <div className="rounded-xl bg-brand p-5 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-1 text-xs text-white/70">{hint}</p>}
      </div>
    );
  }

  const toneClasses: Record<string, string> = {
    default: "text-ink",
    positive: "text-success-text",
    negative: "text-danger-text",
    info: "text-sky-700",
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold ${toneClasses[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
