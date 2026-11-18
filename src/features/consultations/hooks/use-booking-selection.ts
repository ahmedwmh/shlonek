"use client";

import { useCallback, useMemo, useState } from "react";
import { baghdadDayStart, packageWeekRange, suggestPackageSlots } from "../package-weeks";
import { monthOf, type Month } from "../lib/calendar";

export type SlotTimes = { startsAt: string; endsAt: string };

/**
 * Selection state for the booking wizard (one owner for every piece of UI state).
 * Flow: pick a day on the calendar → pick a time → review.
 * Single: one pick. Package: pick the first session; the rest are suggested one per
 * package week and each can be changed within its own week.
 */
export function useBookingSelection(slots: SlotTimes[], sessions: number) {
  const startsMs = useMemo(() => slots.map((s) => Date.parse(s.startsAt)), [slots]);

  /** Available slot times grouped by Baghdad day. */
  const days = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const ms of startsMs) {
      const day = baghdadDayStart(ms);
      map.set(day, [...(map.get(day) ?? []), ms]);
    }
    return map;
  }, [startsMs]);

  const firstDay = useMemo(() => (days.size ? Math.min(...days.keys()) : null), [days]);
  const lastDay = useMemo(() => (days.size ? Math.max(...days.keys()) : null), [days]);

  const [picks, setPicks] = useState<(number | null)[]>([]);
  const [activeSession, setActiveSession] = useState(0);
  // Step 1 shows the whole calendar with nothing selected.
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [month, setMonth] = useState<Month | null>(() => (firstDay != null ? monthOf(firstDay) : null));

  /** The 7-day window the active package session must fall in (null = no limit). */
  const activeWeek = useMemo(() => {
    if (sessions === 1 || activeSession === 0 || picks[0] == null) return null;
    return packageWeekRange(picks[0], activeSession);
  }, [activeSession, picks, sessions]);

  /** Days the member can pick right now. */
  const selectableDays = useMemo(() => {
    const keys = [...days.keys()];
    return new Set(activeWeek ? keys.filter((d) => d >= activeWeek.from && d < activeWeek.to) : keys);
  }, [activeWeek, days]);

  const selectDay = useCallback((day: number) => {
    setActiveDay(day);
    setMonth(monthOf(day));
  }, []);

  const chooseTime = useCallback(
    (ms: number) => {
      if (sessions === 1) return setPicks([ms]);
      if (activeSession === 0) {
        // A new first session re-suggests the following weeks.
        setPicks(suggestPackageSlots(ms, sessions, startsMs));
        return;
      }
      setPicks((prev) => prev.map((p, i) => (i === activeSession ? ms : p)));
    },
    [activeSession, sessions, startsMs],
  );

  /** Package: switch which session the calendar is editing. */
  const editSession = useCallback(
    (index: number) => {
      setActiveSession(index);
      const current = picks[index];
      const target =
        current != null ? baghdadDayStart(current) : index > 0 && picks[0] != null ? packageWeekRange(picks[0], index).from : null;
      setActiveDay(current != null ? target : null);
      if (target != null) setMonth(monthOf(target));
    },
    [picks],
  );

  /** Restores a saved selection (after sign-in) if every slot is still free. */
  const restore = useCallback(
    (list: number[]) => {
      const free = new Set(startsMs);
      if (list.length !== sessions || list.some((ms) => !free.has(ms))) return false;
      const day = baghdadDayStart(list[0]);
      setPicks(list);
      setActiveSession(0);
      setActiveDay(day);
      setMonth(monthOf(day));
      return true;
    },
    [sessions, startsMs],
  );

  const complete = picks.length === sessions && picks.every((p) => p != null);
  const step: 1 | 2 | 3 = complete ? 3 : activeDay != null ? 2 : 1;

  return {
    days,
    firstDay,
    lastDay,
    month,
    setMonth,
    activeDay,
    selectDay,
    activeSession,
    activeWeek,
    editSession,
    selectableDays,
    picks,
    chooseTime,
    restore,
    complete,
    step,
    selectedIso: complete ? picks.map((p) => new Date(p!).toISOString()) : [],
  };
}
