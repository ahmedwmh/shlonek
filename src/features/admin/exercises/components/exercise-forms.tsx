"use client";

import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChoiceSelect } from "../../shared/components/choice-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "../../shared/components/confirm-button";
import { FieldMessage } from "../../shared/components/field-error";
import { FormDialog } from "../../shared/components/form-dialog";
import { contentStatus, exerciseAccess } from "../../shared/labels";
import { formToObject, useAdminAction } from "../../shared/use-admin-action";
import { createExercise, deleteExercise, updateExercise } from "../actions";

type Meta = {
  title: string;
  summary: string;
  access: string;
  estimatedMinutes: number | null;
  sortOrder: number;
};

function MetaFields({ values, errors, prefix }: { values?: Partial<Meta>; errors: Record<string, string[] | undefined>; prefix: string }) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-title`}>العنوان</Label>
        <Input id={`${prefix}-title`} name="title" defaultValue={values?.title} required />
        <FieldMessage errors={errors.title} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-summary`}>وصف قصير (يظهر بالبطاقة)</Label>
        <Textarea id={`${prefix}-summary`} name="summary" defaultValue={values?.summary} rows={2} required />
        <FieldMessage errors={errors.summary} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label>الوصول</Label>
          <ChoiceSelect
            name="access"
            defaultValue={values?.access ?? "FREE"}
            ariaLabel="الوصول"
            options={Object.entries(exerciseAccess).map(([v, l]) => ({ value: v, label: l.label }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefix}-minutes`}>المدة التقريبية (دقيقة)</Label>
          <Input id={`${prefix}-minutes`} name="estimatedMinutes" type="number" min={1} max={240} dir="ltr" defaultValue={values?.estimatedMinutes ?? ""} />
          <FieldMessage errors={errors.estimatedMinutes} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefix}-sort`}>الترتيب</Label>
          <Input id={`${prefix}-sort`} name="sortOrder" type="number" min={0} dir="ltr" defaultValue={values?.sortOrder ?? 0} />
        </div>
      </div>
    </>
  );
}

export function CreateExerciseButton() {
  const router = useRouter();
  return (
    <FormDialog
      trigger={
        <Button>
          <PlusIcon /> تمرين جديد
        </Button>
      }
      title="تمرين جديد"
      description="ينضاف كمسودة. بعدها تضيف المحتوى وتنشره."
      submitLabel="إنشاء"
      action={async (input) => {
        const result = await createExercise(input);
        if (result.ok) router.push(`/admin/exercises/${result.data.id}`);
        return result;
      }}
    >
      {(errors) => (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="new-slug">الرابط (بالإنجليزي)</Label>
            <Input id="new-slug" name="slug" dir="ltr" placeholder="circles" required />
            <FieldMessage errors={errors.slug} />
          </div>
          <MetaFields errors={errors} prefix="new" />
        </>
      )}
    </FormDialog>
  );
}

export function ExerciseEditForm({ id, values, status }: { id: string; values: Meta; status: string }) {
  const { run, pending, fieldErrors } = useAdminAction();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateExercise({ ...formToObject(e.currentTarget), id }));
      }}
    >
      <MetaFields values={values} errors={fieldErrors} prefix={id} />
      <div className="grid gap-1.5 sm:w-1/3">
        <Label>الحالة</Label>
        <ChoiceSelect
          name="status"
          defaultValue={status}
          ariaLabel="الحالة"
          options={Object.entries(contentStatus).map(([v, l]) => ({ value: v, label: l.label }))}
        />
      </div>
      <Button type="submit" className="self-end" disabled={pending}>
        {pending && <Spinner />}
        حفظ
      </Button>
    </form>
  );
}

export function DeleteExerciseButton({ id }: { id: string }) {
  const router = useRouter();
  const { run, pending } = useAdminAction();
  return (
    <ConfirmButton
      title="حذف التمرين نهائياً؟"
      description="ينفع بس للمسودات اللي ما عليها محاولات. ما يمكن التراجع."
      confirmLabel="حذف"
      destructive
      pending={pending}
      onConfirm={() => run(() => deleteExercise(id), { onSuccess: () => router.push("/admin/exercises") })}
    >
      <Trash2Icon /> حذف
    </ConfirmButton>
  );
}
