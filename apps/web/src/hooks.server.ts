import type { Handle } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

const API_BASE = PUBLIC_API_URL !== "" ? PUBLIC_API_URL : "http://localhost:8787";

function isUserResponse(value: unknown): value is { user: App.Locals["user"] } {
  return typeof value === "object" && value !== null && "user" in value;
}

export const handle: Handle = async ({ event, resolve }) => {
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
    } catch {
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
  }

  return resolve(event);
};
