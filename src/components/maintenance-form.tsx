type Vehicle = { id: string; plateNumber: string; make: string; model: string };

export function MaintenanceForm({
  action,
  vehicles,
  defaultVehicleId,
}: {
  action: (formData: FormData) => void;
  vehicles: Vehicle[];
  defaultVehicleId?: string;
}) {
  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-sm font-medium text-ink";

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
          <label className={label}>Service Type</label>
          <input
            name="type"
            required
            placeholder="Oil change, tire rotation…"
            className={field}
          />
        </div>
        <div>
          <label className={label}>Date Performed</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Cost (₱)</label>
          <input name="cost" type="number" step="0.01" className={field} />
        </div>
        <div>
          <label className={label}>Odometer (km)</label>
          <input name="odometer" type="number" className={field} />
        </div>
        <div>
          <label className={label}>Vendor / Shop</label>
          <input name="vendor" className={field} />
        </div>
        <div>
          <label className={label}>Next Due Date</label>
          <input name="nextDueDate" type="date" className={field} />
        </div>
        <div>
          <label className={label}>Next Due Odometer (km)</label>
          <input name="nextDueOdometer" type="number" className={field} />
        </div>
      </div>
      <div>
        <label className={label}>Notes</label>
        <textarea name="notes" rows={2} className={field} />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Log Maintenance
      </button>
    </form>
  );
}
