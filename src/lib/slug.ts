import { prisma } from "@/lib/db";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "company";
}

/** Appends a short random suffix until the slug is free. */
export async function uniqueOrgSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let attempt = 0;
  while (await prisma.organization.findUnique({ where: { slug: candidate } })) {
    attempt += 1;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (attempt > 10) {
      candidate = `${base}-${Date.now().toString(36)}`;
      break;
    }
  }
  return candidate;
}
