"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceSelect } from "../../shared/components/choice-select";
import { Spinner } from "@/components/ui/spinner";
import { minutesToLabel } from "@/lib/time";
import { weekdays } from "../../shared/labels";
import { useAdminAction } from "../../shared/use-admin-action";
import { saveAvailability } from "../actions";

type Row = { key: number; weekday: number; start: string; end: string };

/** Weekly working hours (Baghdad time). Saving replaces all rows. */
export function AvailabilityEditor({ initial }: { initial: { weekday: number; startMinute: number; endMinute: number }[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((r, i) => ({ key: i, weekday: r.weekday, start: minutesToLabel(r.startMinute), end: minutesToLabel(r.endMinute) })),
  );
  const [nextKey, setNextKey] = useState(initial.length);
  const { run, pending } = useAdminAction();

  const update = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-3">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">ما كو أوقات عمل، فما راح تظهر مواعيد للحجز.</p>}
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center gap-2">
            <ChoiceSelect
              value={String(r.weekday)}
              onValueChange={(v) => update(r.key, { weekday: Number(v) })}
              ariaLabel="اليوم"
              className="w-32"
              options={weekdays.map((d, i) => ({ value: String(i), label: d }))}
            />
            <span className="text-sm text-muted-foreground">من</span>
            <Input type="time" value={r.start} onChange={(e) => update(r.key, { start: e.target.value })} className="w-28" dir="ltr" aria-label="من" />
            <span className="text-sm text-muted-foreground">إلى</span>
            <Input type="time" value={r.end} onChange={(e) => update(r.key, { end: e.target.value })} className="w-28" dir="ltr" aria-label="إلى" />
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="حذف"
              onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
            >
              <Trash2Icon />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRows((rs) => [...rs, { key: nextKey, weekday: 6, start: "16:00", end: "21:00" }]);
            setNextKey((k) => k + 1);
          }}
        >
          <PlusIcon /> إضافة فترة
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => saveAvailability({ rows: rows.map(({ weekday, start, end }) => ({ weekday, start, end })) }))}
        >
          {pending && <Spinner />}
          حفظ أوقات العمل
        </Button>
      </div>
    </div>
  );
}
