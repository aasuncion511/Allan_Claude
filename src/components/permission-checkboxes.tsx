import { PERMISSION_KEYS, PERMISSION_LABELS, type PermissionMap } from "@/lib/permissions";

export function PermissionCheckboxes({ defaults }: { defaults?: PermissionMap }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 block text-sm font-medium text-ink">
        What can this person access?
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PERMISSION_KEYS.map((key) => (
          <label
            key={key}
            className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <input
              type="checkbox"
              name={`perm_${key}`}
              defaultChecked={defaults?.[key] === true}
              className="h-4 w-4 rounded border-line bg-surface"
            />
            {PERMISSION_LABELS[key]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
