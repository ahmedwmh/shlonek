"use client";

import { useCallback } from "react";
import { useAuthDialog } from "../store";

/**
 * Wraps member-only interactions. Returns `true` when the member may proceed;
 * otherwise opens the login dialog pointing back at `next` (default: this page).
 * Reads the URL at call time, so it needs no Suspense boundary.
 */
export function useAuthGate(isSignedIn: boolean) {
  const show = useAuthDialog((s) => s.show);

  return useCallback(
    (options?: { next?: string; reason?: string }) => {
      if (isSignedIn) return true;
      show(options?.next ?? `${window.location.pathname}${window.location.search}`, options?.reason);
      return false;
    },
    [isSignedIn, show],
  );
}
