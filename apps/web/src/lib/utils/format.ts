/** Format a date string as relative time (e.g., "5m ago", "2h ago", "3d ago") */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/** Summarize audit log changes into a readable string */
export function summarizeChanges(changes: Record<string, { old: unknown; new: unknown }> | null): string {
  if (!changes) return "No details";
  return Object.entries(changes)
    .map(([field, diff]) => {
      const oldVal = Array.isArray(diff.old) ? diff.old.join(", ") : String(diff.old ?? "empty");
      const newVal = Array.isArray(diff.new) ? diff.new.join(", ") : String(diff.new ?? "empty");
      return `${field}: "${oldVal}" \u2192 "${newVal}"`;
    })
    .join("; ");
}

/** Build a display name from name parts */
export function displayName(parts: { firstName: string; middleName?: string | null; lastName: string }): string {
  return [parts.firstName, parts.middleName, parts.lastName].filter(Boolean).join(" ");
}
