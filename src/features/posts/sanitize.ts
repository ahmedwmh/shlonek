/**
 * Normalises member text before storing: strips control characters and
 * zero-width tricks, collapses runs of blank lines. React escapes output, so
 * this is about clean data, not HTML escaping.
 */
export function cleanText(input: string) {
  return input
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[​-‍⁠﻿]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
