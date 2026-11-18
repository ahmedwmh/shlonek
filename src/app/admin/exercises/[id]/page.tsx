import { Suspense } from "react";
import { notFound } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/auth/dal";
import { getExerciseAdmin } from "@/features/admin/exercises/queries";
import { DeleteExerciseButton, ExerciseEditForm } from "@/features/admin/exercises/components/exercise-forms";
import { VersionEditor } from "@/features/admin/exercises/components/version-editor";
import { PageHeader } from "@/features/admin/shared/components/page-header";
import { Section } from "@/features/admin/shared/components/section";
import { StatusBadge } from "@/features/admin/shared/components/status-badge";
import { PageSkeleton } from "@/features/admin/shared/components/page-skeleton";
import { contentStatus } from "@/features/admin/shared/labels";

async function ExerciseDetail({ params }: PageProps<"/admin/exercises/[id]">) {
  await requireStaff();
  const { id } = await params;
  const e = await getExerciseAdmin(id);
  if (!e) notFound();

  return (
    <>
      <PageHeader
        title={e.title}
        description={
          <span className="flex items-center gap-2">
            <StatusBadge map={contentStatus} value={e.status} />
            <span dir="ltr">/exercises/{e.slug}</span>
          </span>
        }
        back={{ href: "/admin/exercises", label: "التمارين" }}
        actions={e._count.attempts === 0 && e.status === "DRAFT" ? <DeleteExerciseButton id={e.id} /> : undefined}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <Section title="المعلومات" description="الحالة «منشور» تحتاج نسخة محتوى. إذا عليه محاولات، أرشفه بدل الحذف.">
            <ExerciseEditForm
              id={e.id}
              status={e.status}
              values={{
                title: e.title,
                summary: e.summary,
                access: e.access,
                estimatedMinutes: e.estimatedMinutes,
                sortOrder: e.sortOrder,
              }}
            />
          </Section>
          <Section
            title="المحتوى"
            description={
              e.currentVersion
                ? `تعدّل على نسخة ${e.currentVersion.version}. النشر ينشئ نسخة ${e.versions[0].version + 1} جديدة.`
                : "ما كو محتوى بعد. اكتب الأسئلة وانشر أول نسخة."
            }
          >
            <VersionEditor
              exerciseId={e.id}
              intro={e.currentVersion?.intro ?? ""}
              definition={e.currentVersion?.definition ?? null}
            />
          </Section>
        </div>
        <aside>
          <Section title="النسخ">
            {e.versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">ما كو نسخ.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {e.versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 rounded-xl border p-2.5">
                    <span className="font-semibold">
                      نسخة {v.version}
                      {v.id === e.currentVersionId && <span className="ms-1 text-xs text-success">(الحالية)</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {v.publishedAt ? formatDateTime(v.publishedAt) : "مسودة"} · {v._count.attempts} محاولة
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </aside>
      </div>
    </>
  );
}

export default function ExerciseAdminPage(props: PageProps<"/admin/exercises/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExerciseDetail {...props} />
    </Suspense>
  );
}
