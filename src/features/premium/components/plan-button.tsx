"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuthGate } from "@/features/auth/hooks/use-auth-gate";
import { createPremiumOrder } from "../actions";

export function PlanButton({ planId, isSignedIn, label }: { planId: string; isSignedIn: boolean; label: string }) {
  const router = useRouter();
  const gate = useAuthGate(isSignedIn);
  const [pending, start] = useTransition();

  return (
    <Button
      className="h-12 w-full rounded-full text-base"
      disabled={pending}
      onClick={() => {
        if (!gate({ reason: "سجّل حتى تشترك ببريميوم." })) return;
        start(async () => {
          const result = await createPremiumOrder(planId);
          if (result.ok) router.push(`/checkout/${result.data.orderId}`);
          else toast.error(result.error);
        });
      }}
    >
      {pending && <Spinner />}
      {label}
    </Button>
  );
}
