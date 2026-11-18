import type { Metadata } from "next";
import { Suspense } from "react";
import { VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth/dal";
import { formatDate, formatTime } from "@/lib/format";
import { getMyConsultations } from "@/features/consultations/queries";
import { getSettings } from "@/features/settings/queries";
import { bookingStatusLabel } from "@/features/account/labels";
import { EmptyState, SectionHeader, SectionSkeleton, StatusPill } from "@/features/account/components/section";

export const metadata: Metadata = { title: "استشاراتي" };

async function Consultations() {
  const viewer = await requireViewer("/account/consultations");
  const [purchases, booking] = await Promise.all([getMyConsultations(viewer.id), getSettings("booking")]);
  const now = new Date();
  /** A confirmed session whose time has passed reads as "past", not "upcoming". */
  const statusOf = (b: { status: keyof typeof bookingStatusLabel; endsAt: Date }) =>
    b.status === "CONFIRMED" && b.endsAt < now ? "سابقة" : bookingStatusLabel[b.status];

  if (purchases.length === 0) {
    return <EmptyState title="ما عندك حجوزات بعد." href="/consultations" cta="احجز استشارة" character="welcoming" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="rounded-2xl bg-muted p-4 text-sm leading-7">{booking.meetingInstructions}</p>
      {purchases.map((p) => (
        <section key={p.id} className="sketch-card p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold">{p.service.title}</h3>
              <p className="text-sm text-muted-foreground">
                طلب #{p.order.number} · {p.service.durationMinutes} دقيقة · {p.service.deliveryMethod === "ONLINE" ? "أونلاين" : "حضوري"} · بتوقيت بغداد
              </p>
            </div>
          </div>
          {p.order.status === "NEEDS_REVIEW" && (
            <p className="mb-3 rounded-2xl bg-muted p-3 text-sm">
              وصلنا دفعك بعد انتهاء مهلة الحجز. فريقنا راح يتواصل وياك حتى نثبت موعد بديل أو نرجع المبلغ.
            </p>
          )}
          <ul className="flex flex-col gap-2">
            {p.bookings.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-foreground/15 px-4 py-3"
              >
                <span className="flex flex-col">
                  {p.bookings.length > 1 && <span className="text-xs text-muted-foreground">الجلسة {b.sequence}</span>}
                  <span className="font-semibold">
                    {formatDate(b.startsAt)} · {formatTime(b.startsAt)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusPill tone={b.status === "CONFIRMED" && b.endsAt >= now ? "solid" : "muted"}>{statusOf(b)}</StatusPill>
                  {b.status === "CONFIRMED" && b.endsAt >= now && b.meetingUrl && (
                    <Button asChild size="sm" className="rounded-full">
                      <a href={b.meetingUrl} target="_blank" rel="noopener noreferrer">
                        <VideoIcon /> رابط الجلسة
                      </a>
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-muted-foreground">
        تريد تغيّر أو تلغي موعد؟ تواصل ويانا قبل {booking.cancelNoticeHours} ساعة على الأقل من صفحة «من إحنا».
      </p>
    </div>
  );
}

export default function MyConsultationsPage() {
  return (
    <>
      <SectionHeader title="استشاراتي" description="حجوزاتك القادمة والسابقة." />
      <Suspense fallback={<SectionSkeleton />}>
        <Consultations />
      </Suspense>
    </>
  );
}
