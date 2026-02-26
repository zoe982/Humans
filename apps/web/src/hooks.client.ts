import type { HandleClientError } from "@sveltejs/kit";
import { recordError, installGlobalErrorHandlers } from "$lib/client-diagnostics";

// Install global error handlers (window.onerror, unhandledrejection)
installGlobalErrorHandlers();

/** Serialize an unknown thrown value into a useful message string. */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  // Detect SvelteKit Redirect objects (thrown by redirect())
  if (typeof error === "object" && error !== null && "status" in error && "location" in error) {
    const r = error as { status: unknown; location: unknown };
    return `Redirect(${String(r.status)}, ${String(r.location)})`;
  }
  // Detect SvelteKit HttpError objects (thrown by error())
  if (typeof error === "object" && error !== null && "status" in error && "body" in error) {
    const h = error as { status: unknown; body: unknown };
    return `HttpError(${String(h.status)}, ${JSON.stringify(h.body)})`;
  }
  // For other objects, try JSON serialization before falling back to String()
  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return Object.prototype.toString.call(error);
    }
  }
  return String(error);
}

export const handleError: HandleClientError = ({ error }) => {
  const message = describeError(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error("[client]", JSON.stringify({ message, stack }));

  // Feed into diagnostics system
  recordError(message, stack, "SvelteKit handleError");

  return {
    message: message !== "" ? message : "An unexpected error occurred",
  };
};
