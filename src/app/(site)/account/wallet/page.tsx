import type { Metadata } from "next";
import { Suspense } from "react";
import { WalletIcon } from "lucide-react";
import { requireViewer } from "@/lib/auth/dal";
import { cn } from "@/lib/utils";
import { formatDateTime, formatIQD } from "@/lib/format";
import { getSettings } from "@/features/settings/queries";
import { getWalletHistory, getWalletSummary } from "@/features/payments/wallet";
import { walletTxLabel } from "@/features/account/labels";
import { SectionHeader, SectionSkeleton } from "@/features/account/components/section";

export const metadata: Metadata = { title: "محفظتي" };

async function Wallet() {
  const viewer = await requireViewer("/account/wallet");
  const [summary, history, settings] = await Promise.all([
    getWalletSummary(viewer.id),
    getWalletHistory(viewer.id),
    getSettings("wallet"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-[1fr_1.3fr]">
        <div className="sketch-card flex flex-col gap-1 bg-foreground p-6 text-background">
          <span className="inline-flex items-center gap-2 text-sm text-background/70">
            <WalletIcon className="size-4" /> الرصيد المتاح
          </span>
          <span className="text-4xl font-extrabold">{formatIQD(summary.available)}</span>
          {summary.held > 0 && (
            <span className="text-sm text-background/70">{formatIQD(summary.held)} محجوز لدفع قيد التحقق</span>
          )}
        </div>
        <div className="rounded-3xl bg-muted p-6 text-sm leading-7">
          <p className="mb-1 font-bold">شلون أشحن محفظتي؟</p>
          <p className="text-muted-foreground">{settings.topupInstructions}</p>
        </div>
      </div>

      <section>
        <h3 className="mb-3 font-bold">الحركات</h3>
        {history.length === 0 ? (
          <p className="text-muted-foreground">ما في حركات بعد.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-3xl border-2 border-foreground">
            {history.map((tx) => (
              <li key={tx.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span className="flex flex-col">
                  <span className="font-semibold">
                    {walletTxLabel[tx.type]}
                    {tx.order && <span className="font-normal text-muted-foreground"> · طلب #{tx.order.number}</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</span>
                </span>
                <span className="flex flex-col items-end">
                  <span dir="ltr" className={cn("font-bold tabular-nums", tx.amount > 0 ? "text-success" : "")}>
                    {tx.amount > 0 ? "+" : "−"}
                    {formatIQD(Math.abs(tx.amount))}
                  </span>
                  <span className="text-xs text-muted-foreground">الرصيد {formatIQD(tx.balanceAfter)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function WalletPage() {
  return (
    <>
      <SectionHeader title="محفظتي" description="رصيدك تستخدمه لأي خدمة بالموقع." />
      <Suspense fallback={<SectionSkeleton />}>
        <Wallet />
      </Suspense>
    </>
  );
}
