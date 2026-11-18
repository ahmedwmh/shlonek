"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the server page every few seconds while a payment is being verified. */
export function AutoRefresh({ intervalMs = 4000, maxTries = 30 }: { intervalMs?: number; maxTries?: number }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= maxTries) return;
    const id = setTimeout(() => {
      router.refresh();
      setTries((t) => t + 1);
    }, intervalMs);
    return () => clearTimeout(id);
  }, [tries, maxTries, intervalMs, router]);

  return null;
}
