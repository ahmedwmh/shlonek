"use client";

import { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceSelect } from "../../shared/components/choice-select";
import { ConfirmButton } from "../../shared/components/confirm-button";
import { FieldMessage } from "../../shared/components/field-error";
import { FormDialog } from "../../shared/components/form-dialog";
import { Pill } from "../../shared/components/status-badge";
import { useAdminAction } from "../../shared/use-admin-action";
import { deleteLesson, moveLesson, saveLesson } from "../actions";
import { YouTubeLinkField } from "./youtube-autofill";

export type AdminLesson = {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  provider: "YOUTUBE" | "VDOCIPHER";
  videoId: string;
  isPreview: boolean;
};

function LessonFields({
  lesson,
  errors,
  showPreview,
  defaultProvider,
}: {
  lesson?: AdminLesson;
  errors: Record<string, string[] | undefined>;
  showPreview: boolean;
  defaultProvider: "YOUTUBE" | "VDOCIPHER";
}) {
  const p = lesson?.id ?? "new";
  const [provider, setProvider] = useState(lesson?.provider ?? defaultProvider);
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${p}-ltitle`}>العنوان</Label>
        <Input id={`${p}-ltitle`} name="title" defaultValue={lesson?.title} required />
        <FieldMessage errors={errors.title} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>مصدر الفيديو</Label>
          <ChoiceSelect
            name="provider"
            value={provider}
            onValueChange={(v) => setProvider(v as typeof provider)}
            ariaLabel="مصدر الفيديو"
            options={[
              { value: "YOUTUBE", label: "YouTube غير مدرج (مجاني)" },
              { value: "VDOCIPHER", label: "VdoCipher (محمي)" },
            ]}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${p}-minutes`}>المدة (دقيقة)</Label>
          <Input id={`${p}-minutes`} name="durationMinutes" type="number" min={1} dir="ltr" defaultValue={lesson?.durationMinutes ?? ""} />
          <FieldMessage errors={errors.durationMinutes} />
        </div>
      </div>
      {provider === "YOUTUBE" ? (
        <YouTubeLinkField
          key="youtube"
          id={`${p}-video`}
          name="video"
          label="رابط YouTube"
          hint="العنوان والوصف والمدة تتعبّى من الفيديو إذا كانت فارغة."
          defaultValue={lesson?.provider === "YOUTUBE" ? `https://youtu.be/${lesson.videoId}` : ""}
          required
          errors={errors.video}
          fill={{ title: (d) => d.title, description: (d) => d.description, durationMinutes: (d) => d.durationMinutes }}
        />
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor={`${p}-video`}>Video ID من VdoCipher</Label>
          <Input
            key="vdocipher"
            id={`${p}-video`}
            name="video"
            dir="ltr"
            placeholder="مثلاً 1234abcd…"
            defaultValue={lesson?.provider === "VDOCIPHER" ? lesson.videoId : ""}
            required
          />
          <FieldMessage errors={errors.video} />
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor={`${p}-ldesc`}>وصف (اختياري)</Label>
        <Textarea id={`${p}-ldesc`} name="description" rows={2} defaultValue={lesson?.description ?? ""} />
      </div>
      {showPreview && (
        <label className="flex items-center gap-2 text-sm">
          <Switch name="isPreview" defaultChecked={lesson?.isPreview} />
          الفيديو التعريفي المجاني (واحد فقط لكل كورس)
        </label>
      )}
    </>
  );
}

export function LessonManager({
  courseId,
  lessons,
  isPaid,
  isProtected,
  kind,
}: {
  courseId: string;
  lessons: AdminLesson[];
  isPaid: boolean;
  /** Paid course or premium workshop: locked videos should be on VdoCipher. */
  isProtected: boolean;
  kind: "COURSE" | "WORKSHOP";
}) {
  const action = useAdminAction();
  const noun = kind === "WORKSHOP" ? "محاضرة" : "فيديو";
  const defaultProvider = isProtected ? "VDOCIPHER" : "YOUTUBE";

  return (
    <div className="flex flex-col gap-3">
      {lessons.length === 0 ? (
        <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">ما كو {noun} بعد.</p>
      ) : (
        <ol className="flex flex-col divide-y rounded-2xl border">
          {lessons.map((l, i) => {
            const warn = isProtected && l.provider === "YOUTUBE" && !(isPaid && l.isPreview);
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-3 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold tabular-nums">{i + 1}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-semibold">{l.title}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Pill tone={l.provider === "VDOCIPHER" ? "default" : "outline"}>{l.provider === "VDOCIPHER" ? "VdoCipher" : "YouTube"}</Pill>
                    {l.isPreview && <Pill tone="secondary">تعريفي مجاني</Pill>}
                    {l.durationMinutes && <span className="text-xs text-muted-foreground">{l.durationMinutes} د</span>}
                    {warn && <Pill tone="destructive">لازم يكون على VdoCipher</Pill>}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Button size="icon-sm" variant="ghost" aria-label="لفوق" disabled={i === 0 || action.pending} onClick={() => action.run(() => moveLesson({ id: l.id, direction: "up" }))}>
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="لجوه"
                    disabled={i === lessons.length - 1 || action.pending}
                    onClick={() => action.run(() => moveLesson({ id: l.id, direction: "down" }))}
                  >
                    <ArrowDownIcon />
                  </Button>
                  <FormDialog
                    trigger={
                      <Button size="icon-sm" variant="ghost" aria-label="تعديل">
                        <PencilIcon />
                      </Button>
                    }
                    title={`تعديل «${l.title}»`}
                    action={saveLesson}
                    extra={{ id: l.id, courseId }}
                  >
                    {(errors) => <LessonFields lesson={l} errors={errors} showPreview={isPaid} defaultProvider={defaultProvider} />}
                  </FormDialog>
                  <ConfirmButton
                    variant="ghost"
                    title={`حذف «${l.title}»؟`}
                    description="ينحذف من الكورس. الفيديو نفسه يبقى على YouTube/VdoCipher."
                    confirmLabel="حذف"
                    destructive
                    pending={action.pending}
                    onConfirm={() => action.run(() => deleteLesson(l.id))}
                  >
                    <Trash2Icon />
                  </ConfirmButton>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <FormDialog
        trigger={
          <Button variant="outline" className="self-start">
            <PlusIcon /> {noun} جديد{kind === "WORKSHOP" ? "ة" : ""}
          </Button>
        }
        title={`${noun} جديد${kind === "WORKSHOP" ? "ة" : ""}`}
        description={
          isProtected
            ? "الفيديوهات المقفلة على VdoCipher. الفيديو التعريفي المجاني يگدر يكون YouTube."
            : "الفيديوهات المجانية على YouTube كـ«غير مدرج» (Unlisted)."
        }
        action={saveLesson}
        extra={{ courseId }}
      >
        {(errors) => <LessonFields errors={errors} showPreview={isPaid} defaultProvider={defaultProvider} />}
      </FormDialog>
    </div>
  );
}
