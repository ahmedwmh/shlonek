import type { Metadata } from "next";
import { Suspense } from "react";
import { Character } from "@/components/brand/character";
import { normalizeListing } from "@/features/courses/listing";
import { getCourseCounts, getCoursePage } from "@/features/courses/queries";
import { CourseBrowser } from "@/features/courses/components/course-browser";
import { CourseCardSkeleton } from "@/features/courses/components/course-card";

export const metadata: Metadata = {
  alternates: { canonical: "/courses" },
  title: "الكورسات والورشات",
  description: "كورسات مجانية ومدفوعة، وورشات مسجّلة تساعدك تفهم نفسك وعلاقاتك وتحوّل الفهم لخطوات.",
};

/** Reads the tab/filter from the URL (inside Suspense) and renders the first page. */
async function Listing({ searchParams }: PageProps<"/courses">) {
  const params = await searchParams;
  const counts = await getCourseCounts();
  const { tab, filter } = normalizeListing(params.tab, params.filter, counts);
  const initial = await getCoursePage(tab, filter, 0);
  return <CourseBrowser tab={tab} filter={filter} counts={counts} initial={initial} />;
}

function ListingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-12 w-64 animate-pulse rounded-full bg-muted" />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <CourseCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function CoursesPage(props: PageProps<"/courses">) {
  return (
    <div className="shell py-10 md:py-14">
      <header className="mb-10 flex flex-col-reverse items-center gap-6 md:flex-row md:justify-between">
        <div className="flex max-w-xl flex-col gap-3 text-center md:text-start">
          <h1 className="text-4xl font-bold md:text-5xl">الكورسات والورشات</h1>
          <p className="text-lg leading-8 text-muted-foreground">
            كورسات تمشي وياك خطوة بخطوة، وورشات قصيرة بمحاضرة أو ثنتين. كلشي تبدي بيه أو تشتريه يبقى بـ«كورساتي» داخل حسابك.
          </p>
        </div>
        <Character name="relaxed" className="h-40 w-auto md:h-52" />
      </header>
      <Suspense fallback={<ListingSkeleton />}>
        <Listing {...props} />
      </Suspense>
    </div>
  );
}
