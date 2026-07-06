"use client";

type Vehicle = {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  dailyRate: number;
};
type Customer = { id: string; name: string; phone: string };

type BookingDefaults = {
  vehicleId?: string;
  customerId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  status?: string;
  dailyRate?: number;
  securityDeposit?: number;
  amountPaid?: number;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  notes?: string | null;
};

function toDateInput(value?: Date | string) {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

export function BookingForm({
  action,
  vehicles,
  customers,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  vehicles: Vehicle[];
  customers: Customer[];
  defaults?: BookingDefaults;
  submitLabel: string;
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
            defaultValue={defaults?.vehicleId}
            className={field}
            onChange={(e) => {
              const form = e.currentTarget.form;
              if (!form) return;
              const option = e.currentTarget.selectedOptions[0];
              const rate = option?.dataset.rate;
              const rateInput = form.elements.namedItem(
                "dailyRate"
              ) as HTMLInputElement | null;
              if (rate && rateInput && !rateInput.value) {
                rateInput.value = rate;
              }
            }}
          >
            <option value="" disabled>
              Select a unit
            </option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id} data-rate={v.dailyRate}>
                {v.plateNumber} — {v.make} {v.model}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Customer</label>
          <select
            name="customerId"
            required
            defaultValue={defaults?.customerId}
            className={field}
          >
            <option value="" disabled>
              Select a customer
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Start Date</label>
          <input
            name="startDate"
            type="date"
            required
            defaultValue={toDateInput(defaults?.startDate)}
            className={field}
          />
        </div>
        <div>
          <label className={label}>End Date</label>
          <input
            name="endDate"
            type="date"
            required
            defaultValue={toDateInput(defaults?.endDate)}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Status</label>
          <select
            name="status"
            defaultValue={defaults?.status ?? "RESERVED"}
            className={field}
          >
            <option value="RESERVED">Reserved</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
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
          />
        </div>
        <div>
          <label className={label}>Security Deposit (₱)</label>
          <input
            name="securityDeposit"
            type="number"
            step="0.01"
            defaultValue={defaults?.securityDeposit ?? 0}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Amount Paid (₱)</label>
          <input
            name="amountPaid"
            type="number"
            step="0.01"
            defaultValue={defaults?.amountPaid ?? 0}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Pickup Location</label>
          <input
            name="pickupLocation"
            defaultValue={defaults?.pickupLocation ?? ""}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Drop-off Location</label>
          <input
            name="dropoffLocation"
            defaultValue={defaults?.dropoffLocation ?? ""}
            className={field}
          />
        </div>
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
      <p className="text-xs text-slate-500">
        Total amount is calculated automatically as daily rate × number of
        days.
      </p>
      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        {submitLabel}
      </button>
    </form>
  );
}
