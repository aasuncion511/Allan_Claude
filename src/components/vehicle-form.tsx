const STATUS_OPTIONS = [
  "AVAILABLE",
  "BOOKED",
  "RESERVED",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
];

const CATEGORY_OPTIONS = ["Sedan", "SUV", "MPV", "Van", "Pickup", "Hatchback"];
const TRANSMISSION_OPTIONS = ["Automatic", "Manual"];

type VehicleDefaults = {
  plateNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string | null;
  category?: string | null;
  seats?: number | null;
  transmission?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  featured?: boolean;
  dailyRate?: number;
  status?: string;
  odometer?: number;
  notes?: string | null;
};

export function VehicleForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaults?: VehicleDefaults;
  submitLabel: string;
}) {
  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-sm font-medium text-ink";

  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Plate Number</label>
          <input
            name="plateNumber"
            required
            defaultValue={defaults?.plateNumber}
            className={field}
            placeholder="ABC 1234"
          />
        </div>
        <div>
          <label className={label}>Status</label>
          <select
            name="status"
            defaultValue={defaults?.status ?? "AVAILABLE"}
            className={field}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Make</label>
          <input
            name="make"
            required
            defaultValue={defaults?.make}
            className={field}
            placeholder="Toyota"
          />
        </div>
        <div>
          <label className={label}>Model</label>
          <input
            name="model"
            required
            defaultValue={defaults?.model}
            className={field}
            placeholder="Vios"
          />
        </div>
        <div>
          <label className={label}>Year</label>
          <input
            name="year"
            type="number"
            required
            defaultValue={defaults?.year ?? new Date().getFullYear()}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Color</label>
          <input
            name="color"
            defaultValue={defaults?.color ?? ""}
            className={field}
            placeholder="White"
          />
        </div>
        <div>
          <label className={label}>Daily Rate (₱)</label>
          <input
            name="dailyRate"
            type="number"
            step="0.01"
            required
            defaultValue={defaults?.dailyRate}
            className={field}
            placeholder="2000"
          />
        </div>
        <div>
          <label className={label}>Odometer (km)</label>
          <input
            name="odometer"
            type="number"
            defaultValue={defaults?.odometer ?? 0}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Category</label>
          <select name="category" defaultValue={defaults?.category ?? ""} className={field}>
            <option value="">—</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Seats</label>
          <input
            name="seats"
            type="number"
            min={1}
            defaultValue={defaults?.seats ?? ""}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Transmission</label>
          <select
            name="transmission"
            defaultValue={defaults?.transmission ?? ""}
            className={field}
          >
            <option value="">—</option>
            {TRANSMISSION_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center">
          <label className="mt-5 flex items-center gap-2 text-sm text-ink">
            <input
              name="featured"
              type="checkbox"
              defaultChecked={defaults?.featured ?? false}
              className="h-4 w-4 rounded border-line bg-surface"
            />
            Feature on storefront homepage
          </label>
        </div>
      </div>
      <div>
        <label className={label}>Photo URL (optional)</label>
        <input
          name="photoUrl"
          defaultValue={defaults?.photoUrl ?? ""}
          className={field}
          placeholder="https://…"
        />
      </div>
      <div>
        <label className={label}>Public description (shown to renters)</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={defaults?.description ?? ""}
          className={field}
        />
      </div>
      <div>
        <label className={label}>Internal Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaults?.notes ?? ""}
          className={field}
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        {submitLabel}
      </button>
    </form>
  );
}
