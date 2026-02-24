/** Format a date string as date + time in the user's local timezone, 24h format (e.g., "18/02/2026, 21:03") */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format a date string as date-only in the user's local timezone (e.g., "18/02/2026") */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Format a date string as relative time (e.g., "5m ago", "2h ago", "3d ago") */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${String(diffMins)}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${String(diffHours)}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${String(diffDays)}d ago`;
}

function unknownToString(value: unknown): string {
  if (Array.isArray(value)) return (value as unknown[]).join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  if (value == null) return "empty";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return String(value);
  return "empty";
}

/** Summarize audit log changes into a readable string */
export function summarizeChanges(changes: Record<string, { old: unknown; new: unknown }> | null): string {
  if (changes == null) return "No details";
  return Object.entries(changes)
    .map(([field, diff]) => {
      const oldVal = unknownToString(diff.old);
      const newVal = unknownToString(diff.new);
      return `${field}: "${oldVal}" \u2192 "${newVal}"`;
    })
    .join("; ");
}

/** Build a display name from name parts */
export function displayName(parts: { firstName: string; middleName?: string | null; lastName: string }): string {
  return [parts.firstName, parts.middleName, parts.lastName].filter(Boolean).join(" ");
}
