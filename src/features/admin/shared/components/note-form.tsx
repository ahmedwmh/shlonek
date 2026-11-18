"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { useAdminAction } from "../use-admin-action";
import { FieldMessage } from "./field-error";

/** Private staff note composer (never visible to members). */
export function NoteForm({ onSubmit }: { onSubmit: (body: string) => Promise<ActionResult> }) {
  const ref = useRef<HTMLFormElement>(null);
  const { run, pending, fieldErrors } = useAdminAction();

  return (
    <form
      ref={ref}
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const body = String(new FormData(e.currentTarget).get("body") ?? "");
        run(() => onSubmit(body), { onSuccess: () => ref.current?.reset() });
      }}
    >
      <Textarea name="body" rows={3} placeholder="ملاحظة داخلية للفريق…" aria-label="ملاحظة داخلية" required />
      <FieldMessage errors={fieldErrors.body} />
      <Button type="submit" size="sm" className="self-end" disabled={pending}>
        {pending && <Spinner />}
        إضافة ملاحظة
      </Button>
    </form>
  );
}
