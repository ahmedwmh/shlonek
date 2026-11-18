"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Submit button for plain server-action forms: shows a spinner and locks itself
 * while the action runs, so a slow response never looks like a dead click.
 */
export function SubmitButton({
  children,
  icon,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & { icon?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? <Spinner /> : icon}
      {children}
    </Button>
  );
}
