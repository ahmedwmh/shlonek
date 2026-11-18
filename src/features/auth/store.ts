"use client";

import { create } from "zustand";

/**
 * Login dialog state. Any component can ask for sign-in with the path to return
 * to, so the member lands back on the same service after Google.
 */
type AuthDialogState = {
  open: boolean;
  next: string;
  reason: string | null;
  show: (next: string, reason?: string) => void;
  setOpen: (open: boolean) => void;
};

export const useAuthDialog = create<AuthDialogState>((set) => ({
  open: false,
  next: "/",
  reason: null,
  show: (next, reason) => set({ open: true, next, reason: reason ?? null }),
  setOpen: (open) => set({ open }),
}));
