"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { CalendarDaysIcon, CheckIcon, ClockIcon, Globe2Icon, InfoIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate, formatTime, pluralizeSessions, PLATFORM_TIMEZONE } from "@/lib/format";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { useAuthGate } from "@/features/auth/hooks/use-auth-gate";
import { holdSlots } from "../actions";
import { baghdadDayStart } from "../package-weeks";
import { monthOf, todayKey } from "../lib/calendar";
import { useBookingSelection, type SlotTimes } from "../hooks/use-booking-selection";
import { MonthCalendar } from "./month-calendar";
import { TimeSlots } from "./time-slots";
import { BookingReview } from "./booking-review";
import { BookingBar } from "./booking-bar";
import { RESUME_PARAM, savePendingBooking, takePendingBooking } from "../lib/pending-booking";

type Service = { id: string; title: string; price: number; sessionsCount: number; durationMinutes: number; kind: "SINGLE" | "PACKAGE" };

const noon = (day: number) => new Date(day + 12 * 3_600_000);
const shortDay = new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: PLATFORM_TIMEZONE,
});

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["اختار اليوم", "اختار الوقت", "راجع وأكّد"];
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="خطوات الحجز">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = step > n;
        const current = step === n;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={current ? "step" : undefined}>
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full border-2 text-xs font-extrabold transition-colors",
                done || current ? "border-foreground bg-foreground text-background" : "border-foreground/20 text-muted-foreground",
              )}
            >
              {done ? <CheckIcon className="size-3.5" /> : n}
            </span>
            <span className={cn("hidden font-bold min-[420px]:inline", !current && !done && "text-muted-foreground")}>
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-0.5 w-4 rounded-full bg-foreground/15 sm:w-8" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Booking flow: calendar (every day shown, free ones marked) → that day's free
 * times → summary → (sign-in) → hold → checkout. Package: pick the first session,
 * weeks 2–4 are suggested and each one can be changed within its week.
 */
