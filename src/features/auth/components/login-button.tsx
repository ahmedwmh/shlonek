"use client";

import { LogInIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthGate } from "../hooks/use-auth-gate";

export function LoginButton() {
  const gate = useAuthGate(false);
  return (
    <Button onClick={() => gate()} className="h-10 rounded-full px-4 text-sm font-semibold">
      <LogInIcon className="rtl:-scale-x-100" />
      تسجيل / دخول
    </Button>
  );
}
