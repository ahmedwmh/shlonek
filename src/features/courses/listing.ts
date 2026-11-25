/** Tabs and filters of the courses page (shared by the server page, the action and the client). */

export type CourseTab = "courses" | "workshops";
export type CourseFilter = "all" | "free" | "paid" | "public" | "premium";

export const COURSE_PAGE_SIZE = 9;

export const filtersFor: Record<CourseTab, { id: CourseFilter; label: string }[]> = {
  courses: [
    { id: "all", label: "الكل" },
    { id: "free", label: "مجاني" },
    { id: "paid", label: "مدفوع" },
  ],
  workshops: [
    { id: "all", label: "الكل" },
    { id: "public", label: "عامة" },
    { id: "premium", label: "بريميوم" },
  ],
};

/** Unknown or mismatched values fall back to a sensible view; an empty courses tab opens on workshops. */
export function normalizeListing(
  tab: unknown,
  filter: unknown,
  counts: { courses: number; workshops: number },
): { tab: CourseTab; filter: CourseFilter } {
  const t: CourseTab =
    tab === "courses" || tab === "workshops" ? tab : counts.courses === 0 && counts.workshops > 0 ? "workshops" : "courses";
  const f = filtersFor[t].some((x) => x.id === filter) ? (filter as CourseFilter) : "all";
  return { tab: t, filter: f };
}

export function accessFor(filter: CourseFilter) {
  if (filter === "free" || filter === "public") return "FREE" as const;
  if (filter === "paid") return "PAID" as const;
  if (filter === "premium") return "PREMIUM" as const;
  return undefined;
}
