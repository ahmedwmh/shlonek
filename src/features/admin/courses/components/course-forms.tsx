"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceSelect } from "../../shared/components/choice-select";
import { ConfirmButton } from "../../shared/components/confirm-button";
import { FieldMessage } from "../../shared/components/field-error";
import { FormDialog } from "../../shared/components/form-dialog";
import { contentStatus } from "../../shared/labels";
import { formToObject, useAdminAction } from "../../shared/use-admin-action";
import { createCourse, deleteCourse, updateCourse } from "../actions";
import { YouTubeLinkField } from "./youtube-autofill";

export function CreateCourseButton() {
  const router = useRouter();
  return (
    <FormDialog
      trigger={
        <Button>
          <PlusIcon /> إضافة
        </Button>
      }
      title="كورس أو ورشة جديدة"
      description="ينضاف كمسودة، والرابط يتولد من العنوان. بعدها تضيف الفيديوهات والصورة وتحدد السعر وتنشره."
      submitLabel="إنشاء"
      action={async (input) => {
        const result = await createCourse(input);
        if (result.ok) router.push(`/admin/courses/${result.data.id}`);
        return result;
      }}
    >
      {(errors) => (
        <>
          <div className="grid gap-1.5">
            <Label>النوع</Label>
            <ChoiceSelect
              name="kind"
              defaultValue="COURSE"
              ariaLabel="النوع"
              options={[
                { value: "COURSE", label: "كورس (عدة فيديوهات، مجاني أو مدفوع)" },
                { value: "WORKSHOP", label: "ورشة (محاضرة أو محاضرتين)" },
              ]}
            />
          </div>
          <YouTubeLinkField
            id="new-youtube"
            name="youtube"
            label="رابط YouTube (اختياري)"
            hint="الصق رابط الورشة أو أول فيديو: العنوان والوصف والمحاور والمدة تتعبّى من YouTube."
            errors={errors.youtube}
            fill={{ title: (d) => d.title, summary: (d) => d.summary }}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="new-title">العنوان</Label>
            <Input id="new-title" name="title" required />
            <FieldMessage errors={errors.title} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-summary">وصف قصير (يظهر بالبطاقة)</Label>
            <Textarea id="new-summary" name="summary" rows={2} required />
            <FieldMessage errors={errors.summary} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export type CourseFormValues = {
  id: string;
  kind: "COURSE" | "WORKSHOP";
  slug: string;
  title: string;
  summary: string;
  description: string;
  topics: string[];
  presenter: string | null;
  access: "FREE" | "PAID" | "PREMIUM";
  price: number | null;
  premiumPrice: number | null;
  accessDays: number | null;
  sortOrder: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export function CourseEditForm({ values }: { values: CourseFormValues }) {
  const { run, pending, fieldErrors: e } = useAdminAction();
  const [access, setAccess] = useState(values.access);
  const p = values.id;
  const accessOptions =
    values.kind === "WORKSHOP"
      ? [
          { value: "FREE", label: "عامة: مجانية لكل المسجلين" },
          { value: "PREMIUM", label: "مجانية لبريميوم فقط" },
        ]
      : [
          { value: "FREE", label: "مجاني للمسجلين" },
          { value: "PAID", label: "مدفوع (شراء مستقل)" },
        ];

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        run(() => updateCourse({ ...formToObject(ev.currentTarget), id: values.id, access }));
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`${p}-title`}>العنوان</Label>
        <Input id={`${p}-title`} name="title" defaultValue={values.title} required />
        <FieldMessage errors={e.title} />
        <p className="text-xs text-muted-foreground">
          الرابط: <span dir="ltr">/courses/<bdi>{values.slug}</bdi></span>
          {values.status === "DRAFT" ? " · يتحدث تلقائياً من العنوان لحد النشر." : " · ثابت بعد النشر حتى ما تنكسر الروابط."}
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${p}-summary`}>وصف قصير (يظهر بالبطاقة)</Label>
        <Textarea id={`${p}-summary`} name="summary" rows={2} defaultValue={values.summary} required />
        <FieldMessage errors={e.summary} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${p}-desc`}>الوصف الكامل</Label>
        <Textarea id={`${p}-desc`} name="description" rows={5} defaultValue={values.description} />
        <FieldMessage errors={e.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${p}-topics`}>المحاور (كل محور بسطر)</Label>
          <Textarea id={`${p}-topics`} name="topics" rows={4} defaultValue={values.topics.join("\n")} />
        </div>
        <div className="grid content-start gap-1.5">
          <Label htmlFor={`${p}-presenter`}>مقدّم المحتوى</Label>
          <Input id={`${p}-presenter`} name="presenter" defaultValue={values.presenter ?? ""} />
        </div>
      </div>

      <fieldset className="grid gap-4 rounded-2xl border p-4">
        <legend className="px-1 text-sm font-bold">الإتاحة والسعر</legend>
        <div className="grid gap-1.5 sm:w-1/2">
          <Label>مين يگدر يشوفه</Label>
          <ChoiceSelect value={access} onValueChange={(v) => setAccess(v as typeof access)} ariaLabel="الإتاحة" options={accessOptions} />
          <FieldMessage errors={e.access} />
        </div>
        {access === "PAID" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`${p}-price`}>السعر (د.ع)</Label>
              <Input id={`${p}-price`} name="price" type="number" min={1000} step={250} dir="ltr" defaultValue={values.price ?? ""} />
              <FieldMessage errors={e.price} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${p}-pprice`}>سعر بريميوم (د.ع)</Label>
              <Input id={`${p}-pprice`} name="premiumPrice" type="number" min={1000} step={250} dir="ltr" placeholder="بدون خصم" defaultValue={values.premiumPrice ?? ""} />
              <FieldMessage errors={e.premiumPrice} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${p}-days`}>مدة الوصول (يوم)</Label>
              <Input id={`${p}-days`} name="accessDays" type="number" min={1} dir="ltr" placeholder="دائم" defaultValue={values.accessDays ?? ""} />
              <FieldMessage errors={e.accessDays} />
            </div>
          </div>
        )}
        <p className="text-xs leading-5 text-muted-foreground">
          {access === "PAID"
            ? "السعر الجديد يطبق على الطلبات الجديدة فقط. بريميوم يعطي السعر المخفض بس، ما يفتح الكورس."
            : access === "PREMIUM"
              ? "تنفتح لمشترك بريميوم فعّال فقط، وتنقفل إذا انتهى اشتراكه."
              : "مجاني لكل الحسابات المسجلة."}
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label>الحالة</Label>
          <ChoiceSelect
            name="status"
            defaultValue={values.status}
            ariaLabel="الحالة"
            options={Object.entries(contentStatus).map(([v, l]) => ({ value: v, label: l.label }))}
          />
          <FieldMessage errors={e.status} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${p}-sort`}>الترتيب</Label>
          <Input id={`${p}-sort`} name="sortOrder" type="number" min={0} dir="ltr" defaultValue={values.sortOrder} />
        </div>
      </div>
      <Button type="submit" className="self-end" disabled={pending}>
        {pending && <Spinner />}
        حفظ
      </Button>
    </form>
  );
}

export function DeleteCourseButton({ id }: { id: string }) {
  const router = useRouter();
  const { run, pending } = useAdminAction();
  return (
    <ConfirmButton
      title="حذف المحتوى؟"
      description="إذا عليه مشتركين أو طلبات راح يتأرشف بدل الحذف، حتى يبقى وصولهم."
      confirmLabel="حذف"
      destructive
      pending={pending}
      onConfirm={() =>
        run(() => deleteCourse(id), {
          onSuccess: (data) => {
            if (data.deleted) router.push("/admin/courses");
          },
        })
      }
    >
      <Trash2Icon /> حذف
    </ConfirmButton>
  );
}
