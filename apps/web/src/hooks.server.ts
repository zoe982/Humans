import type { Handle } from "@sveltejs/kit";
import { PUBLIC_API_URL } from "$env/static/public";

const API_BASE = PUBLIC_API_URL ?? "http://localhost:8787";

export const handle: Handle = async ({ event, resolve }) => {
  const sessionCookie = event.cookies.get("humans_session");

  if (sessionCookie) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Cookie: `humans_session=${sessionCookie}`,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as { user: App.Locals["user"] };
        event.locals.user = data.user;
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
