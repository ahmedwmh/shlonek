"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChoiceSelect } from "../../shared/components/choice-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FieldMessage } from "../../shared/components/field-error";
import { consultationKind, deliveryMethod } from "../../shared/labels";
import { formToObject, useAdminAction } from "../../shared/use-admin-action";
import { updateService } from "../actions";

type Service = {
  id: string;
  kind: string;
  title: string;
  description: string;
  sessionsCount: number;
  durationMinutes: number;
  price: number;
  deliveryMethod: string;
  deliveryNote: string | null;
  isActive: boolean;
};

export function ServiceForm({ service }: { service: Service }) {
  const { run, pending, fieldErrors: e } = useAdminAction();
  const id = (f: string) => `${service.id}-${f}`;

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border p-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        run(() => updateService({ ...formToObject(ev.currentTarget), id: service.id }));
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">
          {consultationKind[service.kind]} · {service.sessionsCount === 1 ? "جلسة وحدة" : `${service.sessionsCount} جلسات`}
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <Switch name="isActive" defaultChecked={service.isActive} />
          فعّالة
        </label>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={id("title")}>العنوان</Label>
        <Input id={id("title")} name="title" defaultValue={service.title} required />
        <FieldMessage errors={e.title} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={id("description")}>الوصف</Label>
        <Textarea id={id("description")} name="description" defaultValue={service.description} rows={3} required />
        <FieldMessage errors={e.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={id("price")}>السعر (د.ع)</Label>
          <Input id={id("price")} name="price" type="number" min={1000} step={250} dir="ltr" defaultValue={service.price} required />
          <FieldMessage errors={e.price} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={id("duration")}>مدة الجلسة (دقيقة)</Label>
          <Input id={id("duration")} name="durationMinutes" type="number" min={15} max={240} step={5} dir="ltr" defaultValue={service.durationMinutes} required />
          <FieldMessage errors={e.durationMinutes} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>طريقة الجلسة</Label>
          <ChoiceSelect
            name="deliveryMethod"
            defaultValue={service.deliveryMethod}
            ariaLabel="طريقة الجلسة"
            options={Object.entries(deliveryMethod).map(([v, l]) => ({ value: v, label: l }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={id("note")}>ملاحظة الطريقة</Label>
          <Input id={id("note")} name="deliveryNote" defaultValue={service.deliveryNote ?? ""} placeholder="مثلاً: عبر Google Meet" />
        </div>
      </div>
      <Button type="submit" className="self-end" disabled={pending}>
        {pending && <Spinner />}
        حفظ
      </Button>
    </form>
  );
}
