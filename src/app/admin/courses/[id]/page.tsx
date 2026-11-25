import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { features } from "@/lib/env";
import { formatShortDate } from "@/lib/format";
import { requireStaff } from "@/lib/auth/dal";
import { getCourseAdmin } from "@/features/admin/courses/queries";
import { CourseEditForm, DeleteCourseButton } from "@/features/admin/courses/components/course-forms";
import { LessonManager } from "@/features/admin/courses/components/lesson-manager";
import { CoverUploader } from "@/features/admin/courses/components/cover-uploader";
import { EndAccessButton, GrantAccessButton } from "@/features/admin/courses/components/access-forms";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { Section, TableScroll } from "@/features/admin/shared/components/section";
import { EmptyState } from "@/features/admin/shared/components/empty-state";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { Pill, StatusBadge } from "@/features/admin/shared/components/status-badge";
import { contentStatus, courseKind, enrollmentSource } from "@/features/admin/shared/labels";

async function CourseDetail({ params }: PageProps<"/admin/courses/[id]">) {
  const viewer = await requireStaff();
  const isAdmin = viewer.role === "ADMIN";
  const { id } = await params;
  const c = await getCourseAdmin(id);
  if (!c) notFound();
  const now = new Date();
  const isProtected = c.access === "PAID" || c.access === "PREMIUM";
  const usesVdo = c.lessons.some((l) => l.provider === "VDOCIPHER");

  return (
    <>
      <PageHeader
        title={c.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge map={courseKind} value={c.kind} />
            <StatusBadge map={contentStatus} value={c.status} />
            <span dir="ltr" className="text-xs">
              /courses/<bdi>{c.slug}</bdi>
            </span>
          </span>
        }
        back={{ href: "/admin/courses", label: "الكورسات والورشات" }}
        actions={
          <div className="flex items-center gap-2">
            {c.status !== "DRAFT" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/courses/${encodeURIComponent(c.slug)}`} target="_blank">
                  <ExternalLinkIcon /> عرض بالموقع
                </Link>
              </Button>
            )}
            {isAdmin && <DeleteCourseButton id={c.id} />}
          </div>
        }
      />

      {usesVdo && !features.vdocipher && (
        <p className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6">
          فيديوهات VdoCipher ما راح تشتغل لحد ما ينضاف مفتاح <span dir="ltr">VDOCIPHER_API_SECRET</span> بإعدادات Vercel. لحد ذاك يشوف الأعضاء «قيد التجهيز».
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Section
          title={c.kind === "WORKSHOP" ? "المحاضرات" : "الفيديوهات"}
          description={
            c.kind === "WORKSHOP"
              ? "محاضرة وحدة أو محاضرتين."
              : c.access === "PAID"
                ? "فيديو تعريفي مجاني واحد، وباقي الفيديوهات مقفلة على VdoCipher."
                : "الفيديوهات المجانية على YouTube كـ«غير مدرج»."
          }
        >
          {isAdmin ? (
            <LessonManager courseId={c.id} lessons={c.lessons} isPaid={c.access === "PAID"} isProtected={isProtected} kind={c.kind} />
          ) : (
            <ol className="list-decimal ps-5">
              {c.lessons.map((l) => (
                <li key={l.id}>{l.title}</li>
              ))}
            </ol>
          )}
        </Section>

        {isAdmin && (
          <Section title="صورة الغلاف" description="تظهر بالبطاقة، وفوق صفحة المحتوى، وعند مشاركة الرابط.">
            <CoverUploader courseId={c.id} slug={c.slug} version={c.coverVersion} hasUpload={Boolean(c.cover)} />
          </Section>
        )}

        {isAdmin && (
          <Section title="المعلومات والسعر" description="النشر يتحقق من القواعد: السعر، الفيديو التعريفي، ونوع الفيديوهات المقفلة.">
            <CourseEditForm
              values={{
                id: c.id,
                kind: c.kind,
                slug: c.slug,
                title: c.title,
                summary: c.summary,
                description: c.description,
                topics: c.topics,
                presenter: c.presenter,
                access: c.access,
                price: c.price,
                premiumPrice: c.premiumPrice,
                accessDays: c.accessDays,
                sortOrder: c.sortOrder,
                status: c.status,
              }}
            />
          </Section>
        )}

        <Section
          title="المشتركين"
          description={`${c._count.enrollments} بالمكتبة · ${c._count.orders} طلب`}
          actions={isAdmin ? <GrantAccessButton courseId={c.id} /> : undefined}
        >
          {c.enrollments.length === 0 ? (
            <EmptyState title="ما كو مشتركين بعد" icon={UsersIcon} />
          ) : (
            <TableScroll>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العضو</TableHead>
                    <TableHead>المصدر</TableHead>
                    <TableHead>من</TableHead>
                    <TableHead>إلى</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.enrollments.map((e) => {
                    const ended = Boolean(e.endsAt && e.endsAt <= now);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Link href={`/admin/members/${e.user.id}`} className="hover:underline">
                            {e.user.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge map={enrollmentSource} value={e.source} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatShortDate(e.startsAt)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {ended ? <Pill tone="secondary">انتهى {formatShortDate(e.endsAt!)}</Pill> : e.endsAt ? formatShortDate(e.endsAt) : "دائم"}
                        </TableCell>
                        <TableCell>{isAdmin && !ended && c.access === "PAID" && <EndAccessButton enrollmentId={e.id} name={e.user.name} />}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableScroll>
          )}
        </Section>
      </div>
    </>
  );
}

export default function CourseAdminPage(props: PageProps<"/admin/courses/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CourseDetail {...props} />
    </Suspense>
  );
}
