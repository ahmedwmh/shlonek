"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "@/lib/action-result";
import { formToObject, useAdminAction } from "../use-admin-action";

/**
 * Dialog with a form whose fields come from `children(fieldErrors)`. On submit the
 * fields are sent as a plain object to `action`; the dialog closes on success.
 */
export function FormDialog({
  trigger,
  title,
  description,
  submitLabel = "حفظ",
  action,
  children,
  extra,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  submitLabel?: string;
  action: (input: Record<string, unknown>) => Promise<ActionResult<unknown>>;
  children: (errors: Record<string, string[] | undefined>) => ReactNode;
  extra?: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const { run, pending, fieldErrors } = useAdminAction();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const values = { ...formToObject(e.currentTarget), ...extra };
            run(() => action(values), { onSuccess: () => setOpen(false) });
          }}
        >
          {children(fieldErrors)}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
