"use client";

import type { ReactNode } from "react";
import { ArrowLeftIcon, CalendarCheckIcon, ClockIcon, Globe2Icon, LogInIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDate, formatIQD, formatTime, pluralizeSessions } from "@/lib/format";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  picks: number[];
  durationMinutes: number;
  price: number;
  pending: boolean;
  isSignedIn: boolean;
  onConfirm: () => void;
};

/** The full, clean summary — shown only when the member is ready to pay. */
function Summary({ title, picks, durationMinutes, price, pending, isSignedIn, onConfirm }: Omit<Props, "open" | "onOpenChange">) {
  const isPackage = picks.length > 1;
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-2">
        {picks.map((pick, i) => (
          <li key={pick} className="flex items-center gap-3 rounded-2xl border-2 border-foreground px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-sm font-extrabold text-background">
              {isPackage ? i + 1 : <CalendarCheckIcon className="size-4" />}
            </span>
            <span className="flex flex-col">
              <span className="font-extrabold">{formatDate(new Date(pick))}</span>
              <span className="text-sm text-muted-foreground">الساعة {formatTime(new Date(pick))}</span>
            </span>
          </li>
        ))}
      </ul>

      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-2xl bg-muted p-3">
          <dt className="text-xs text-muted-foreground">الخدمة</dt>
          <dd className="font-bold">{isPackage ? pluralizeSessions(picks.length) : "جلسة واحدة"}</dd>
        </div>
        <div className="rounded-2xl bg-muted p-3">
          <dt className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ClockIcon className="size-3" /> المدة
          </dt>
          <dd className="font-bold">{durationMinutes} دقيقة</dd>
        </div>
        <div className="rounded-2xl bg-muted p-3">
          <dt className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Globe2Icon className="size-3" /> التوقيت
          </dt>
          <dd className="font-bold">بغداد</dd>
        </div>
      </dl>

      <div className="flex items-baseline justify-between border-t-2 border-foreground pt-4">
        <span className="font-semibold">المجموع</span>
        <span className="text-3xl font-extrabold">{formatIQD(price)}</span>
      </div>

      {isSignedIn ? (
        <Button onClick={onConfirm} disabled={pending} className="h-12 rounded-full text-base">
          {pending && <Spinner />}
          تأكيد واختيار طريقة الدفع
          {!pending && <ArrowLeftIcon />}
        </Button>
      ) : (
        <Button onClick={onConfirm} className="h-12 rounded-full text-base">
          <LogInIcon className="rtl:-scale-x-100" />
          سجّل دخولك وكمّل الحجز
        </Button>
      )}
      <p className="-mt-2 text-center text-xs text-muted-foreground">
        {isSignedIn
          ? `نثبتلك الموعد مؤقتاً لحد ما تكمل الدفع · ${title}`
          : "بعد تسجيل الدخول نرجعك هنا وموعدك محفوظ."}
      </p>
    </div>
  );
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export function BookingReview({ open, onOpenChange, ...summary }: Props) {
  const isMobile = useIsMobile();
  const heading = "راجع حجزك";
  const description = summary.title;
  const body: ReactNode = <Summary {...summary} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-[2rem] border-t-2 border-foreground px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <span className="mx-auto mb-1 h-1.5 w-12 rounded-full bg-foreground/15" aria-hidden />
          <SheetHeader className="p-0 text-start">
            <SheetTitle className="text-xl font-extrabold">{heading}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[2rem] border-2 border-foreground p-6 sm:max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle className="text-xl font-extrabold">{heading}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
