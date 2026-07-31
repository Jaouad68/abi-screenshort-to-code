import { prisma } from "@/lib/prisma";

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Finds a slug for `base` that isn't already taken, appending -2, -3, ... if needed. */
export async function uniqueSalonSlug(base: string): Promise<string> {
  const root = slugify(base) || "salon";
  let slug = root;
  let i = 1;
  while (await prisma.salon.findUnique({ where: { slug } })) {
    i += 1;
    slug = `${root}-${i}`;
  }
  return slug;
}
