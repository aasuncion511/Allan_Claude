const STATUS_OPTIONS = [
  "AVAILABLE",
  "BOOKED",
  "RESERVED",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
];

type VehicleDefaults = {
  plateNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string | null;
  photoUrl?: string | null;
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
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-500";
  const label = "mb-1 block text-sm font-medium text-slate-300";

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
        <label className={label}>Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={defaults?.notes ?? ""}
          className={field}
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        {submitLabel}
      </button>
    </form>
  );
}
