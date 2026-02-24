import type { HandleClientError } from "@sveltejs/kit";
import { recordError, installGlobalErrorHandlers } from "$lib/client-diagnostics";

// Install global error handlers (window.onerror, unhandledrejection)
installGlobalErrorHandlers();

export const handleError: HandleClientError = ({ error }) => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[client]", JSON.stringify({
    message: err.message,
    stack: err.stack,
  }));

  // Feed into diagnostics system
  recordError(err.message, err.stack, "SvelteKit handleError");

  return {
    message: err.message !== "" ? err.message : "An unexpected error occurred",
  };
};
