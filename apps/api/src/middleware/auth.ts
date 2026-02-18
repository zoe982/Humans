import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { SESSION_COOKIE_NAME } from "@humans/shared";
import type { AppContext, SessionData } from "../types";
import { getCookie } from "hono/cookie";

export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

  if (!sessionToken) {
    throw new HTTPException(401, { message: "Authentication required" });
  }

  const sessionJson = await c.env.SESSIONS.get(`session:${sessionToken}`);
  if (!sessionJson) {
    throw new HTTPException(401, { message: "Invalid or expired session" });
  }

  const session = JSON.parse(sessionJson) as SessionData;
  c.set("session", session);
  await next();
});
