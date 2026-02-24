import { browser } from "$app/environment";

interface DiagnosticError { time: string; message: string; stack?: string; source?: string }

const errors: DiagnosticError[] = [];
let onErrorCallback: ((errors: DiagnosticError[]) => void) | null = null;

/** Record a client-side error for diagnostics. */
export function recordError(message: string, stack?: string, source?: string): void {
  errors.push({ time: new Date().toISOString(), message, stack, source });
  if (errors.length > 20) errors.splice(0, errors.length - 20);
  onErrorCallback?.(errors);
}

/** Get all captured errors. */
export function getCapturedErrors(): DiagnosticError[] {
  return errors;
}

/** Register a callback for when errors are recorded. */
export function onErrorRecorded(cb: (errors: DiagnosticError[]) => void): void {
  onErrorCallback = cb;
}

/** Install global error handlers (call once from hooks.client.ts or layout onMount). */
export function installGlobalErrorHandlers(): void {
  if (!browser) return;

  window.addEventListener("error", (event) => {
    recordError(
      event.message,
      event.error instanceof Error ? event.error.stack : undefined,
      `window.onerror at ${event.filename}:${String(event.lineno)}`,
    );
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    recordError(message, stack, "unhandledrejection");
  });
}

/** Build a diagnostic report string. */
export function buildDiagnosticReport(reason: string): string {
  const recent = errors.slice(-5);
  const lines = [
    `BLANK PAGE DETECTED: ${reason}`,
    `URL: ${window.location.href}`,
    `Time: ${new Date().toISOString()}`,
    `UA: ${navigator.userAgent.slice(0, 120)}`,
  ];

  if (recent.length > 0) {
    lines.push("", "--- Captured Errors ---");
    for (const err of recent) {
      lines.push(`[${err.time}] (${err.source ?? "unknown"}) ${err.message}`);
      if (err.stack !== undefined) {
        const stackLines = err.stack.split("\n").slice(0, 3).join("\n  ");
        lines.push(`  ${stackLines}`);
      }
    }
  } else {
    lines.push("", "No JavaScript errors captured.");
  }

  return lines.join("\n");
}
