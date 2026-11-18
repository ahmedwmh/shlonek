"use client";

import { useRef } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/format";
import { FieldMessage } from "../../shared/components/field-error";
import { formToObject, useAdminAction } from "../../shared/use-admin-action";
import { addTimeOff, removeTimeOff } from "../actions";

export function TimeOffManager({ items }: { items: { id: string; startsAt: Date; endsAt: Date; reason: string | null }[] }) {
  const form = useRef<HTMLFormElement>(null);
  const add = useAdminAction();
  const remove = useAdminAction();

  return (
    <div className="flex flex-col gap-4">
      <form
        ref={form}
        className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          add.run(() => addTimeOff(formToObject(e.currentTarget)), { onSuccess: () => form.current?.reset() });
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="off-start">من (بتوقيت بغداد)</Label>
          <Input id="off-start" name="startsAt" type="datetime-local" dir="ltr" required />
          <FieldMessage errors={add.fieldErrors.startsAt} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="off-end">إلى</Label>
          <Input id="off-end" name="endsAt" type="datetime-local" dir="ltr" required />
          <FieldMessage errors={add.fieldErrors.endsAt} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="off-reason">السبب (اختياري)</Label>
          <Input id="off-reason" name="reason" />
        </div>
        <Button type="submit" disabled={add.pending}>
          {add.pending && <Spinner />}
          إضافة
        </Button>
      </form>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">ما كو إجازات قادمة.</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span>
                {formatDateTime(t.startsAt)} ← {formatDateTime(t.endsAt)}
                {t.reason && <span className="text-muted-foreground"> · {t.reason}</span>}
              </span>
              <Button size="icon-sm" variant="ghost" aria-label="حذف" disabled={remove.pending} onClick={() => remove.run(() => removeTimeOff(t.id))}>
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
