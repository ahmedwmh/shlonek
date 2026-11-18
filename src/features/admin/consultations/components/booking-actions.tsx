"use client";

import { CalendarClockIcon, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { FieldMessage } from "../../shared/components/field-error";
import { FormDialog } from "../../shared/components/form-dialog";
import { bookingStatus } from "../../shared/labels";
import { useAdminAction } from "../../shared/use-admin-action";
import { rescheduleBooking, setBookingStatus, setMeetingUrl } from "../actions";

const settable = ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"] as const;

export function BookingActions({
  bookingId,
  status,
  meetingUrl,
}: {
  bookingId: string;
  status: string;
  meetingUrl: string | null;
}) {
  const statusAction = useAdminAction();
  const editable = settable.includes(status as (typeof settable)[number]);

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      {editable && (
        <Select
          value={status}
          onValueChange={(s) => statusAction.run(() => setBookingStatus({ bookingId, status: s }))}
          disabled={statusAction.pending}
          dir="rtl"
        >
          <SelectTrigger size="sm" className="h-8 w-28 rounded-full" aria-label="حالة الجلسة">
            <SelectValue>{bookingStatus[status]?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {settable.map((s) => (
              <SelectItem key={s} value={s}>
                {bookingStatus[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {statusAction.pending && <Spinner />}

      <FormDialog
        trigger={
          <Button size="sm" variant={meetingUrl ? "outline" : "default"} className="h-8 rounded-full px-3">
            <LinkIcon /> {meetingUrl ? "الرابط" : "رابط"}
          </Button>
        }
        title="رابط الجلسة"
        description="يظهر للعضو بحسابه بعد التأكيد فقط. اتركه فارغ للحذف."
        action={setMeetingUrl}
        extra={{ bookingId }}
      >
        {(errors) => (
          <div className="grid gap-1.5">
            <Label htmlFor={`url-${bookingId}`}>الرابط</Label>
            <Input id={`url-${bookingId}`} name="meetingUrl" type="url" dir="ltr" defaultValue={meetingUrl ?? ""} placeholder="https://meet.google.com/…" />
            <FieldMessage errors={errors.meetingUrl} />
          </div>
        )}
      </FormDialog>

      {status === "CONFIRMED" && (
        <FormDialog
          trigger={
            <Button size="sm" variant="outline" className="h-8 rounded-full px-3">
              <CalendarClockIcon /> الموعد
            </Button>
          }
          title="تغيير موعد الجلسة"
          description="بتوقيت بغداد. يوصل العضو بريد بالموعد الجديد. باقي جلسات الباقة ما تتغير."
          submitLabel="تغيير"
          action={rescheduleBooking}
          extra={{ bookingId }}
        >
          {(errors) => (
            <div className="grid gap-1.5">
              <Label htmlFor={`re-${bookingId}`}>الموعد الجديد</Label>
              <Input id={`re-${bookingId}`} name="startsAt" type="datetime-local" dir="ltr" required />
              <FieldMessage errors={errors.startsAt} />
            </div>
          )}
        </FormDialog>
      )}
    </div>
  );
}
