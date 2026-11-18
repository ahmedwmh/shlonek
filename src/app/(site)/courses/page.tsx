import type { Metadata } from "next";
import Link from "next/link";
import { Character } from "@/components/brand/character";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  alternates: { canonical: "/courses" },
  title: "الكورسات",
  description: "كورسات وتجارب عملية — قريباً.",
};

/** Courses are planned for after launch (PROJECT_BRIEF §4.11). */
export default function CoursesPage() {
  return (
    <div className="shell flex flex-col items-center gap-6 py-16 text-center md:py-24">
      <Character name="relaxed" className="h-48 w-auto" />
      <span className="rounded-full border-2 border-foreground px-4 py-1 text-sm font-bold">قريباً</span>
      <h1 className="text-4xl font-bold md:text-5xl">عيش حياتك</h1>
      <p className="max-w-xl text-lg leading-8 text-muted-foreground">
        كورسات وتجارب عملية تحوّل فهمك لنفسك إلى خطوات بحياتك اليومية. دا نحضّرها هسه، وراح تنزل قريباً.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild className="h-11 rounded-full px-6">
          <Link href="/exercises">جرّب التمارين</Link>
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-full border-2 border-foreground px-6">
          <Link href="/consultations">احجز استشارة</Link>
        </Button>
      </div>
    </div>
  );
}
