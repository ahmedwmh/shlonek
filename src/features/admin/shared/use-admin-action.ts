"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

/**
 * Runs an admin Server Action inside a transition and reports the outcome with a
 * toast. Field errors are kept so forms can show them next to inputs.
 */
export function useAdminAction() {
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});

  const run = useCallback(
    <T,>(action: () => Promise<ActionResult<T>>, options?: { success?: string; onSuccess?: (data: T) => void }) => {
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          setFieldErrors({});
          toast.success(result.message ?? options?.success ?? "تم الحفظ");
          options?.onSuccess?.(result.data);
        } else {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.error);
        }
      });
    },
    [],
  );

  return { run, pending, fieldErrors };
}

/** FormData → plain object (checkbox/switch "on" → true). */
export function formToObject(form: HTMLFormElement) {
  const data = new FormData(form);
  const out: Record<string, FormDataEntryValue | boolean> = {};
  for (const [key, value] of data.entries()) out[key] = value === "on" ? true : value;
  return out;
}
