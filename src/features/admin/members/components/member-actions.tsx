"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CrownIcon, MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { FieldMessage } from "../../shared/components/field-error";
import { FormDialog } from "../../shared/components/form-dialog";
import { NoteForm } from "../../shared/components/note-form";
import { roleLabel } from "../../shared/labels";
import { useAdminAction } from "../../shared/use-admin-action";
import { addMemberNote, adjustWallet, endPremiumPeriod, grantPremium, setMemberRole, topUpWallet } from "../actions";

/** Two equal, full-width buttons — designed for a card footer. */
export function WalletActions({ userId }: { userId: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <FormDialog
        trigger={
          <Button className="h-10 w-full rounded-xl">
            <PlusIcon /> إضافة رصيد
          </Button>
        }
        title="إضافة رصيد للمحفظة"
        description="بعد ما يدفعلك العضو خارج الموقع (كاش، زين كاش…). يوصله بريد بالإضافة."
        submitLabel="إضافة"
        action={topUpWallet}
        extra={{ userId }}
      >
        {(errors) => (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="topup-amount">المبلغ (د.ع)</Label>
              <Input id="topup-amount" name="amount" type="number" inputMode="numeric" min={250} step={250} dir="ltr" required />
              <FieldMessage errors={errors.amount} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="topup-note">ملاحظة</Label>
              <Input id="topup-note" name="note" placeholder="مثلاً: كاش — تحويل زين كاش رقم …" required />
              <FieldMessage errors={errors.note} />
            </div>
          </>
        )}
      </FormDialog>
      <FormDialog
        trigger={
          <Button variant="outline" className="h-10 w-full rounded-xl">
            <MinusIcon /> تعديل الرصيد
          </Button>
        }
        title="تعديل الرصيد"
        description="رقم موجب للإضافة أو سالب للخصم. ما ينزل الرصيد تحت الصفر."
        action={adjustWallet}
        extra={{ userId }}
      >
        {(errors) => (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="adj-amount">المبلغ (د.ع، يقبل السالب)</Label>
              <Input id="adj-amount" name="amount" type="number" inputMode="numeric" dir="ltr" required />
              <FieldMessage errors={errors.amount} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="adj-note">السبب</Label>
              <Input id="adj-note" name="note" required />
              <FieldMessage errors={errors.note} />
            </div>
          </>
        )}
      </FormDialog>
    </div>
  );
}

const durations = [
  { value: "7", label: "أسبوع", hint: "7 أيام" },
  { value: "30", label: "شهر", hint: "30 يوم" },
  { value: "90", label: "3 أشهر", hint: "90 يوم" },
  { value: "custom", label: "مدة أخرى", hint: "بالأيام" },
] as const;

/** Segmented duration choice; posts `duration` (+ `customDays` when custom). */
function DurationPicker({ errors }: { errors: Record<string, string[] | undefined> }) {
  const [value, setValue] = useState<(typeof durations)[number]["value"]>("30");
  return (
    <div className="grid gap-2">
      <Label>المدة</Label>
      <input type="hidden" name="duration" value={value} />
      <div role="radiogroup" aria-label="مدة البريميوم" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {durations.map((d) => (
          <button
            key={d.value}
            type="button"
            role="radio"
            aria-checked={value === d.value}
            onClick={() => setValue(d.value)}
            className={cn(
              "flex flex-col items-center rounded-xl border-2 px-2 py-2 text-sm transition-colors",
              value === d.value ? "border-foreground bg-foreground text-background" : "border-foreground/15 hover:border-foreground",
            )}
          >
            <span className="font-bold">{d.label}</span>
            <span className={cn("text-xs", value === d.value ? "text-background/70" : "text-muted-foreground")}>{d.hint}</span>
          </button>
        ))}
      </div>
      {value === "custom" && (
        <div className="grid gap-1.5">
          <Label htmlFor="grant-days">عدد الأيام</Label>
          <Input id="grant-days" name="customDays" type="number" inputMode="numeric" min={1} max={366} dir="ltr" required autoFocus />
          <FieldMessage errors={errors.customDays} />
        </div>
      )}
      <FieldMessage errors={errors.duration} />
    </div>
  );
}

export function GrantPremium({ userId }: { userId: string }) {
  return (
    <FormDialog
      trigger={
        <Button variant="outline" className="h-10 w-full rounded-xl">
          <CrownIcon /> تفعيل بريميوم يدوياً
        </Button>
      }
      title="تفعيل بريميوم يدوياً"
      description="إذا العضو مشترك حالياً، المدة الجديدة تبدي من نهاية الحالية. يوصله بريد، والعملية تنسجل بالسجل."
      submitLabel="تفعيل"
      action={grantPremium}
      extra={{ userId }}
    >
      {(errors) => (
        <>
          <DurationPicker errors={errors} />
          <div className="grid gap-1.5">
            <Label htmlFor="grant-note">السبب</Label>
            <Input id="grant-note" name="note" placeholder="مثلاً: دفع كاش" required />
            <FieldMessage errors={errors.note} />
          </div>
        </>
      )}
    </FormDialog>
  );
}

export function EndPremium({ periodId }: { periodId: string }) {
  return (
    <FormDialog
      trigger={
        <Button
          size="xs"
          variant="ghost"
          className="h-7 rounded-full px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          إنهاء
        </Button>
      }
      title="إنهاء مدة البريميوم"
      description="تنتهي هالمدة هسه (وإذا ما بدت بعد تنلغي). المدد اللي بعدها ترجع لورا حتى ما يصير فراغ."
      submitLabel="إنهاء المدة"
      action={endPremiumPeriod}
      extra={{ periodId }}
    >
      {(errors) => (
        <div className="grid gap-1.5">
          <Label htmlFor="end-note">السبب</Label>
          <Input id="end-note" name="note" placeholder="مثلاً: تفعيل بالغلط" required />
          <FieldMessage errors={errors.note} />
        </div>
      )}
    </FormDialog>
  );
}

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const { run, pending } = useAdminAction();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">الصلاحية</span>
      <Select value={role} onValueChange={(r) => run(() => setMemberRole({ userId, role: r }))} disabled={pending} dir="rtl">
        <SelectTrigger className="h-9 w-28 rounded-full bg-card" aria-label="الصلاحية">
          <SelectValue>{roleLabel[role]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(roleLabel).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {pending && <Spinner />}
    </div>
  );
}

export function MemberNoteForm({ userId }: { userId: string }) {
  return <NoteForm onSubmit={(body) => addMemberNote({ userId, body })} />;
}
