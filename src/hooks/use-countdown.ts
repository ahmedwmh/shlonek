"use client";

import { useEffect, useState } from "react";

/** Seconds left until `deadline` (ISO string), ticking every second; null when no deadline. */
export function useCountdown(deadline: string | null) {
  // Starts empty and reads the clock after mount, so server and client markup match.
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(Math.max(0, Math.floor((Date.parse(deadline) - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const label = left === null ? "" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return { secondsLeft: left, label, expired: left === 0 };
}
