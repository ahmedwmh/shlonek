"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { DirectionProvider } from "@/components/ui/direction";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/**
 * App-wide client providers.
 * - LazyMotion + `m.*` components keep the animation bundle small (domAnimation only).
 * - reducedMotion="user" honours the OS "reduce motion" setting everywhere.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <DirectionProvider dir="rtl">
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 260, damping: 30 }}>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster />
          </TooltipProvider>
        </MotionConfig>
      </LazyMotion>
    </DirectionProvider>
  );
}
