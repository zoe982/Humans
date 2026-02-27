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
      const data: unknown = await res.json().catch(() => null);
      if (res.ok) {
        event.locals.user = isUserResponse(data) ? data.user : null;
      } else {
        event.locals.user = null;
        // Clear stale cookie so subsequent page loads skip the dead session
        event.cookies.delete("humans_session", { path: "/" });
      }
    } catch (err) {
      console.error("[hooks.server] Auth fetch failed:", err instanceof Error ? err.message : String(err));
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
  }

  const response = await resolve(event);
  // Prevent browser from caching SSR pages (critical for CRM data freshness)
  response.headers.set("Cache-Control", "no-store");
  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
};

export const handleError: HandleServerError = ({ error, event }) => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[server]", JSON.stringify({
    message: err.message,
    stack: err.stack,
  }));

  // Report SSR errors to error log
  try {
    const payload = {
      message: `SSR handleError: ${err.message}`,
      url: event.url.pathname,
      errors: [{ type: "ssr-crash", message: err.message, stack: err.stack ?? "" }],
    };
    // Use waitUntil-like pattern: don't await but don't lose the reference.
    // Cancel the response body to free the TCP connection immediately
    // (Cloudflare Workers limit: 6 concurrent outbound connections).
    fetch(`${API_BASE}/api/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then((r) => { r.body?.cancel(); }).catch(() => { /* noop */ });
  } catch {
    // Ignore diagnostic failures
  }

  return {
    message: err.message !== "" ? err.message : "An unexpected error occurred",
  };
};
