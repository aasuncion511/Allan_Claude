type CustomerDefaults = {
  name?: string;
  email?: string | null;
  phone?: string;
  address?: string | null;
  driverLicense?: string | null;
  notes?: string | null;
};

export function CustomerForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  defaults?: CustomerDefaults;
  submitLabel: string;
}) {
  const field =
    "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-500";
  const label = "mb-1 block text-sm font-medium text-slate-300";

  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label}>Full Name</label>
          <input
            name="name"
            required
            defaultValue={defaults?.name}
            className={field}
            placeholder="Juan Dela Cruz"
          />
        </div>
        <div>
          <label className={label}>Phone</label>
          <input
            name="phone"
            required
            defaultValue={defaults?.phone}
            className={field}
            placeholder="+63 912 345 6789"
          />
        </div>
        <div>
          <label className={label}>Email</label>
          <input
            name="email"
            type="email"
            defaultValue={defaults?.email ?? ""}
            className={field}
            placeholder="juan@example.com"
          />
        </div>
        <div>
          <label className={label}>Driver&rsquo;s License No.</label>
          <input
            name="driverLicense"
            defaultValue={defaults?.driverLicense ?? ""}
            className={field}
          />
        </div>
      </div>
      <div>
        <label className={label}>Address</label>
        <input
          name="address"
          defaultValue={defaults?.address ?? ""}
          className={field}
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
