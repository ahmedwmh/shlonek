"use client";

import { useRef, useState, useTransition } from "react";
import { CheckIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { FieldMessage } from "../../shared/components/field-error";
import { youtubeDetails } from "../actions";
import type { YouTubeDetails } from "@/features/courses/youtube-details";

/** Field name in the surrounding form → what to put there from the video. */
export type AutofillMap = Partial<Record<string, (d: YouTubeDetails) => string | number | null | undefined>>;

/**
 * A YouTube link input that, once a link is pasted, reads the video's title,
 * description and length and fills the form's EMPTY fields (never overwrites
 * what the admin typed).
 */
export function YouTubeLinkField({
  id,
  name,
  label,
  hint,
  defaultValue,
  required,
  errors,
  fill,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  required?: boolean;
  errors?: string[];
  fill: AutofillMap;
}) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const last = useRef(defaultValue ?? "");

  const lookup = (input: HTMLInputElement) => {
    const url = input.value.trim();
    if (!url || url === last.current) return;
    last.current = url;
    start(async () => {
      const result = await youtubeDetails(url);
      if (!result.ok) {
        setStatus({ ok: false, text: result.error });
        return;
      }
      const form = input.form;
      let filled = 0;
      for (const [field, pick] of Object.entries(fill)) {
        const el = form?.elements.namedItem(field);
        const value = pick?.(result.data);
        if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && !el.value.trim() && value !== null && value !== undefined && value !== "") {
          el.value = String(value);
          filled++;
        }
      }
      setStatus({ ok: true, text: filled ? `«${result.data.title}» · تعبّت ${filled} حقول من YouTube` : `«${result.data.title}»` });
    });
  };

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          dir="ltr"
          placeholder="https://youtu.be/…"
          defaultValue={defaultValue}
          required={required}
          onBlur={(e) => lookup(e.currentTarget)}
          onPaste={(e) => {
            const el = e.currentTarget;
            setTimeout(() => lookup(el), 0);
          }}
        />
        {pending && <Spinner className="absolute start-3 top-1/2 -translate-y-1/2" />}
      </div>
      <FieldMessage errors={errors} />
      {status ? (
        <p className={status.ok ? "inline-flex items-center gap-1 text-xs text-muted-foreground" : "text-xs text-destructive"}>
          {status.ok && <CheckIcon className="size-3.5" />}
          {status.text}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
