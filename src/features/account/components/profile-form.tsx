"use client";

import { useActionState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { requestAccountDeletion, updateProfile } from "../actions";

type Profile = { phone: string | null; contactByEmail: boolean; contactByPhone: boolean; deletionRequested: boolean };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success(state.message ?? "تم");
    else toast.error(state.error);
  }, [state]);

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="sketch-card flex flex-col gap-5 p-6">
        <div className="grid gap-1.5">
          <Label htmlFor="phone">رقم الهاتف (اختياري)</Label>
          <Input id="phone" name="phone" dir="ltr" inputMode="tel" defaultValue={profile.phone ?? ""} placeholder="+964 7xx xxx xxxx" className="h-11 rounded-xl" />
          <p className="text-xs text-muted-foreground">خاص بالفريق فقط، وما ينعرض للعامة.</p>
        </div>
        <label className="flex items-center justify-between gap-3">
          <span>تواصلوا وياي عبر البريد</span>
          <Switch name="contactByEmail" defaultChecked={profile.contactByEmail} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>تواصلوا وياي عبر الهاتف</span>
          <Switch name="contactByPhone" defaultChecked={profile.contactByPhone} />
        </label>
        <Button type="submit" disabled={pending} className="self-start rounded-full px-6">
          {pending && <Spinner />}
          حفظ
        </Button>
      </form>

      <div className="rounded-3xl border-2 border-dashed border-destructive/40 p-6">
        <p className="font-bold">حذف الحساب</p>
        <p className="mt-1 text-sm text-muted-foreground">
          نراجع الطلب حسب سياسة الخصوصية. سجلات الشراء المالية تنحفظ حسب القانون.
        </p>
        {profile.deletionRequested ? (
          <p className="mt-3 text-sm font-semibold">وصلنا طلبك، وراح نتواصل وياك.</p>
        ) : (
          <Button
            variant="destructive"
            className="mt-3 rounded-full"
            disabled={deleting}
            onClick={() =>
              startDelete(async () => {
                const r = await requestAccountDeletion();
                if (r.ok) toast.success(r.message ?? "تم");
                else toast.error(r.error);
              })
            }
          >
            طلب حذف الحساب
          </Button>
        )}
      </div>
    </div>
  );
}
