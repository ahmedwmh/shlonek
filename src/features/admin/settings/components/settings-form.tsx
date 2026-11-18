"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FieldMessage } from "../../shared/components/field-error";
import { useAdminAction } from "../../shared/use-admin-action";
import { saveSettings } from "../actions";

export type FieldSpec = {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "switch" | "lines" | "email" | "tel";
  hint?: string;
  dir?: "ltr" | "rtl";
};

/** Generic form for one settings key; values are coerced by field type and validated server-side. */
export function SettingsForm({
  settingsKey,
  fields,
  values,
}: {
  settingsKey: string;
  fields: FieldSpec[];
  values: Record<string, unknown>;
}) {
  const { run, pending, fieldErrors } = useAdminAction();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const value: Record<string, unknown> = {};
        for (const f of fields) {
          const raw = data.get(f.name);
          if (f.type === "switch") value[f.name] = raw === "on";
          else if (f.type === "number") value[f.name] = raw === null || raw === "" ? undefined : Number(raw);
          else if (f.type === "lines")
            value[f.name] = String(raw ?? "")
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
          else value[f.name] = String(raw ?? "").trim();
        }
        run(() => saveSettings(settingsKey, value));
      }}
    >
      {fields.map((f) => {
        const id = `${settingsKey}-${f.name}`;
        const v = values[f.name];
        if (f.type === "switch") {
          return (
            <label key={f.name} className="flex items-start gap-3 text-sm">
              <Switch name={f.name} defaultChecked={Boolean(v)} className="mt-0.5" />
              <span>
                <span className="font-semibold">{f.label}</span>
                {f.hint && <span className="block text-muted-foreground">{f.hint}</span>}
              </span>
            </label>
          );
        }
        return (
          <div key={f.name} className="grid gap-1.5">
            <Label htmlFor={id}>{f.label}</Label>
            {f.type === "textarea" || f.type === "lines" ? (
              <Textarea
                id={id}
                name={f.name}
                rows={f.type === "lines" ? 4 : 3}
                defaultValue={f.type === "lines" ? ((v as string[]) ?? []).join("\n") : String(v ?? "")}
              />
            ) : (
              <Input
                id={id}
                name={f.name}
                type={f.type}
                dir={f.dir ?? (f.type === "number" || f.type === "email" || f.type === "tel" ? "ltr" : undefined)}
                defaultValue={String(v ?? "")}
              />
            )}
            {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
            <FieldMessage errors={fieldErrors[f.name]} />
          </div>
        );
      })}
      <Button type="submit" className="self-end" disabled={pending}>
        {pending && <Spinner />}
        حفظ
      </Button>
    </form>
  );
}
