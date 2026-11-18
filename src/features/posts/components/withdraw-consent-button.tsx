"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { withdrawConsent } from "../actions";

export function WithdrawConsentButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="rounded-full" disabled={pending}>
          سحب موافقة النشر
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>تسحب موافقتك على النشر؟</AlertDialogTitle>
          <AlertDialogDescription>
            راح نشيل النسخة العامة فوراً. رسالتك الخاصة تبقى عند الفريق مثل ما هي.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">لا، خليها</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-full"
            onClick={() =>
              start(async () => {
                const result = await withdrawConsent(postId);
                if (result.ok) {
                  toast.success(result.message ?? "تم");
                  router.refresh();
                } else toast.error(result.error);
              })
            }
          >
            نعم، اسحب الموافقة
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
