/**
 * URL slugs made from a course/workshop title, Arabic or English:
 *   "إدارة الضغوطات"            → "إدارة-الضغوطات"
 *   "Adobe Premiere Pro | كورس" → "adobe-premiere-pro-كورس"
 * Letters and digits of any script are kept; tashkeel, tatweel and punctuation are
 * dropped; spaces become single hyphens. Browsers show Arabic slugs as Arabic.
 */
const MAX = 80;

export function slugify(title: string): string {
  const slug = title
    .normalize("NFKC")
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "") // tashkeel, Quranic marks, tatweel
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX)
    .replace(/-+$/g, "");
  return slug || "course";
}

/** First free slug among base, base-2, base-3… (`taken` = slugs already used by other courses). */
export function firstFreeSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base.slice(0, MAX - String(n).length - 1)}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}
