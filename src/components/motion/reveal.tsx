"use client";

import type { ReactNode } from "react";
import { m, type HTMLMotionProps } from "motion/react";

/** Fades/slides content in once when it scrolls into view. Transform + opacity only (GPU-friendly). */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  ...props
}: { children: ReactNode; delay?: number; y?: number } & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <m.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 180, damping: 26, delay }}
      {...props}
    >
      {children}
    </m.div>
  );
}
