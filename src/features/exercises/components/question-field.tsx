"use client";

import { useId } from "react";
import { m } from "motion/react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Question } from "../definition";

type Props = {
  question: Question;
  value: string | number | undefined;
  error?: string;
  onChange: (value: string | number) => void;
  onSubmitShortcut?: () => void;
};

/** Renders one question by type: free text, single choice cards, or a scale. */
export function QuestionField({ question, value, error, onChange, onSubmitShortcut }: Props) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [question.help && helpId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset className="flex flex-col gap-4" aria-describedby={describedBy}>
      <legend className="mb-1 text-2xl leading-snug font-bold md:text-3xl">{question.prompt}</legend>
      {question.help && (
        <p id={helpId} className="-mt-2 text-muted-foreground">
          {question.help}
        </p>
      )}

      {question.type === "text" && (
        <div className="flex flex-col gap-1">
          <textarea
            id={id}
            autoFocus
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmitShortcut?.();
            }}
            maxLength={question.maxLength}
            rows={4}
            placeholder={question.placeholder ?? "اكتب هنا…"}
            aria-invalid={Boolean(error) || undefined}
            aria-label={question.prompt}
            className="field-sizing-content min-h-36 w-full resize-none rounded-2xl border-2 border-foreground bg-card p-4 text-lg leading-8 outline-none transition-shadow placeholder:text-muted-foreground focus:shadow-[4px_4px_0_0_var(--foreground)]"
          />
          <span dir="ltr" className="self-end text-xs text-muted-foreground tabular-nums">
            {String(value ?? "").length}/{question.maxLength}
          </span>
        </div>
      )}

      {question.type === "single" && (
        <div role="radiogroup" aria-label={question.prompt} className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => {
            const selected = value === option.id;
            return (
              <m.button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(option.id)}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex flex-col items-start gap-1 rounded-2xl border-2 border-foreground p-5 text-start transition-[background-color,color,box-shadow] duration-200",
                  selected ? "bg-foreground text-background shadow-none" : "bg-card hover:shadow-[4px_4px_0_0_var(--foreground)]",
                )}
              >
                <span className="text-2xl font-bold">{option.label}</span>
                {option.description && (
                  <span className={cn("text-sm leading-6", selected ? "text-background/80" : "text-muted-foreground")}>
                    {option.description}
                  </span>
                )}
                {selected && (
                  <m.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute end-4 top-4 grid size-6 place-items-center rounded-full bg-background text-foreground"
                  >
                    <CheckIcon className="size-4" />
                  </m.span>
                )}
              </m.button>
            );
          })}
        </div>
      )}

      {question.type === "scale" && (
        <div className="flex flex-col gap-2">
          <div role="radiogroup" aria-label={question.prompt} className="flex flex-wrap gap-2" dir="ltr">
            {Array.from({ length: question.max - question.min + 1 }, (_, i) => question.min + i).map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value === n}
                onClick={() => onChange(n)}
                className={cn(
                  "grid size-12 place-items-center rounded-full border-2 border-foreground text-lg font-bold transition-colors",
                  value === n ? "bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          {(question.minLabel || question.maxLabel) && (
            <div className="flex justify-between text-sm text-muted-foreground" dir="ltr">
              <span>{question.minLabel}</span>
              <span>{question.maxLabel}</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