export function BookingWizard({ service, slots, isSignedIn }: { service: Service; slots: SlotTimes[]; isSignedIn: boolean }) {
  const router = useRouter();
  const gate = useAuthGate(isSignedIn);
  const [pending, startTransition] = useTransition();
  const sel = useBookingSelection(slots, service.sessionsCount);
  const isPackage = service.sessionsCount > 1;
  const timesRef = useRef<HTMLDivElement>(null);

  const [showLocal] = useState(
    () => typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone !== PLATFORM_TIMEZONE,
  );

  const availableDays = useMemo(() => new Set(sel.days.keys()), [sel.days]);
  const sessionMarks = useMemo(() => {
    if (!isPackage) return undefined;
    const map = new Map<number, number[]>();
    sel.picks.forEach((p, i) => {
      if (p == null) return;
      const d = baghdadDayStart(p);
      map.set(d, [...(map.get(d) ?? []), i + 1]);
    });
    return map;
  }, [isPackage, sel.picks]);

  const [reviewOpen, setReviewOpen] = useState(false);
  const first = sel.picks[0];
  const tinyInfo =
    first == null
      ? ""
      : `${isPackage ? `${pluralizeSessions(service.sessionsCount)} · تبدي ` : ""}${shortDay.format(new Date(first))} · ${formatTime(new Date(first))}`;

  const times = sel.activeDay != null ? (sel.days.get(sel.activeDay) ?? []) : [];
  const selectedTime = sel.picks[sel.activeSession] ?? null;

  const scrollTo = useSmoothScroll();
  const { selectDay } = sel;
  /** Picks the day, then (only if the times are off-screen, i.e. on phones) glides to them. */
  const handleSelectDay = useCallback(
    (day: number) => {
      selectDay(day);
      // Two frames: let the times panel render before measuring.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (timesRef.current) scrollTo(timesRef.current, { offset: 80 });
        }),
      );
    },
    [selectDay, scrollTo],
  );

  // Back from sign-in (?resume=1): restore the picks if still free and reopen the review.
  const { restore } = sel;
  useEffect(() => {
    if (!isSignedIn) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get(RESUME_PARAM) !== "1") return;
    params.delete(RESUME_PARAM);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);

    const saved = takePendingBooking(service.id);
    if (!saved) return;
    if (restore(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reopening the review once after the sign-in redirect
      setReviewOpen(true);
    } else {
      toast.error("الموعد اللي اخترته ما عاد متاح، اختار موعد ثاني.");
    }
  }, [isSignedIn, restore, service.id]);

  const confirm = () => {
    if (!sel.complete) return;
    if (!isSignedIn) {
      // Remember the picks, close the review (no stacked dialogs), sign in, come back here.
      savePendingBooking(service.id, sel.picks as number[]);
      setReviewOpen(false);
      gate({
        next: `${window.location.pathname}?${RESUME_PARAM}=1`,
        reason: "سجّل دخولك وراح نرجعك لنفس الموعد حتى تكمل الحجز.",
      });
      return;
    }
    startTransition(async () => {
      const result = await holdSlots({ serviceId: service.id, starts: sel.selectedIso });
      if (result.ok) router.push(`/checkout/${result.data.orderId}`);
      else {
        setReviewOpen(false);
        toast.error(result.error);
        router.refresh();
      }
    });
  };

  if (slots.length === 0 || sel.month == null || sel.lastDay == null) {
    return (
      <div className="sketch-card flex flex-col items-center gap-2 p-10 text-center">
        <CalendarDaysIcon className="mb-2 size-9" />
        <p className="text-lg font-bold">ما في مواعيد متاحة حالياً.</p>
        <p className="text-sm text-muted-foreground">ارجعلنا بعد يومين، أو تواصل ويانا من صفحة «من إحنا».</p>
      </div>
    );
  }

  const heading = !isPackage
    ? "اختار اليوم اللي يناسبك"
    : sel.activeSession === 0
      ? "اختار يوم الجلسة الأولى"
      : `اختار يوم الجلسة ${sel.activeSession + 1}`;

  return (
    <div className="flex flex-col gap-6 pb-28 lg:pb-0">
      <section className="@container sketch-card flex min-w-0 flex-col gap-5 p-4 sm:gap-6 sm:p-6" aria-label="اختيار الموعد">
        <Stepper step={sel.step} />

        {/* Package: one tab per session */}
        {isPackage && sel.picks[0] != null && (
          <div className="flex flex-col gap-2">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="جلسات الباقة">
              {Array.from({ length: service.sessionsCount }, (_, i) => {
                const pick = sel.picks[i];
                const active = sel.activeSession === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => sel.editSession(i)}
                    className={cn(
                      "flex shrink-0 flex-col items-start rounded-2xl border-2 px-3 py-2 text-start text-xs transition-colors",
                      active ? "border-foreground bg-foreground text-background" : "border-foreground/15 hover:border-foreground",
                    )}
                  >
                    <span className="font-extrabold">الجلسة {i + 1}</span>
                    <span className={active ? "text-background/75" : "text-muted-foreground"}>
                      {pick != null ? `${shortDay.format(new Date(pick))} · ${formatTime(new Date(pick))}` : "بدون موعد"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="inline-flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
              {sel.activeWeek
                ? `الجلسة ${sel.activeSession + 1} لازم تكون بالأسبوع ${sel.activeSession + 1} (من ${shortDay.format(noon(sel.activeWeek.from))} إلى ${shortDay.format(noon(sel.activeWeek.to - 86_400_000))}) — الأيام المسموحة مظللة.`
                : "اقترحنا نفس الوقت للأسابيع الجاية. اضغط على أي جلسة حتى تغيّرها ضمن أسبوعها."}
            </p>
          </div>
        )}

        {/* Side by side only when the card itself is wide enough (container query). */}
        <div className="grid gap-5 @2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] @2xl:gap-8">
          {/* Step 1: calendar */}
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-extrabold sm:text-lg">{heading}</h2>
            <MonthCalendar
              month={sel.month}
              onMonthChange={sel.setMonth}
              minMonth={monthOf(todayKey())}
              maxMonth={monthOf(sel.lastDay)}
              availableDays={availableDays}
              selectableDays={sel.selectableDays}
              selectedDay={sel.activeDay}
              onSelect={handleSelectDay}
              sessionMarks={sessionMarks}
              highlight={sel.activeWeek}
            />
          </div>

          {/* Step 2: times of the chosen day */}
          <div
            ref={timesRef}
            className="@container flex flex-col gap-3 border-t-2 border-dashed border-foreground/15 pt-5 @2xl:border-s-2 @2xl:border-t-0 @2xl:ps-8 @2xl:pt-0"
          >
            {/* popLayout: the new day's times mount immediately (no waiting on the exit fade). */}
            <AnimatePresence mode="popLayout" initial={false}>
              {sel.activeDay == null ? (
                <m.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full min-h-28 flex-col items-center justify-center gap-2 rounded-3xl bg-muted p-5 text-center @2xl:min-h-48 @2xl:gap-3"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-background @2xl:size-12">
                    <ClockIcon className="size-5 @2xl:size-6" />
                  </span>
                  <p className="font-bold">اختار يوم من التقويم</p>
                  <p className="text-sm text-muted-foreground">الأيام اللي تحتها نقطة متاحة، وراح تطلع أوقاتها هنا.</p>
                </m.div>
              ) : (
                <m.div
                  key={sel.activeDay}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
                      الأوقات المتاحة · <Globe2Icon className="size-3.5" /> بتوقيت بغداد
                    </p>
                    <h3 className="text-base font-extrabold sm:text-lg">{formatDate(noon(sel.activeDay))}</h3>
                  </div>
                  <TimeSlots times={times} selected={selectedTime} onSelect={sel.chooseTime} showLocalTime={showLocal} />
                  <p className="text-xs text-muted-foreground">كل جلسة {service.durationMinutes} دقيقة.</p>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Step 3: a tiny summary bar once everything is picked; the full review opens on demand. */}
      <BookingBar show={sel.complete} info={tinyInfo} price={service.price} onContinue={() => setReviewOpen(true)} />

      {sel.complete && (
        <BookingReview
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          title={service.title}
          picks={sel.picks as number[]}
          durationMinutes={service.durationMinutes}
          price={service.price}
          pending={pending}
          isSignedIn={isSignedIn}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
