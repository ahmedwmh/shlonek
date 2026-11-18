"use client";

import { useCallback, useRef } from "react";

/**
 * Idempotency key for a mutation. Stays the same across retries of the same
 * attempt (so double clicks dedupe server-side) and is renewed after success.
 */
export function useRequestId() {
  const ref = useRef<string | null>(null);
  const get = useCallback(() => (ref.current ??= crypto.randomUUID()), []);
  const renew = useCallback(() => {
    ref.current = null;
  }, []);
  return { get, renew };
}
