import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireViewer } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { getMyLibrary } from "@/features/courses/queries";
import { isPremiumMember } from "@/features/premium/queries";
import { kindLabel } from "@/features/courses/components/course-badges";
import { CourseCover } from "@/features/courses/components/course-card";
import { coursePath } from "@/features/courses/cover";
import { EmptyState, SectionHeader, SectionSkeleton, StatusPill } from "@/features/account/components/section";

export const metadata: Metadata = { title: "كورساتي", robots: { index: false } };

async function Library() {
  const viewer = await requireViewer("/account/courses");
  const [items, isPremium] = await Promise.all([getMyLibrary(viewer.id), isPremiumMember(viewer.id)]);
  const now = new Date();

  if (items.length === 0) {
    return <EmptyState title="ما عندك كورسات بعد. الكورسات والورشات اللي تشاهدها أو تشتريها تظهر هنا." href="/courses" cta="تصفّح الكورسات والورشات" character="relaxed" />;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map(({ course, endsAt, source }) => {
        const expired = Boolean(endsAt && endsAt <= now);
        const premiumLocked = course.access === "PREMIUM" && !isPremium;
        const status = expired
          ? "انتهت مدة الوصول"
          : premiumLocked
            ? "تحتاج بريميوم فعّال"
            : source === "PURCHASE"
              ? endsAt
                ? `مشترى · لحد ${formatDate(endsAt)}`
                : "مشترى · وصول دائم"
              : source === "ADMIN"
                ? "مفعّل من الفريق"
                : "منضم";
        return (
          <li key={course.id}>
            <Link
              href={coursePath(course.slug)}
              className="sketch-card group flex h-full gap-4 overflow-hidden p-3 transition-[translate,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--foreground)]"
            >
              <CourseCover slug={course.slug} version={course.coverVersion} className="aspect-video w-32 shrink-0 rounded-2xl border-2 border-foreground object-cover" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
                <span className="text-xs font-bold text-muted-foreground">{kindLabel[course.kind]}</span>
                <span className="line-clamp-2 font-bold leading-6">{course.title}</span>
                <span className="mt-auto flex items-center justify-between gap-2">
                  <StatusPill tone={expired || premiumLocked ? "muted" : "neutral"}>{status}</StatusPill>
                  <ArrowLeftIcon className="size-4 shrink-0 transition-transform group-hover:-translate-x-1" />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function LibraryPage() {
  return (
    <>
      <SectionHeader title="كورساتي" description="الكورسات اللي اشتريتها أو بديت بيها، والورشات." />
      <Suspense fallback={<SectionSkeleton />}>
        <Library />
      </Suspense>
    </>
  );
}
