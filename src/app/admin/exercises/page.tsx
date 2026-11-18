import { Suspense } from "react";
import Link from "next/link";
import { ClipboardListIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStaff } from "@/lib/auth/dal";
import { listExercisesAdmin } from "@/features/admin/exercises/queries";
import { CreateExerciseButton } from "@/features/admin/exercises/components/exercise-forms";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { TableScroll } from "@/features/admin/shared/components/section";
import { StatusBadge } from "@/features/admin/shared/components/status-badge";
import { EmptyState } from "@/features/admin/shared/components/empty-state";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { contentStatus, exerciseAccess } from "@/features/admin/shared/labels";

async function Exercises() {
  await requireStaff();
  const items = await listExercisesAdmin();
  if (items.length === 0) return <EmptyState title="ما كو تمارين بعد" icon={ClipboardListIcon} />;

  return (
    <TableScroll>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>التمرين</TableHead>
            <TableHead>الوصول</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>النسخة الحالية</TableHead>
            <TableHead>المحاولات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <Link href={`/admin/exercises/${e.id}`} className="flex flex-col hover:underline">
                  <span className="font-semibold">{e.title}</span>
                  <span dir="ltr" className="text-end text-xs text-muted-foreground">
                    /{e.slug}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge map={exerciseAccess} value={e.access} />
              </TableCell>
              <TableCell>
                <StatusBadge map={contentStatus} value={e.status} />
              </TableCell>
              <TableCell>{e.currentVersion ? `ن${e.currentVersion.version}` : <span className="text-muted-foreground">بدون محتوى</span>}</TableCell>
              <TableCell className="tabular-nums">{e._count.attempts}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScroll>
  );
}

export default function ExercisesAdminPage() {
  return (
    <>
      <PageHeader title="التمارين" description="أضف تمارين، عدّل محتواها بنسخ جديدة، وحدد المجاني والبريميوم." actions={<CreateExerciseButton />} />
      <Suspense fallback={<PageSkeleton />}>
        <Exercises />
      </Suspense>
    </>
  );
}
