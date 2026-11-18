"use client";

import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfirmButton } from "../../shared/components/confirm-button";
import { FieldMessage } from "../../shared/components/field-error";
import { FormDialog } from "../../shared/components/form-dialog";
import { useAdminAction } from "../../shared/use-admin-action";
import { createPlan, deletePlan, updatePlan } from "../actions";

type Plan = { id: string; name: string; durationDays: number; price: number; isActive: boolean; sortOrder: number };

function PlanFields({ plan, errors }: { plan?: Plan; errors: Record<string, string[] | undefined> }) {
  const p = plan?.id ?? "new";
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${p}-name`}>الاسم</Label>
        <Input id={`${p}-name`} name="name" defaultValue={plan?.name} placeholder="مثلاً: شهر" required />
        <FieldMessage errors={errors.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${p}-days`}>المدة (يوم)</Label>
          <Input id={`${p}-days`} name="durationDays" type="number" min={1} dir="ltr" defaultValue={plan?.durationDays ?? 30} required />
          <FieldMessage errors={errors.durationDays} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${p}-price`}>السعر (د.ع)</Label>
          <Input id={`${p}-price`} name="price" type="number" min={1000} step={250} dir="ltr" defaultValue={plan?.price} required />
          <FieldMessage errors={errors.price} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${p}-sort`}>الترتيب</Label>
          <Input id={`${p}-sort`} name="sortOrder" type="number" min={0} dir="ltr" defaultValue={plan?.sortOrder ?? 0} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <Switch name="isActive" defaultChecked={plan?.isActive ?? true} />
          فعّالة للبيع
        </label>
      </div>
    </>
  );
}

export function CreatePlanButton() {
  return (
    <FormDialog
      trigger={
        <Button>
          <PlusIcon /> خطة جديدة
        </Button>
      }
      title="خطة بريميوم جديدة"
      description="مدة ثابتة تنشرى مرة وحدة، بدون تجديد تلقائي."
      action={createPlan}
    >
      {(errors) => <PlanFields errors={errors} />}
    </FormDialog>
  );
}

export function PlanRowActions({ plan }: { plan: Plan }) {
  const del = useAdminAction();
  return (
    <div className="flex items-center gap-1">
      <FormDialog
        trigger={
          <Button size="icon-sm" variant="ghost" aria-label="تعديل">
            <PencilIcon />
          </Button>
        }
        title={`تعديل «${plan.name}»`}
        description="السعر الجديد يطبّق على الطلبات الجديدة فقط."
        action={updatePlan}
        extra={{ id: plan.id }}
      >
        {(errors) => <PlanFields plan={plan} errors={errors} />}
      </FormDialog>
      <ConfirmButton
        variant="ghost"
        title="حذف الخطة؟"
        description="إذا انشرت قبل، راح تتعطل بدل ما تنحذف حتى يبقى السجل سليم."
        confirmLabel="حذف"
        destructive
        pending={del.pending}
        onConfirm={() => del.run(() => deletePlan(plan.id))}
      >
        <Trash2Icon />
      </ConfirmButton>
    </div>
  );
}
