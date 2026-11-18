/**
 * Turns admin-entered contact values into safe link targets. Only http(s), tel and
 * mailto are ever produced — never `javascript:` or other schemes.
 */
export function safeHttpUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeTel(value: string | null | undefined) {
  const digits = value?.replace(/[^\d+]/g, "") ?? "";
  return digits.length >= 6 ? `tel:${digits}` : null;
}

export function safeMailto(value: string | null | undefined) {
  const email = value?.trim() ?? "";
  return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email) ? `mailto:${email}` : null;
}

export function safeWhatsApp(value: string | null | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}
