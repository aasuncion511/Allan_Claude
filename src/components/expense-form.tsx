type Vehicle = { id: string; plateNumber: string; make: string; model: string };

const CATEGORIES = ["INSURANCE", "REGISTRATION", "CLEANING", "PARKING_TOLLS", "OTHER"];

export function ExpenseForm({
  action,
  vehicles,
  defaultVehicleId,
}: {
  action: (formData: FormData) => void;
  vehicles: Vehicle[];
  defaultVehicleId?: string;
}) {
  const field =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-500";
  const label = "mb-1 block text-sm font-medium text-slate-300";

  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Unit</label>
          <select
            name="vehicleId"
            required
            defaultValue={defaultVehicleId}
            className={field}
          >
            <option value="" disabled>
              Select a unit
            </option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plateNumber} — {v.make} {v.model}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Category</label>
          <select name="category" defaultValue="OTHER" className={field}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Amount (₱)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            required
            className={field}
          />
        </div>
        <div>
          <label className={label}>Date</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Vendor</label>
          <input name="vendor" className={field} />
        </div>
      </div>
      <div>
        <label className={label}>Description</label>
        <textarea name="description" rows={2} className={field} />
      </div>
      <p className="text-xs text-slate-500">
        For fuel or maintenance costs, use the dedicated logging forms on the
        unit&rsquo;s detail page — they track odometer readings for
        consumption and service-interval reporting.
      </p>
      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        Add Expense
      </button>
    </form>
  );
}
