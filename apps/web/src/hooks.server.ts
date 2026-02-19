import type { Handle, HandleServerError } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";
import { env } from "$env/dynamic/private";

const API_BASE = PUBLIC_API_URL !== "" ? PUBLIC_API_URL : "http://localhost:8787";

function isUserResponse(value: unknown): value is { user: App.Locals["user"] } {
  return typeof value === "object" && value !== null && "user" in value;
}

export const handle: Handle = async ({ event, resolve }) => {
  // Test-only auth bypass: set a synthetic user so E2E tests can reach
  // authenticated pages without a real OAuth flow.
  if (env["TEST_BYPASS_AUTH"] === "1") {
    event.locals.user = {
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      role: "admin",
      avatarUrl: null,
    };
    return resolve(event);
  }

  const sessionCookie = event.cookies.get("humans_session");

  if (sessionCookie != null && sessionCookie !== "") {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Cookie: `humans_session=${sessionCookie}`,
        },
      });
      if (res.ok) {
        const data: unknown = await res.json();
        event.locals.user = isUserResponse(data) ? data.user : null;
      } else {
        event.locals.user = null;
      }
    } catch (err) {
      console.error("[hooks.server] Auth fetch failed:", err instanceof Error ? err.message : String(err));
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
  }

  return resolve(event);
};

export const handleError: HandleServerError = ({ error }) => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[server]", JSON.stringify({
    message: err.message,
    stack: err.stack,
  }));

  return {
    message: err.message || "An unexpected error occurred",
  };
};
