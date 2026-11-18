"use client";

import { useCallback, useEffect, useState } from "react";

type Area = "local" | "session";
const storage = (area: Area) => (area === "session" ? window.sessionStorage : window.localStorage);

/**
 * `useState` mirrored to Web Storage, for unsent drafts. Storage can be blocked
 * (private mode, quota), so every access is guarded and the UI works without it.
 * Use "session" for private text so it disappears when the tab closes.
 */
export function usePersistentState<T>(key: string, initial: T, area: Area = "local") {
  const [value, setValue] = useState<T>(initial);

  // Hydrate after mount to keep server and client markup identical.
  useEffect(() => {
    try {
      const raw = storage(area).getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* storage unavailable */
    }
  }, [key, area]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          storage(area).setItem(key, JSON.stringify(resolved));
        } catch {
          /* storage unavailable */
        }
        return resolved;
      });
    },
    [key, area],
  );

  const clear = useCallback(() => {
    setValue(initial);
    try {
      storage(area).removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }, [key, initial, area]);

  return [value, update, clear] as const;
}
