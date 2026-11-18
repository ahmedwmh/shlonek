"use client";

import { CheckIcon, Undo2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatIQD } from "@/lib/format";
import { ConfirmButton } from "../../shared/components/confirm-button";
import { FieldMessage } from "../../shared/components/field-error";
import { FormDialog } from "../../shared/components/form-dialog";
import { useAdminAction } from "../../shared/use-admin-action";
import { completeGatewayRefund, confirmOrderManually, refundToWallet, requestGatewayRefund } from "../actions";

function RefundFields({ errors, max, hint }: { errors: Record<string, string[] | undefined>; max: number; hint?: string }) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="refund-amount">المبلغ (أقصى {formatIQD(max)})</Label>
        <Input id="refund-amount" name="amount" type="number" min={250} max={max} dir="ltr" defaultValue={max} required />
        <FieldMessage errors={errors.amount} />
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="refund-reason">السبب</Label>
        <Textarea id="refund-reason" name="reason" rows={3} required />
        <FieldMessage errors={errors.reason} />
      </div>
    </>
  );
}

export function OrderActions({
  orderId,
  status,
  refundable,
  gatewayRefundable,
  waylEnabled,
}: {
  orderId: string;
  status: string;
  refundable: number;
  gatewayRefundable: number;
  waylEnabled: boolean;
}) {
  const canRefund = ["PAID", "NEEDS_REVIEW", "PARTIALLY_REFUNDED"].includes(status) && refundable > 0;

  return (
    <div className="flex flex-wrap gap-2">
      {status === "NEEDS_REVIEW" && (
        <FormDialog
          trigger={
            <Button size="sm">
              <CheckIcon /> تأكيد يدوي
            </Button>
          }
          title="تأكيد الطلب يدوياً"
          description="يأكّد الجلسات إذا مواعيدها بعدها فاضية، ويفعّل البريميوم إذا ما تفعّل. إذا موعد انحجز لغيره، غيّره أول."
          submitLabel="تأكيد"
          action={confirmOrderManually}
          extra={{ orderId }}
        >
          {(errors) => (
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-note">ملاحظة</Label>
              <Input id="confirm-note" name="note" required />
              <FieldMessage errors={errors.note} />
            </div>
          )}
        </FormDialog>
      )}
      {canRefund && (
        <FormDialog
          trigger={
            <Button size="sm" variant="outline">
              <Undo2Icon /> استرداد للمحفظة
            </Button>
          }
          title="استرداد للمحفظة"
          description="يرجع المبلغ فوراً لمحفظة العضو. الاسترداد الكامل يلغي الجلسات القادمة وينهي البريميوم المرتبط."
          submitLabel="استرداد"
          action={refundToWallet}
          extra={{ orderId }}
        >
          {(errors) => <RefundFields errors={errors} max={refundable} />}
        </FormDialog>
      )}
      {canRefund && waylEnabled && gatewayRefundable >= 1000 && (
        <FormDialog
          trigger={
            <Button size="sm" variant="outline">
              <Undo2Icon /> استرداد عبر Wayl
            </Button>
          }
          title="طلب استرداد من Wayl"
          description="يرجع لوسيلة الدفع الأصلية بعد ما يعالجه Wayl. بعد ما يكتمل، علّمه «مكتمل» من هنا."
          submitLabel="اطلب الاسترداد"
          action={requestGatewayRefund}
          extra={{ orderId }}
        >
          {(errors) => <RefundFields errors={errors} max={gatewayRefundable} hint="Wayl يتطلب سبب واضح وحد أدنى 1,000 د.ع." />}
        </FormDialog>
      )}
    </div>
  );
}

export function CompleteRefundButton({ refundId }: { refundId: string }) {
  const { run, pending } = useAdminAction();
  return (
    <ConfirmButton
      title="الاسترداد اكتمل على Wayl؟"
      description="تأكد من لوحة Wayl إن المبلغ رجع للعضو."
      confirmLabel="نعم، اكتمل"
      pending={pending}
      onConfirm={() => run(() => completeGatewayRefund(refundId))}
    >
      علّمه مكتمل
    </ConfirmButton>
  );
}
