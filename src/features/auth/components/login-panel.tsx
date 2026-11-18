"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { devSignIn, signInWithGoogle } from "../actions";

export type LoginOptions = { googleEnabled: boolean; devLoginEnabled: boolean };

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

/** Google sign-in (plus the dev-only email form locally). Used by /login and the login dialog. */
export function LoginPanel({ next, googleEnabled, devLoginEnabled }: LoginOptions & { next: string }) {
  const [googleState, googleAction, googlePending] = useActionState(signInWithGoogle, null);
  const [devState, devAction, devPending] = useActionState(devSignIn, null);

  return (
    <div className="flex flex-col gap-5">
      <form action={googleAction}>
        <input type="hidden" name="next" value={next} />
        <Button
          type="submit"
          size="lg"
          variant="outline"
          disabled={!googleEnabled || googlePending}
          className="h-12 w-full rounded-full border-2 border-foreground text-base"
        >
          {googlePending ? <Spinner /> : <GoogleIcon />}
          الدخول بحساب Google
        </Button>
        {!googleEnabled && (
          <p className="mt-2 text-center text-xs text-muted-foreground">Google غير مفعّل على هذي البيئة بعد.</p>
        )}
        {googleState && !googleState.ok && (
          <p role="alert" className="mt-2 text-center text-sm text-destructive">
            {googleState.error}
          </p>
        )}
      </form>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        ما نطلب منك كلمة مرور. اسمك وبريدك يبقون خاصين وما ينعرضون للناس.
      </p>

      {devLoginEnabled && (
        <form action={devAction} className="flex flex-col gap-3 rounded-2xl border border-dashed p-4">
          <p className="text-xs font-semibold text-muted-foreground">دخول تجريبي (بيئة التطوير فقط)</p>
          <input type="hidden" name="next" value={next} />
          <div className="grid gap-1.5">
            <Label htmlFor="dev-name">الاسم</Label>
            <Input id="dev-name" name="name" defaultValue="عضو تجريبي" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="dev-email">البريد</Label>
            <Input id="dev-email" name="email" type="email" dir="ltr" defaultValue="member@shlonek.local" required />
          </div>
          <Button type="submit" variant="secondary" disabled={devPending}>
            {devPending && <Spinner />}
            دخول تجريبي
          </Button>
          {devState && !devState.ok && (
            <p role="alert" className="text-sm text-destructive">
              {devState.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
