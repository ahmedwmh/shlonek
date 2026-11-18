"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/**
 * Select that always shows the chosen label in its trigger (the Radix value slot can
 * render empty until the menu has been opened). Works controlled (`value`) or
 * uncontrolled (`defaultValue`, posts `name` with the form).
 */
export function ChoiceSelect({
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  ariaLabel,
  disabled,
  className,
}: {
  options: Option[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? inner;

  return (
    <Select
      name={name}
      value={current}
      onValueChange={(v) => {
        if (value === undefined) setInner(v);
        onValueChange?.(v);
      }}
      disabled={disabled}
      dir="rtl"
    >
      <SelectTrigger className={cn("h-9 w-full rounded-lg bg-card", className)} aria-label={ariaLabel}>
        <SelectValue>{options.find((o) => o.value === current)?.label ?? ""}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
