/** Content types allowed for document uploads */
export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

/**
 * Sanitize a user-provided filename for safe use in R2 keys and
 * Content-Disposition headers. Strips path separators, null bytes,
 * and control characters.
 */
export function sanitizeFilename(name: string): string {
  const sanitized = name
    // Remove path separators
    .replace(/[/\\]/g, "")
    // Remove null bytes and control characters (U+0000 to U+001F)
    // eslint-disable-next-line no-control-regex -- intentionally stripping control chars for filename safety
    .replace(/[\u0000-\u001f]/g, "");

  return sanitized !== "" ? sanitized : "unnamed";
}
