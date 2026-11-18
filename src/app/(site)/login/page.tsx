import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Character } from "@/components/brand/character";
import { features } from "@/lib/env";
import { getViewer } from "@/lib/auth/dal";
import { safeNext } from "@/lib/safe-next";
import { LoginPanel } from "@/features/auth/components/login-panel";

export const metadata: Metadata = { title: "تسجيل الدخول", robots: { index: false } };

async function LoginContent({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  if (await getViewer()) redirect(next);

  return (
    <>
      {params.error && (
        <p role="alert" className="rounded-2xl bg-destructive/10 p-3 text-center text-sm text-destructive">
          ما كمل تسجيل الدخول. جرّب مرة ثانية.
        </p>
      )}
      <LoginPanel next={next} googleEnabled={features.supabaseAuth} devLoginEnabled={features.devLogin} />
    </>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="shell flex justify-center py-16">
      <div className="sketch-card flex w-full max-w-md flex-col gap-6 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Character name="welcoming" className="h-28 w-auto" />
          <h1 className="text-2xl font-bold">هلا بيك!</h1>
          <p className="text-muted-foreground">سجّل حتى نحفظ نشاطك، حجوزاتك ونتائجك.</p>
        </div>
        <Suspense fallback={<div className="h-12 animate-pulse rounded-full bg-muted" />}>
          <LoginContent {...props} />
        </Suspense>
      </div>
    </div>
  );
}
