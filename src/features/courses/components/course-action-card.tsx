import Link from "next/link";
import { CheckCircle2Icon, CrownIcon, InfinityIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatIQD } from "@/lib/format";
import { courseGate, ownershipExpired, ownsCourse, priceFor, type ViewerFacts } from "../access";
import { lessonPath } from "../cover";
import type { CourseDetail } from "../queries";
import { BuyCourseButton, SignInButton, WatchButton } from "./course-buttons";

const big = "h-12 w-full rounded-full text-base";

/**
 * Price and the one next step for THIS viewer: sign in · buy · watch · upgrade.
 * Rendered per request on the server; prices shown here are recomputed at checkout.
 */
export function CourseActionCard({
  course,
  facts,
  firstLessonId,
  playHereLessonId,
  waylActive,
}: {
  course: CourseDetail;
  facts: ViewerFacts;
  /** Where «ابدأ/تابع» goes: the first lesson the viewer can open (after the intro). */
  firstLessonId?: string;
  /** Single-video content plays in the page's main player instead of navigating. */
  playHereLessonId?: string;
  waylActive: boolean;
}) {
  const gate = courseGate(course, facts);
  const isWorkshop = course.kind === "WORKSHOP";
  const noun = isWorkshop ? "الورشة" : "الكورس";
  const href = firstLessonId ? lessonPath(course.slug, firstLessonId) : "#";
  const owns = course.access === "PAID" && ownsCourse(facts);

  return (
    <div className="sketch-card flex flex-col gap-5 p-6">
      {course.access !== "PAID" ? (
        <FreeLine course={course} />
      ) : owns ? (
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-2 text-2xl font-extrabold">
            <CheckCircle2Icon className="size-6" /> {noun} بكورساتك
          </span>
          <span className="text-sm text-muted-foreground">
            {facts.enrollment?.endsAt ? `متاح لك لحد ${formatDate(facts.enrollment.endsAt)}.` : "متاح لك بدون مدة انتهاء."}
          </span>
        </div>
      ) : (
        <PaidPrice course={course} facts={facts} />
      )}

      {gate === "ok" ? (
        course.access === "PAID" ? (
          <Button asChild className={big}>
            <Link href={href}>{facts.isStaff && !owns ? "مراجعة المحتوى" : "تابع المشاهدة"}</Link>
          </Button>
        ) : (
          <WatchButton courseId={course.id} enrolled={Boolean(facts.enrollment)} href={href} playLessonId={playHereLessonId} isSignedIn>
            {playHereLessonId
              ? isWorkshop
                ? "شاهد الورشة"
                : "شاهد الكورس"
              : facts.enrollment
                ? "تابع المشاهدة"
                : "ابدأ الكورس مجاناً"}
          </WatchButton>
        )
      ) : gate === "closed" ? (
        <p className="rounded-2xl bg-muted px-4 py-3 leading-7 text-muted-foreground">
          {noun} ما عاد متاح للانضمام أو الشراء. اللي عندهم بكورساتهم يگدرون يكملون المشاهدة.
        </p>
      ) : gate === "login" ? (
        <SignInButton reason={course.access === "PAID" ? "سجّل دخولك حتى تشتري الكورس." : "سجّل دخولك حتى تبدأ. التسجيل مجاني."}>
          {course.access === "PAID" ? "سجّل دخولك واشتري" : `سجّل دخولك وشاهد ${noun}`}
        </SignInButton>
      ) : gate === "premium" ? (
        <Button asChild className={big}>
          <Link href="/premium">
            <CrownIcon /> اشترك ببريميوم
          </Link>
        </Button>
      ) : (
        <BuyCourseButton courseId={course.id} isSignedIn={facts.signedIn}>
          {ownershipExpired(facts) ? "جدّد الوصول" : "اشتري الكورس"}
        </BuyCourseButton>
      )}

      <ul className="flex flex-col gap-2.5 border-t pt-4 text-sm text-muted-foreground">
        {facts.isStaff && (
          <li className="flex items-center gap-2">
            <SparklesIcon className="size-4 shrink-0" /> أنت من الفريق، تشوف كل المحتوى للمراجعة.
          </li>
        )}
        {course.access === "PAID" && !owns && (
          <li className="flex items-center gap-2">
            <InfinityIcon className="size-4 shrink-0" />
            {course.accessDays ? `الوصول ${course.accessDays} يوم من تاريخ الشراء` : "وصول دائم بعد الشراء"}
          </li>
        )}
        {course.access === "PAID" && !owns && (
          <li className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 shrink-0" />
            {waylActive ? "ادفع من محفظتك بالموقع أو إلكترونياً عبر Wayl." : "الدفع من محفظتك بالموقع."}
          </li>
        )}
        {course.access === "PAID" && (
          <li className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 shrink-0" /> الفيديو التعريفي مجاني للجميع.
          </li>
        )}
        {course.access === "PREMIUM" && !facts.isPremium && (
          <li className="flex items-center gap-2">
            <CrownIcon className="size-4 shrink-0" /> بريميوم يفتح كل ورشات بريميوم طول مدة اشتراكك.
          </li>
        )}
        {course.access !== "PAID" &&
          (facts.enrollment ? (
            <li className="flex items-center gap-2 font-semibold text-foreground">
              <CheckCircle2Icon className="size-4 shrink-0" /> موجودة بكورساتك، ترجعلها من أي جهاز.
            </li>
          ) : (
            course.access === "FREE" && (
              <li className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 shrink-0" /> تنحفظ بـ«كورساتي» أول ما تشاهدها.
              </li>
            )
          ))}
      </ul>
    </div>
  );
}

function FreeLine({ course }: { course: CourseDetail }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-3xl font-extrabold">{course.access === "PREMIUM" ? "مجانية لبريميوم" : "مجاني"}</span>
      <span className="text-sm text-muted-foreground">
        {course.access === "PREMIUM"
          ? "تنفتح لكل مشترك بريميوم فعّال."
          : course.kind === "WORKSHOP"
            ? "متاحة لكل الحسابات المسجلة، بدون دفع."
            : "المحتوى كامل لكل الحسابات المسجلة، بدون دفع."}
      </span>
    </div>
  );
}

function PaidPrice({ course, facts }: { course: CourseDetail; facts: ViewerFacts }) {
  const forViewer = priceFor(course, facts.isPremium)!;
  const hasPremiumPrice = course.premiumPrice !== null && course.premiumPrice < (course.price ?? 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-extrabold tabular-nums">{formatIQD(forViewer.final)}</span>
        {forViewer.discount > 0 && <span className="text-muted-foreground tabular-nums line-through">{formatIQD(forViewer.original)}</span>}
      </div>
      {forViewer.discount > 0 ? (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">
          <CrownIcon className="size-3.5" /> سعر بريميوم · وفّرت {formatIQD(forViewer.discount)}
        </span>
      ) : (
        hasPremiumPrice &&
        !facts.isPremium && (
          <Link href="/premium" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:underline">
            <CrownIcon className="size-4" /> لمشتركي بريميوم بـ {formatIQD(course.premiumPrice!)}
          </Link>
        )
      )}
    </div>
  );
}
