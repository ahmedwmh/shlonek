import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckIcon, CrownIcon } from "lucide-react";
import { Character } from "@/components/brand/character";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/auth/dal";
import { formatDate, formatIQD } from "@/lib/format";
import { getSettings } from "@/features/settings/queries";
import { getActivePremiumPlans, getPremiumStatus } from "@/features/premium/queries";
import { PlanButton } from "@/features/premium/components/plan-button";

export const metadata: Metadata = {
  alternates: { canonical: "/premium" },
  title: "بريميوم",
  description: "افتح كل التمارين المميزة بالتاج. اشتراك لمدة محددة بدون تجديد تلقائي.",
};

type Plan = Awaited<ReturnType<typeof getActivePremiumPlans>>[number];

async function Plans({ plans }: { plans: Plan[] }) {
  const viewer = await getViewer();
  const status = viewer ? await getPremiumStatus(viewer.id) : null;

  return (
    <>
      {status?.isPremium && status.coveredUntil && (
        <p className="mb-6 rounded-2xl bg-foreground p-4 text-center font-semibold text-background">
          <CrownIcon className="me-2 inline size-5 align-[-0.15em]" />
          اشتراكك فعّال لحد {formatDate(status.coveredUntil)}. أي شراء جديد يبدي من بعد هالتاريخ.
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.id} className="sketch-card flex flex-col gap-4 p-7">
            <h2 className="text-2xl font-bold">{plan.name}</h2>
            <p className="text-4xl font-extrabold">{formatIQD(plan.price)}</p>
            <p className="text-sm text-muted-foreground">{plan.durationDays} يوم · تدفع مرة وحدة · بدون تجديد تلقائي</p>
            <PlanButton
              planId={plan.id}
              isSignedIn={Boolean(viewer)}
              label={status?.isPremium ? "مدّد اشتراكك" : "اشترك الآن"}
            />
          </article>
        ))}
      </div>
    </>
  );
}

export default async function PremiumPage() {
  const [plans, settings] = await Promise.all([getActivePremiumPlans(), getSettings("premium")]);

  return (
    <div className="shell max-w-4xl py-10 md:py-14">
      <header className="flex flex-col items-center gap-4 text-center">
        <Character name="curious" className="h-36 w-auto" />
        <h1 className="inline-flex items-center gap-3 text-4xl font-bold md:text-5xl">
          بريميوم
          <span className="grid size-11 place-items-center rounded-full bg-foreground text-background md:size-12">
            <CrownIcon className="size-6" />
          </span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          اشتراك لمدة محددة تدفعه مرة وحدة. ما يتجدد تلقائياً — من يخلص، تگدر تشتري مرة ثانية.
        </p>
      </header>

      <ul className="mx-auto mt-8 flex max-w-md flex-col gap-2">
        {settings.benefits.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <CheckIcon className="size-5 shrink-0" /> {b}
          </li>
        ))}
        <li className="text-sm text-muted-foreground">الاستشارات تُشترى بشكل مستقل ومو ضمن بريميوم.</li>
      </ul>

      <div className="mt-10">
        {plans.length === 0 ? (
          <p className="text-center text-muted-foreground">الاشتراك غير متاح حالياً.</p>
        ) : (
          <Suspense
            fallback={
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-64 rounded-3xl" />
                <Skeleton className="h-64 rounded-3xl" />
              </div>
            }
          >
            <Plans plans={plans} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
