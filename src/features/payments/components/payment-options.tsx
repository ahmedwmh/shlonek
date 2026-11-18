"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { CreditCardIcon, TimerIcon, WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { formatIQD } from "@/lib/format";
import { useCountdown } from "@/hooks/use-countdown";
import { payWithGateway, payWithWallet } from "../actions";
import { splitPayment } from "../split";

type Props = {
  orderId: string;
  total: number;
  walletAvailable: number;
  gatewayEnabled: boolean;
  expiresAt: string | null;
  topupInstructions: string;
};

/**
 * Payment choice. The wallet pays first; if it can't cover everything and Wayl is
 * active, the member sees the remaining amount and pays it on Wayl.
 */
export function PaymentOptions({ orderId, total, walletAvailable, gatewayEnabled, expiresAt, topupInstructions }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [method, setMethod] = useState<"wallet" | "gateway" | null>(null);
  const [useWallet, setUseWallet] = useState(walletAvailable > 0);
  const countdown = useCountdown(expiresAt);

  const coversAll = walletAvailable >= total;
  const split = splitPayment(total, walletAvailable, useWallet);
  const shortfall = Math.max(0, total - walletAvailable);

  const payWallet = () => {
    setMethod("wallet");
    start(async () => {
      const result = await payWithWallet(orderId);
      if (result.ok) router.push(`/checkout/${orderId}/result`);
      else toast.error(result.error);
    });
  };

  const payGateway = () => {
    setMethod("gateway");
    start(async () => {
      const result = await payWithGateway(orderId, useWallet);
      if (result.ok) window.location.assign(result.data.url);
      else toast.error(result.error);
    });
  };

  if (countdown.expired) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted p-6 text-center">
        <TimerIcon className="size-6" />
        <p className="font-semibold">انتهت مهلة الحجز المؤقت.</p>
        <Button asChild className="rounded-full">
          <Link href="/consultations">اختار موعد جديد</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {expiresAt && (
        <p className="inline-flex items-center gap-2 self-start rounded-full bg-muted px-3 py-1.5 text-sm" aria-live="polite">
          <TimerIcon className="size-4" />
          الموعد محجوز إلك مؤقتاً لمدة <span dir="ltr" className="font-bold tabular-nums">{countdown.label}</span>
        </p>
      )}

      {/* Wallet */}
      <div className={cn("rounded-2xl border-2 p-4", coversAll ? "border-foreground" : "border-foreground/20")}>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 font-semibold">
            <WalletIcon className="size-5" /> محفظتي
          </span>
          <span className="font-bold">{formatIQD(walletAvailable)}</span>
        </div>
        {coversAll ? (
          <Button onClick={payWallet} disabled={pending} className="mt-4 h-12 w-full rounded-full text-base">
            {pending && method === "wallet" && <Spinner />}
            ادفع {formatIQD(total)} من المحفظة
          </Button>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            رصيدك ما يكفي. الباقي: <span className="font-semibold text-foreground">{formatIQD(shortfall)}</span>
          </p>
        )}
      </div>

      {/* Gateway */}
      {gatewayEnabled ? (
        <div className={cn("rounded-2xl border-2 p-4", !coversAll ? "border-foreground" : "border-foreground/20")}>
          <span className="inline-flex items-center gap-2 font-semibold">
            <CreditCardIcon className="size-5" /> الدفع الإلكتروني (Wayl)
          </span>
          <p className="mt-1 text-xs text-muted-foreground">زين كاش، كي كارد، FIB والبطاقات.</p>
          {walletAvailable > 0 && (
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={useWallet} onCheckedChange={(v) => setUseWallet(v === true)} />
              استخدم رصيد محفظتي أول
            </label>
          )}
          <AnimatePresence initial={false}>
            {useWallet && split.walletAmount > 0 && (
              <m.dl
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 grid grid-cols-2 gap-y-1 overflow-hidden rounded-xl bg-muted p-3 text-sm"
              >
                <dt>من المحفظة</dt>
                <dd className="text-end font-semibold">{formatIQD(split.walletAmount)}</dd>
                <dt>الباقي عبر Wayl</dt>
                <dd className="text-end font-semibold">{formatIQD(split.gatewayAmount)}</dd>
                {split.walletAmount + split.gatewayAmount === total && split.gatewayAmount > total - walletAvailable && (
                  <dd className="col-span-2 mt-1 text-xs text-muted-foreground">
                    أقل مبلغ للدفع الإلكتروني 1,000 د.ع، فخلّينا الفرق بمحفظتك.
                  </dd>
                )}
              </m.dl>
            )}
          </AnimatePresence>
          <Button
            onClick={payGateway}
            disabled={pending}
            variant={coversAll ? "outline" : "default"}
            className={cn("mt-4 h-12 w-full rounded-full text-base", coversAll && "border-2 border-foreground")}
          >
            {pending && method === "gateway" && <Spinner />}
            ادفع {formatIQD(split.gatewayAmount)} عبر Wayl
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            جزء المحفظة ما ينسحب إلا بعد ما يتأكد الدفع.
          </p>
        </div>
      ) : (
        !coversAll && (
          <div className="rounded-2xl bg-muted p-4 text-sm leading-7">
            <p className="font-semibold">شلون أشحن محفظتي؟</p>
            <p className="text-muted-foreground">{topupInstructions}</p>
            <Button asChild variant="link" className="h-auto p-0">
              <Link href="/about#contact">معلومات التواصل</Link>
            </Button>
          </div>
        )
      )}
    </div>
  );
}
