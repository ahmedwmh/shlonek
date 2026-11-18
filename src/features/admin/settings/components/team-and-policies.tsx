"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "../../shared/components/confirm-button";
import { FieldMessage } from "../../shared/components/field-error";
import { FormDialog } from "../../shared/components/form-dialog";
import { useAdminAction } from "../../shared/use-admin-action";
import { deleteTeamMember, publishPolicy, saveTeamMember } from "../actions";

type Member = { id: string; name: string; role: string; bio: string | null; photoUrl: string | null; sortOrder: number; isVisible: boolean };

function MemberFields({ m, errors }: { m?: Member; errors: Record<string, string[] | undefined> }) {
  const p = m?.id ?? "new";
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${p}-name`}>الاسم</Label>
          <Input id={`${p}-name`} name="name" defaultValue={m?.name} required />
          <FieldMessage errors={errors.name} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${p}-role`}>الدور</Label>
          <Input id={`${p}-role`} name="role" defaultValue={m?.role} placeholder="لايف كوتش" required />
          <FieldMessage errors={errors.role} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${p}-bio`}>نبذة</Label>
        <Textarea id={`${p}-bio`} name="bio" defaultValue={m?.bio ?? ""} rows={3} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${p}-photo`}>رابط الصورة (https)</Label>
        <Input id={`${p}-photo`} name="photoUrl" type="url" dir="ltr" defaultValue={m?.photoUrl ?? ""} />
        <FieldMessage errors={errors.photoUrl} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${p}-sort`}>الترتيب</Label>
          <Input id={`${p}-sort`} name="sortOrder" type="number" min={0} dir="ltr" defaultValue={m?.sortOrder ?? 0} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <Switch name="isVisible" defaultChecked={m?.isVisible ?? true} />
          ظاهر بالموقع
        </label>
      </div>
    </>
  );
}

export function TeamManager({ members }: { members: Member[] }) {
  const del = useAdminAction();
  return (
    <div className="flex flex-col gap-3">
      <FormDialog
        trigger={
          <Button size="sm" className="self-start">
            <PlusIcon /> إضافة عضو
          </Button>
        }
        title="عضو فريق جديد"
        action={saveTeamMember}
      >
        {(errors) => <MemberFields errors={errors} />}
      </FormDialog>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">ما كو أعضاء فريق. صفحة «من إحنا» تخفي القسم لحد ما تضيف.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 p-3">
              <div>
                <p className="font-semibold">
                  {m.name} {!m.isVisible && <span className="text-xs text-muted-foreground">(مخفي)</span>}
                </p>
                <p className="text-sm text-muted-foreground">{m.role}</p>
              </div>
              <div className="flex items-center gap-1">
                <FormDialog
                  trigger={
                    <Button size="icon-sm" variant="ghost" aria-label="تعديل">
                      <PencilIcon />
                    </Button>
                  }
                  title={`تعديل ${m.name}`}
                  action={saveTeamMember}
                  extra={{ id: m.id }}
                >
                  {(errors) => <MemberFields m={m} errors={errors} />}
                </FormDialog>
                <ConfirmButton
                  variant="ghost"
                  title={`حذف ${m.name}؟`}
                  confirmLabel="حذف"
                  destructive
                  pending={del.pending}
                  onConfirm={() => del.run(() => deleteTeamMember(m.id))}
                >
                  <Trash2Icon />
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PolicyEditor({
  kind,
  label,
  latest,
}: {
  kind: string;
  label: string;
  latest: { title: string; body: string; version: string } | null;
}) {
  return (
    <FormDialog
      trigger={
        <Button size="sm" variant="outline">
          <PencilIcon /> إصدار جديد
        </Button>
      }
      title={`${label} — إصدار جديد`}
      description={
        kind === "TERMS"
          ? "إصدار جديد من الشروط يطلب من كل عضو الموافقة مرة ثانية بأول دخول."
          : "الإصدارات القديمة تبقى محفوظة بالسجل."
      }
      submitLabel="نشر"
      action={publishPolicy}
      extra={{ kind }}
    >
      {(errors) => (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor={`${kind}-title`}>العنوان</Label>
            <Input id={`${kind}-title`} name="title" defaultValue={latest?.title ?? label} required />
            <FieldMessage errors={errors.title} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${kind}-body`}>النص</Label>
            <Textarea id={`${kind}-body`} name="body" defaultValue={latest?.body ?? ""} rows={12} required />
            <FieldMessage errors={errors.body} />
          </div>
        </>
      )}
    </FormDialog>
  );
}
