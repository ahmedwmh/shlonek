import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { CrownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { getPremiumStatus } from "@/features/premium/queries";
import { getMyPremiumPeriods } from "@/features/account/queries";
import { SectionHeader, SectionSkeleton, StatusPill } from "@/features/account/components/section";

export const metadata: Metadata = { title: "اشتراكي" };

async function Subscription() {
  const viewer = await requireViewer("/account/subscription");
  const [status, periods] = await Promise.all([
    getPremiumStatus(viewer.id),
    getMyPremiumPeriods(viewer.id),
  ]);
  await connection();
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className={status.isPremium ? "sketch-card bg-foreground p-6 text-background" : "sketch-card p-6"}>
        <p className="inline-flex items-center gap-2 text-2xl font-bold">
          {status.isPremium && <CrownIcon className="size-6" />}
          {status.isPremium ? "بريميوم فعّال" : "ما عندك اشتراك فعّال"}
        </p>
        {status.coveredUntil && <p className="mt-1">لحد {formatDate(status.coveredUntil)} · بدون تجديد تلقائي</p>}
        {!status.isPremium && (
          <p className="mt-1 text-muted-foreground">نتائجك القديمة تبقى محفوظة. التمارين المدفوعة تنفتح من تشترك.</p>
        )}
        <Button asChild variant={status.isPremium ? "secondary" : "default"} className="mt-4 rounded-full">
          <Link href="/premium">{status.isPremium ? "مدّد اشتراكك" : "اشترك ببريميوم"}</Link>
        </Button>
      </div>

      {periods.length > 0 && (
        <section>
          <h3 className="mb-3 font-bold">سجل الاشتراكات</h3>
          <ul className="flex flex-col gap-2">
            {periods.map((p) => {
              const days = Math.round((p.endsAt.getTime() - p.startsAt.getTime()) / 86_400_000);
              // Ended by staff: under a day of use reads as cancelled, otherwise "ended early".
              const cancelled = Boolean(p.endedEarlyAt) && days < 1;
              const state = cancelled
                ? "ملغي"
                : p.endedEarlyAt
                  ? "انتهى مبكراً"
                  : p.startsAt > now
                    ? "قادم"
                    : p.endsAt > now
                      ? "فعّال"
                      : "منتهي";
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-foreground/15 px-4 py-3">
                  <span className="flex flex-col">
                    <span className="font-semibold">{p.plan?.name ?? "تفعيل من فريق شلونك"}</span>
                    {!cancelled && <span className="text-xs text-muted-foreground">{days} يوم</span>}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(p.startsAt)} ← {formatDate(p.endsAt)}
                  </span>
                  <StatusPill tone={state === "فعّال" ? "solid" : "muted"}>{state}</StatusPill>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <>
      <SectionHeader title="اشتراكي" />
      <Suspense fallback={<SectionSkeleton />}>
        <Subscription />
      </Suspense>
    </>
  );
}
