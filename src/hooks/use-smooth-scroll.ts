"use client";

import { useCallback, useEffect, useRef } from "react";

type Options = {
  /** Space to leave above the element (e.g. the sticky header). */
  offset?: number;
  duration?: number;
  /** Skip scrolling when the element's top part is already comfortably on screen. */
  onlyIfNeeded?: boolean;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const CANCEL_EVENTS = ["wheel", "touchstart", "keydown", "mousedown"] as const;

/**
 * Smooth, interruptible scroll to an element: a single rAF loop with ease-out,
 * a header offset, and no fighting the user (any touch/wheel/key cancels it).
 * Honours prefers-reduced-motion by jumping instantly.
 */
export function useSmoothScroll() {
  const frame = useRef(0);
  const cleanup = useRef<() => void>(() => {});

  useEffect(() => () => cleanup.current(), []);

  return useCallback((element: HTMLElement, { offset = 0, duration = 520, onlyIfNeeded = true }: Options = {}) => {
    cleanup.current();

    const rect = element.getBoundingClientRect();
    const viewport = window.innerHeight;
    const visiblePart = Math.min(rect.height, viewport * 0.45);
    if (onlyIfNeeded && rect.top >= offset && rect.top + visiblePart <= viewport) return;

    const start = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - viewport;
    const target = Math.min(maxScroll, Math.max(0, start + rect.top - offset));
    const distance = target - start;
    if (Math.abs(distance) < 2) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo({ top: target });
      return;
    }

    const stop = () => {
      cancelAnimationFrame(frame.current);
      CANCEL_EVENTS.forEach((e) => window.removeEventListener(e, stop));
    };
    cleanup.current = stop;
    CANCEL_EVENTS.forEach((e) => window.addEventListener(e, stop, { passive: true }));

    // Shorter trips take less time, so small moves never feel sluggish.
    const time = Math.min(duration, 220 + Math.abs(distance) * 0.45);
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / time);
      window.scrollTo(0, start + distance * easeOutCubic(p));
      if (p < 1) frame.current = requestAnimationFrame(step);
      else stop();
    };
    frame.current = requestAnimationFrame(step);
  }, []);
}
