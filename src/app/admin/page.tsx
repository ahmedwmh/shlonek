import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CalendarCheckIcon,
  ClipboardCheckIcon,
  CrownIcon,
  EyeIcon,
  InboxIcon,
  type LucideIcon,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/auth/dal";
import { getDashboard } from "@/features/admin/dashboard/queries";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { Section } from "@/features/admin/shared/components/section";
import { EmptyState } from "@/features/admin/shared/components/empty-state";
import { Pill } from "@/features/admin/shared/components/status-badge";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";

function Stat({
  label,
  hint,
  value,
  href,
  icon: Icon,
  alert,
}: {
  label: string;
  hint?: string;
  value: number;
  href: string;
  icon: LucideIcon;
  alert?: boolean;
}) {
  const warn = alert && value > 0;
  return (
    <Link
      href={href}
      className={`group flex h-full flex-col justify-between gap-4 rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-foreground/40 hover:shadow-sm md:gap-5 md:p-6 ${
        warn ? "border-destructive/40" : "border-border/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid size-10 place-items-center rounded-xl md:size-11 ${warn ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"}`}
        >
          <Icon className="size-5" />
        </span>
        <ArrowLeftIcon className="size-4 text-muted-foreground opacity-0 transition-[opacity,translate] duration-200 group-hover:-translate-x-0.5 group-hover:opacity-100" />
      </div>
      <div className="flex flex-col gap-1">
        <span className={`text-2xl font-extrabold tabular-nums md:text-3xl ${warn ? "text-destructive" : ""}`}>{value}</span>
        <span className="text-[0.8rem] leading-5 font-semibold md:text-sm">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </Link>
  );
}

async function Dashboard() {
  await requireStaff();
  const d = await getDashboard();

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
        <Stat label="رسائل احچيلي جديدة" hint="ما انفتحت بعد" value={d.newPosts} href="/admin/inbox?status=NEW" icon={InboxIcon} />
        <Stat
          label="مشاركات بانتظار المراجعة"
          hint="وافق أصحابها على النشر"
          value={d.pendingPublic}
          href="/admin/inbox?public=PENDING_REVIEW"
          icon={EyeIcon}
        />
        <Stat label="جلسات مؤكدة" hint="خلال ٧ أيام" value={d.upcoming} href="/admin/consultations?tab=bookings" icon={CalendarCheckIcon} />
        <Stat label="تمارين مكتملة" hint="آخر ٧ أيام" value={d.attempts} href="/admin/members" icon={ClipboardCheckIcon} />
        <Stat label="أعضاء بريميوم فعّالين" value={d.premiumMembers} href="/admin/premium" icon={CrownIcon} />
        <Stat
          label="طلبات تحتاج مراجعة"
          hint={`${d.verifying} طلب قيد التحقق`}
          value={d.needsReview}
          href="/admin/orders?status=NEEDS_REVIEW"
          icon={AlertTriangleIcon}
          alert
        />
      </div>

      <Section
        title="الجلسات القادمة"
        description="أقرب الجلسات المؤكدة. الجلسة اللي بدون رابط تحتاج رابط قبل موعدها."
        actions={
          <Link href="/admin/consultations?tab=bookings" className="text-sm font-semibold underline-offset-4 hover:underline">
            كل الحجوزات
          </Link>
        }
      >
        {d.nextBookings.length === 0 ? (
          <EmptyState title="ما كو جلسات قادمة" icon={CalendarCheckIcon} />
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {d.nextBookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold">
                    {b.user.name.slice(0, 1)}
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <Link href={`/admin/members/${b.user.id}`} className="truncate font-semibold hover:underline">
                      {b.user.name}
                    </Link>
                    <span className="truncate text-sm text-muted-foreground">
                      {b.purchase.service.title}
                      {b.purchase.sessionsCount > 1 && ` · الجلسة ${b.sequence} من ${b.purchase.sessionsCount}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold tabular-nums">{formatDateTime(b.startsAt)}</span>
                  {!b.meetingUrl && <Pill tone="destructive">بدون رابط</Pill>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export default function AdminHomePage() {
  return (
    <>
      <PageHeader title="أهلاً بيك" description="نظرة سريعة على شنو صاير بالمنصة اليوم." />
      <Suspense fallback={<PageSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
