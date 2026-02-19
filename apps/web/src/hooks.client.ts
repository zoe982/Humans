import type { HandleClientError } from "@sveltejs/kit";

export const handleError: HandleClientError = ({ error }) => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[client]", JSON.stringify({
    message: err.message,
    stack: err.stack,
  }));

  return {
    message: err.message || "An unexpected error occurred",
  };
};
