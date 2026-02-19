/**
 * Structured JSON logger for Cloudflare Workers.
 * Output goes to Workers Logs (wrangler tail / dashboard).
 */

interface LogEntry {
  level: "info" | "warn" | "error";
  timestamp: string;
  requestId?: string | undefined;
  method?: string | undefined;
  path?: string | undefined;
  userId?: string | undefined;
  message: string;
  code?: string | undefined;
  status?: number | undefined;
  stack?: string | undefined;
  durationMs?: number | undefined;
}

function emit(entry: LogEntry) {
  const fn =
    entry.level === "error"
      ? console.error
      : entry.level === "warn"
        ? console.warn
        : console.log;
  fn(JSON.stringify(entry));
}

export function logInfo(message: string, extra?: Partial<LogEntry>) {
  emit({ level: "info", timestamp: new Date().toISOString(), message, ...extra });
}

export function logWarn(message: string, extra?: Partial<LogEntry>) {
  emit({ level: "warn", timestamp: new Date().toISOString(), message, ...extra });
}

export function logError(message: string, extra?: Partial<LogEntry>) {
  emit({ level: "error", timestamp: new Date().toISOString(), message, ...extra });
}
