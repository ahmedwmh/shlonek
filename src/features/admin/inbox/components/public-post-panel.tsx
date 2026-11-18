"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmButton } from "../../shared/components/confirm-button";
import { FieldMessage } from "../../shared/components/field-error";
import { useAdminAction } from "../../shared/use-admin-action";
import { hidePublicPost, publishPublicPost, rejectPublicPost, savePublicText } from "../actions";

/**
 * Redact → publish workflow. The member's original text is never edited here;
 * staff only shape the anonymous public copy.
 */
export function PublicPostPanel({
  postId,
  text,
  status,
  canPublish,
}: {
  postId: string;
  text: string;
  status: string;
  canPublish: boolean;
}) {
  const [draft, setDraft] = useState(text);
  const [reason, setReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const save = useAdminAction();
  const act = useAdminAction();
  const dirty = draft.trim() !== text.trim();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        احذف أي اسم، رقم، عنوان، رابط أو تفصيل يكشف صاحب الرسالة قبل النشر.
      </p>
      <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={7} aria-label="النص العام المنقّح" />
      <FieldMessage errors={save.fieldErrors.text} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty || save.pending}
          onClick={() => save.run(() => savePublicText({ postId, text: draft }))}
        >
          {save.pending && <Spinner />}
          حفظ النص المنقّح
        </Button>
        {status !== "PUBLISHED" && (
          <ConfirmButton
            variant="default"
            title="نشر المشاركة بدون هوية؟"
            description="راح يظهر النص المنقّح فقط بالصفحة الرئيسية، بدون اسم أو أي رابط بالحساب."
            confirmLabel="انشر"
            pending={act.pending}
            onConfirm={() => act.run(() => publishPublicPost(postId))}
          >
            نشر
          </ConfirmButton>
        )}
        {status === "PUBLISHED" && (
          <ConfirmButton
            title="إخفاء المشاركة من الموقع؟"
            confirmLabel="إخفاء"
            pending={act.pending}
            onConfirm={() => act.run(() => hidePublicPost(postId))}
          >
            إخفاء
          </ConfirmButton>
        )}
        {status !== "REJECTED" && (
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-destructive">
                رفض
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>رفض النشر</DialogTitle>
                <DialogDescription>السبب يبقى داخلي للفريق.</DialogDescription>
              </DialogHeader>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} aria-label="سبب الرفض" />
              <FieldMessage errors={act.fieldErrors.reason} />
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={act.pending}
                  onClick={() =>
                    act.run(() => rejectPublicPost({ postId, reason }), { onSuccess: () => setRejectOpen(false) })
                  }
                >
                  {act.pending && <Spinner />}
                  رفض
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {!canPublish && (
        <p className="text-sm text-destructive">صاحب الرسالة سحب موافقته على النشر، فما ينفع تنشرها.</p>
      )}
    </div>
  );
}
