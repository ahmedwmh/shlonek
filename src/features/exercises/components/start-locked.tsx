"use client";

import Link from "next/link";
import { CrownIcon, LogInIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Character } from "@/components/brand/character";
import { useAuthGate } from "@/features/auth/hooks/use-auth-gate";

/** Intro-only view: sign in to start, or premium needed. Questions are not shipped here. */
export function StartLocked({
  reason,
  intro,
  questionCount,
}: {
  reason: "login" | "premium";
  intro: string;
  questionCount: number;
}) {
  const gate = useAuthGate(false);

  return (
    <div className="sketch-card flex flex-col items-center gap-5 p-8 text-center md:p-12">
      <Character name={reason === "premium" ? "curious" : "welcoming"} className="h-36 w-auto" />
      <p className="max-w-prose text-lg leading-8">{intro}</p>
      <p className="text-sm text-muted-foreground">{questionCount} أسئلة · إجاباتك خاصة</p>
      {reason === "login" ? (
        <Button
          onClick={() => gate({ reason: "سجّل حتى تبدأ التمرين وتنحفظ نتيجتك بسجلك." })}
          className="h-12 rounded-full px-8 text-base"
        >
          <LogInIcon className="rtl:-scale-x-100" />
          سجّل وابدأ
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="inline-flex items-center gap-2 font-semibold">
            <CrownIcon className="size-5" /> هذا التمرين للمشتركين ببريميوم
          </p>
          <Button asChild className="h-12 rounded-full px-8 text-base">
            <Link href="/premium">اشترك ببريميوم</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
