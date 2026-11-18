"use client";

import { useEffect, useState } from "react";

/** The year is read after mount, so the cached/prerendered footer never shows a stale one. */
export function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only clock read
  useEffect(() => setYear(new Date().getFullYear()), []);
  return <span>{year}</span>;
}
