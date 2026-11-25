"use client";

import { UserPlusIcon, UserXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldMessage } from "../../shared/components/field-error";
import { FormDialog } from "../../shared/components/form-dialog";
import { endCourseAccess, grantCourseAccess } from "../actions";

/** Staff grant (e.g. paid offline): adds the course to the member's library. */
export function GrantAccessButton({ courseId }: { courseId: string }) {
  return (
    <FormDialog
      trigger={
        <Button variant="outline" size="sm">
          <UserPlusIcon /> تفعيل لعضو
        </Button>
      }
      title="تفعيل الوصول لعضو"
      description="يضيف المحتوى لمكتبة العضو بدون طلب دفع. ينحفظ بسجل العمليات."
      submitLabel="تفعيل"
      action={grantCourseAccess}
      extra={{ courseId }}
    >
      {(errors) => (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="grant-email">بريد العضو</Label>
            <Input id="grant-email" name="email" type="email" dir="ltr" required />
            <FieldMessage errors={errors.email} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="grant-days">المدة (يوم)</Label>
            <Input id="grant-days" name="days" type="number" min={1} dir="ltr" placeholder="دائم" />
            <FieldMessage errors={errors.days} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="grant-note">السبب</Label>
            <Textarea id="grant-note" name="note" rows={2} placeholder="مثلاً: دفع نقداً" required />
            <FieldMessage errors={errors.note} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function EndAccessButton({ enrollmentId, name }: { enrollmentId: string; name: string }) {
  return (
    <FormDialog
      trigger={
        <Button size="icon-sm" variant="ghost" aria-label="إنهاء الوصول">
          <UserXIcon />
        </Button>
      }
      title={`إنهاء وصول ${name}؟`}
      description="ينقفل المحتوى المدفوع عنه من الآن. المحتوى المجاني يبقى متاح لكل المسجلين."
      submitLabel="إنهاء"
      action={endCourseAccess}
      extra={{ enrollmentId }}
    >
      {(errors) => (
        <div className="grid gap-1.5">
          <Label htmlFor={`end-${enrollmentId}`}>السبب</Label>
          <Textarea id={`end-${enrollmentId}`} name="note" rows={2} required />
          <FieldMessage errors={errors.note} />
        </div>
      )}
    </FormDialog>
  );
}
