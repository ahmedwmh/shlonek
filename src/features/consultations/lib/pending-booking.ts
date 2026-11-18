/**
 * Keeps the member's chosen slot(s) across the sign-in round trip (Google or dev
 * login leave the page). Session storage only, short-lived, and re-validated against
 * live availability when restored — never trusted as a booking.
 */
const TTL_MS = 30 * 60_000;
const key = (serviceId: string) => `shlonek:pending-booking:${serviceId}`;

export const RESUME_PARAM = "resume";

export function savePendingBooking(serviceId: string, starts: number[]) {
  try {
    sessionStorage.setItem(key(serviceId), JSON.stringify({ starts, at: Date.now() }));
  } catch {
    /* storage unavailable: the member just picks again */
  }
}

export function takePendingBooking(serviceId: string): number[] | null {
  try {
    const raw = sessionStorage.getItem(key(serviceId));
    sessionStorage.removeItem(key(serviceId));
    if (!raw) return null;
    const data = JSON.parse(raw) as { starts?: unknown; at?: unknown };
    if (typeof data.at !== "number" || Date.now() - data.at > TTL_MS) return null;
    if (!Array.isArray(data.starts) || !data.starts.every((n) => typeof n === "number")) return null;
    return data.starts as number[];
  } catch {
    return null;
  }
}
