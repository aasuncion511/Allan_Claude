const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/**
 * Reads an uploaded image file from a FormData field into a data: URI, or
 * null if absent/invalid/oversize. Stored inline on the record (no object
 * storage/CDN needed) — keep maxBytes small since it rides along in every
 * query that selects the field.
 */
export async function readImageUpload(
  formData: FormData,
  fieldName: string,
  maxBytes = 1.5 * 1024 * 1024
): Promise<string | null> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > maxBytes) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

/**
 * Same as readImageUpload but for a <input type="file" multiple> field —
 * used for inspection condition photos. Invalid/oversize files are silently
 * skipped rather than failing the whole submission, up to maxCount.
 */
export async function readImageUploads(
  formData: FormData,
  fieldName: string,
  maxBytes = 1.5 * 1024 * 1024,
  maxCount = 8
): Promise<string[]> {
  const files = formData.getAll(fieldName).filter((f): f is File => f instanceof File && f.size > 0);
  const results: string[] = [];
  for (const file of files.slice(0, maxCount)) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > maxBytes) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    results.push(`data:${file.type};base64,${buffer.toString("base64")}`);
  }
  return results;
}
