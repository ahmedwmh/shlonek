/**
 * Uniform return type for Server Actions so forms can render field errors
 * and messages without throwing across the network boundary.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export const ok = <T = undefined>(data?: T, message?: string): ActionResult<T> => ({
  ok: true,
  data: data as T,
  message,
});

export const fail = (error: string, fieldErrors?: Record<string, string[] | undefined>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

/** Thrown inside services for expected, user-facing failures. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export const GENERIC_ERROR = "صار خلل بسيط، حاول مرة ثانية.";

/** Maps unknown errors to a safe message — internals never leak to the client. */
export function toFailure(error: unknown): ActionResult<never> {
  if (error instanceof UserFacingError) return fail(error.message);
  console.error(error);
  return fail(GENERIC_ERROR);
}
