interface ErrorEntry {
  displayId: string;
  code: string;
  status: number;
  message: string;
  method: string | null;
  path: string | null;
  createdAt: string;
  requestId: string;
  userId: string | null;
  details: unknown;
  stack: string | null;
  resolutionStatus: string;
}

export function formatErrorForClipboard(entry: ErrorEntry): string {
  const lines = [
    `Error: ${entry.displayId}`,
    `Code: ${entry.code}`,
    `HTTP Status: ${entry.status}`,
    `Message: ${entry.message}`,
    `Path: ${entry.method ?? ""} ${entry.path ?? ""}`.trim() || "—",
    `Time: ${entry.createdAt}`,
    `Request ID: ${entry.requestId}`,
    `User ID: ${entry.userId ?? "—"}`,
  ];

  if (entry.details != null) {
    try {
      lines.push(`Details:\n${JSON.stringify(entry.details, null, 2)}`);
    } catch {
      lines.push(`Details:\n${String(entry.details)}`);
    }
  }

  if (entry.stack) {
    lines.push(`Stack Trace:\n${entry.stack}`);
  }

  lines.push(`Resolution: ${entry.resolutionStatus === "resolved" ? "Resolved" : "Open"}`);

  return lines.join("\n");
}
