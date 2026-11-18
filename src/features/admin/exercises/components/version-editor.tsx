"use client";

import { useMemo, useState } from "react";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { exerciseDefinitionSchema } from "@/features/exercises/definition";
import { ConfirmButton } from "../../shared/components/confirm-button";
import { FieldMessage } from "../../shared/components/field-error";
import { useAdminAction } from "../../shared/use-admin-action";
import { publishVersion } from "../actions";

export const definitionTemplate = {
  questions: [
    { id: "q1", type: "text", prompt: "سؤال نصي", help: "توضيح اختياري", minLength: 3, maxLength: 1500 },
    {
      id: "q2",
      type: "single",
      prompt: "سؤال باختيار واحد",
      options: [
        { id: "a", label: "خيار أ" },
        { id: "b", label: "خيار ب" },
      ],
    },
    { id: "q3", type: "scale", prompt: "مقياس", min: 1, max: 5, minLabel: "قليل", maxLabel: "كثير" },
  ],
  result: { kind: "summary", title: "شكراً لأنك كملت", body: "رسالة تأملية تظهر بعد الحفظ." },
};

/** Validates the JSON live (same schema as the server) before a new version can be published. */
export function VersionEditor({ exerciseId, intro, definition }: { exerciseId: string; intro: string; definition: unknown }) {
  const [introText, setIntro] = useState(intro);
  const [json, setJson] = useState(() => JSON.stringify(definition ?? definitionTemplate, null, 2));
  const { run, pending, fieldErrors } = useAdminAction();

  const check = useMemo(() => {
    try {
      const parsed = exerciseDefinitionSchema.safeParse(JSON.parse(json));
      if (parsed.success) return { ok: true as const, count: parsed.data.questions.length };
      return { ok: false as const, errors: parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".") || "—"}: ${i.message}`) };
    } catch (e) {
      return { ok: false as const, errors: [`JSON: ${(e as Error).message}`] };
    }
  }, [json]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="v-intro">المقدمة (هدف التمرين وإرشاداته)</Label>
        <Textarea id="v-intro" value={introText} onChange={(e) => setIntro(e.target.value)} rows={3} />
        <FieldMessage errors={fieldErrors.intro} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="v-def">الأسئلة وقواعد النتيجة (JSON)</Label>
        <Textarea
          id="v-def"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={18}
          dir="ltr"
          spellCheck={false}
          className="font-mono text-xs leading-5"
        />
        <div aria-live="polite" className="text-sm">
          {check.ok ? (
            <p className="flex items-center gap-1.5 text-success">
              <CheckCircle2Icon className="size-4" /> صالح · {check.count} أسئلة
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-destructive">
              {check.errors.map((err) => (
                <li key={err} className="flex items-start gap-1.5" dir="ltr">
                  <XCircleIcon className="mt-0.5 size-4 shrink-0" /> {err}
                </li>
              ))}
            </ul>
          )}
        </div>
        <FieldMessage errors={fieldErrors.definition} />
      </div>
      <p className="text-xs text-muted-foreground">
        الأنواع: text / single / scale. النتيجة: <code dir="ltr">choice</code> (تعكس اختيار العضو بسؤال single، مع axis اختياري) أو{" "}
        <code dir="ltr">summary</code>. لا تضيف معادلة تقييم غير معتمدة.
      </p>
      <div className="self-end">
        <ConfirmButton
          variant="default"
          size="default"
          title="نشر نسخة جديدة؟"
          description="الأعضاء راح ياخذون النسخة الجديدة من هسه. المحاولات السابقة تبقى مرتبطة بنسختها ونتائجها ما تتغير."
          confirmLabel="انشر"
          pending={pending || !check.ok}
          onConfirm={() => {
            if (!check.ok) return;
            run(() => publishVersion({ exerciseId, intro: introText, definition: json }));
          }}
        >
          نشر نسخة جديدة
        </ConfirmButton>
      </div>
    </div>
  );
}
