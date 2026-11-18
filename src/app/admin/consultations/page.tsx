import { Suspense } from "react";
import Link from "next/link";
import { CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { segmentedTabs } from "@/features/admin/shared/components/tabs-style";
import { formatDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/auth/dal";
import { getConsultationAdmin } from "@/features/admin/consultations/queries";
import { ServiceForm } from "@/features/admin/consultations/components/service-form";
import { AvailabilityEditor } from "@/features/admin/consultations/components/availability-editor";
import { TimeOffManager } from "@/features/admin/consultations/components/time-off";
import { BookingActions } from "@/features/admin/consultations/components/booking-actions";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { Section, TableScroll } from "@/features/admin/shared/components/section";
import { StatusBadge } from "@/features/admin/shared/components/status-badge";
import { EmptyState } from "@/features/admin/shared/components/empty-state";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { bookingStatus } from "@/features/admin/shared/labels";

type BookingRow = Awaited<ReturnType<typeof getConsultationAdmin>>["upcoming"][number];

function BookingsTable({ rows, actions }: { rows: BookingRow[]; actions: boolean }) {
  if (rows.length === 0) return <EmptyState title="ما كو جلسات" icon={CalendarIcon} />;
  return (
    <TableScroll>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>الموعد</TableHead>
            <TableHead>العضو</TableHead>
            <TableHead>الخدمة</TableHead>
            <TableHead>الحالة</TableHead>
            {actions && <TableHead>إجراءات</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="whitespace-nowrap font-medium tabular-nums">{formatDateTime(b.startsAt)}</TableCell>
              <TableCell className="whitespace-nowrap">
                <Link href={`/admin/members/${b.user.id}`} className="font-semibold hover:underline">
                  {b.user.name}
                </Link>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {b.purchase.service.title}
                {b.purchase.sessionsCount > 1 && <span className="text-muted-foreground"> · {b.sequence}/{b.purchase.sessionsCount}</span>}
              </TableCell>
              <TableCell>
                <StatusBadge map={bookingStatus} value={b.status} />
              </TableCell>
              {actions && (
                <TableCell>
                  <BookingActions bookingId={b.id} status={b.status} meetingUrl={b.meetingUrl} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScroll>
  );
}

const TABS = ["bookings", "services", "hours"] as const;

async function Consultations({ searchParams }: PageProps<"/admin/consultations">) {
  await requireStaff();
  const tab = (await searchParams).tab;
  const initial = TABS.includes(tab as (typeof TABS)[number]) ? (tab as string) : "bookings";
  const data = await getConsultationAdmin();

  return (
    <Tabs defaultValue={initial} dir="rtl">
      <TabsList className={segmentedTabs.list}>
        <TabsTrigger value="bookings" className={segmentedTabs.trigger}>الجلسات</TabsTrigger>
        <TabsTrigger value="services" className={segmentedTabs.trigger}>الخدمات والأسعار</TabsTrigger>
        <TabsTrigger value="hours" className={segmentedTabs.trigger}>أوقات العمل والإجازات</TabsTrigger>
      </TabsList>

      <TabsContent value="bookings" className="mt-6 flex flex-col gap-6">
        <Section title="القادمة" description="المؤكدة والمحجوزة مؤقتاً (بانتظار الدفع).">
          <BookingsTable rows={data.upcoming} actions />
        </Section>
        <Section title="السابقة">
          <BookingsTable rows={data.past} actions />
        </Section>
      </TabsContent>

      <TabsContent value="services" className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        {data.services.map((s) => (
          <ServiceForm key={s.id} service={s} />
        ))}
      </TabsContent>

      <TabsContent value="hours" className="mt-6 flex flex-col gap-6">
        <Section
          title="أوقات العمل الأسبوعية"
          description={`بتوقيت بغداد${data.coach ? ` · الكوتش: ${data.coach.name}` : ""}. المواعيد تنقسم حسب مدة الجلسة.`}
        >
          <AvailabilityEditor initial={data.availability} />
        </Section>
        <Section title="إجازات وأوقات مغلقة" description="ما تظهر مواعيد بهالفترات.">
          <TimeOffManager items={data.timeOff} />
        </Section>
      </TabsContent>
    </Tabs>
  );
}

export default function ConsultationsAdminPage(props: PageProps<"/admin/consultations">) {
  return (
    <>
      <PageHeader title="الاستشارات والتقويم" description="الخدمات، الأسعار، أوقات العمل والجلسات." />
      <Suspense fallback={<PageSkeleton />}>
        <Consultations {...props} />
      </Suspense>
    </>
  );
}
