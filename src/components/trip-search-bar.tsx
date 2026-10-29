/** Plain HTML GET form — no client JS needed, works even with JS disabled.
 *  Submits straight to the fleet listing page with the chosen dates. */
export function TripSearchBar({
  slug,
  defaultStart,
  defaultEnd,
  className,
}: {
  slug: string;
  defaultStart?: string;
  defaultEnd?: string;
  className?: string;
}) {
  const field =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-medium text-ink-soft";

  return (
    <form
      action={`/r/${slug}/fleet`}
      method="get"
      className={`grid grid-cols-1 gap-3 rounded-xl border border-line bg-white p-4 shadow-lg sm:grid-cols-[1fr_1fr_auto] ${className ?? ""}`}
    >
      <div>
        <label className={label}>Pick-up Date</label>
        <input type="date" name="start" defaultValue={defaultStart} required className={field} />
      </div>
      <div>
        <label className={label}>Return Date</label>
        <input type="date" name="end" defaultValue={defaultEnd} required className={field} />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark sm:w-auto"
        >
          Search Available Cars
        </button>
      </div>
    </form>
  );
}
