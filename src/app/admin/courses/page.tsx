import { Suspense } from "react";
import Link from "next/link";
import { GraduationCapIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIQD } from "@/lib/format";
import { requireStaff } from "@/lib/auth/dal";
import { listCoursesAdmin } from "@/features/admin/courses/queries";
import { CreateCourseButton } from "@/features/admin/courses/components/course-forms";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { Section, TableScroll } from "@/features/admin/shared/components/section";
import { EmptyState } from "@/features/admin/shared/components/empty-state";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { StatusBadge } from "@/features/admin/shared/components/status-badge";
import { contentStatus, courseAccess, courseKind } from "@/features/admin/shared/labels";

async function Courses() {
  const viewer = await requireStaff();
  const courses = await listCoursesAdmin();

  return (
    <Section title="المحتوى" actions={viewer.role === "ADMIN" ? <CreateCourseButton /> : undefined}>
      {courses.length === 0 ? (
        <EmptyState title="ما كو كورسات أو ورشات بعد" icon={GraduationCapIcon} />
      ) : (
        <TableScroll>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العنوان</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الإتاحة</TableHead>
                <TableHead>السعر</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>فيديوهات</TableHead>
                <TableHead>مشتركين</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold">
                    <Link href={`/admin/courses/${c.id}`} className="flex items-center gap-3 hover:underline">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/courses/${encodeURIComponent(c.slug)}/cover?v=${c.coverVersion}`}
                        alt=""
                        loading="lazy"
                        className="aspect-video w-20 shrink-0 rounded-lg border object-cover"
                      />
                      <span className="min-w-0">{c.title}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge map={courseKind} value={c.kind} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge map={courseAccess} value={c.access} />
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {c.price ? (
                      <>
                        {formatIQD(c.price)}
                        {c.premiumPrice && <span className="block text-xs text-muted-foreground">بريميوم {formatIQD(c.premiumPrice)}</span>}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge map={contentStatus} value={c.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">{c._count.lessons}</TableCell>
                  <TableCell className="tabular-nums">{c._count.enrollments}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScroll>
      )}
    </Section>
  );
}

export default function CoursesAdminPage() {
  return (
    <>
      <PageHeader title="الكورسات والورشات" description="كورسات مجانية أو مدفوعة، وورشات عامة أو لبريميوم." />
      <Suspense fallback={<PageSkeleton />}>
        <Courses />
      </Suspense>
    </>
  );
}
