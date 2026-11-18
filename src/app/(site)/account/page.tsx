import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, CrownIcon, SparklesIcon, WalletIcon } from "lucide-react";
import { requireViewer } from "@/lib/auth/dal";
import { formatDate, formatDateTime, formatIQD } from "@/lib/format";
import { getNextBooking } from "@/features/consultations/queries";
import { getPremiumStatus } from "@/features/premium/queries";
import { getWalletSummary } from "@/features/payments/wallet";
import { getMyExerciseHistory } from "@/features/exercises/queries";
import { SectionSkeleton } from "@/features/account/components/section";
import type { AttemptResult } from "@/features/exercises/definition";

function Tile({ href, icon: Icon, label, value, hint }: { href: string; icon: typeof WalletIcon; label: string; value: string; hint?: string }) {
  return (
    <Link
      href={href}
      className="sketch-card group flex flex-col gap-2 p-5 transition-[translate,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--foreground)]"
    >
      <span className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Icon className="size-4" /> {label}
        </span>
        <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-1" />
      </span>
      <span className="text-xl font-bold">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Link>
  );
}

async function Overview() {
  const viewer = await requireViewer("/account");
  const [premium, wallet, nextBooking, history] = await Promise.all([
    getPremiumStatus(viewer.id),
    getWalletSummary(viewer.id),
    getNextBooking(viewer.id),
    getMyExerciseHistory(viewer.id),
  ]);
  const latest = history.flatMap((h) => h.attempts).slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <p className="text-lg">
        هلا <span className="font-bold">{viewer.name.split(" ")[0]}</span>، شلونك اليوم؟
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          href="/account/subscription"
          icon={CrownIcon}
          label="بريميوم"
          value={premium.isPremium ? "فعّال" : "غير مشترك"}
          hint={premium.coveredUntil ? `لحد ${formatDate(premium.coveredUntil)}` : undefined}
        />
        <Tile href="/account/wallet" icon={WalletIcon} label="محفظتي" value={formatIQD(wallet.available)} />
        <Tile
          href="/account/consultations"
          icon={CalendarIcon}
          label="الجلسة القادمة"
          value={nextBooking ? formatDateTime(nextBooking.startsAt) : "ما عندك حجوزات بعد"}
          hint={nextBooking?.purchase.service.title}
        />
        <Tile
          href="/account/exercises"
          icon={SparklesIcon}
          label="التمارين"
          value={history.length === 1 ? "تمرين واحد" : `${history.length} تمارين`}
          hint={`${history.reduce((n, h) => n + h.attempts.length, 0)} محاولة محفوظة`}
        />
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold">آخر نتائجك</h2>
        {latest.length === 0 ? (
          <p className="text-muted-foreground">
            ما سويت تمارين بعد.{" "}
            <Link href="/exercises" className="font-semibold underline">
              ابدأ أول تمرين
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {latest.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/exercises/${a.exercise.slug}/attempts/${a.id}`}
                  className="flex items-center justify-between rounded-2xl border-2 border-foreground/15 px-4 py-3 transition-colors hover:border-foreground"
                >
                  <span className="font-semibold">{a.exercise.title}</span>
                  <span className="text-sm">
                    {(a.result as AttemptResult).title} · <span className="text-muted-foreground">{formatDate(a.completedAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<SectionSkeleton />}>
      <Overview />
    </Suspense>
  );
}
