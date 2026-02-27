/** Lowercase + trim an email address. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Keep leading `+` and digits only. */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

/** Strip protocol, `www.`, trailing slash, and lowercase. */
export function normalizeUrl(url: string): string {
  let result = url.trim().toLowerCase();
  result = result.replace(/^https?:\/\//, "");
  result = result.replace(/^www\./, "");
  result = result.replace(/\/+$/, "");
  return result;
}

/** Trim whitespace only. */
export function normalizeSocialHandle(handle: string): string {
  return handle.trim();
}
