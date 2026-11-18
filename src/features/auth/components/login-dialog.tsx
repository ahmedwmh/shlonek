"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo } from "@/components/brand/logo";
import { useAuthDialog } from "../store";
import { LoginPanel, type LoginOptions } from "./login-panel";

/** Mounted once in the site layout; opened from anywhere via `useAuthDialog().show()`. */
export function LoginDialog(options: LoginOptions) {
  const { open, next, reason, setOpen } = useAuthDialog();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="rounded-3xl border-2 border-foreground sm:max-w-md">
        <DialogHeader className="items-center gap-3 text-center">
          <Logo className="h-6 w-auto" />
          <DialogTitle className="text-xl">هلا بيك! سجّل دخولك</DialogTitle>
          <DialogDescription>{reason ?? "سجّل حتى نحفظ نشاطك ونرجعك لنفس المكان."}</DialogDescription>
        </DialogHeader>
        <LoginPanel next={next} {...options} />
      </DialogContent>
    </Dialog>
  );
}
