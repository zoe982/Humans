/** Escape characters that have special meaning in PostgREST filter syntax */
export function sanitizePostgrestValue(value: string): string {
  return value.replace(/[,.()"\\]/g, "");
}
