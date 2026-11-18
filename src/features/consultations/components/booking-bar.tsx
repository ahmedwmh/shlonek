"use client";

import { AnimatePresence, m } from "motion/react";
import { ArrowLeftIcon, CalendarCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIQD } from "@/lib/format";

type Props = { show: boolean; info: string; price: number; onContinue: () => void };

/**
 * The small "ready to pay" summary once the slot(s) are picked.
 * Phones: floats at the bottom of the screen (always reachable).
 * Desktop: sits as a card right under the booking card — easy to notice, no overlay.
 */
export function BookingBar({ show, info, price, onContinue }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Phones */}
          <m.div
            key="floating"
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-xl lg:hidden"
          >
            <div className="flex items-center gap-3 rounded-full border-2 border-foreground bg-background/95 py-2 ps-4 pe-2 shadow-[4px_4px_0_0_var(--foreground)] backdrop-blur">
              <button type="button" onClick={onContinue} className="flex min-w-0 flex-1 flex-col text-start" aria-label="عرض ملخص الحجز">
                <span className="truncate text-xs text-muted-foreground">{info}</span>
                <span className="text-base font-extrabold">{formatIQD(price)}</span>
              </button>
              <Button onClick={onContinue} className="h-11 shrink-0 rounded-full px-5 text-base">
                متابعة
              </Button>
            </div>
          </m.div>

          {/* Desktop */}
          <m.div
            key="inline"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="hidden lg:block"
          >
            <div className="sketch-card flex items-center gap-5 px-6 py-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground text-background">
                <CalendarCheckIcon className="size-6" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm text-muted-foreground">موعدك</span>
                <span className="truncate text-lg font-extrabold">{info}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-sm text-muted-foreground">المجموع</span>
                <span className="text-2xl font-extrabold">{formatIQD(price)}</span>
              </div>
              <Button onClick={onContinue} className="h-12 rounded-full px-7 text-base">
                متابعة للدفع
                <ArrowLeftIcon />
              </Button>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
