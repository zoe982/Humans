import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS, SESSION_REFRESH_THRESHOLD_SECONDS } from "@humans/shared";
import type { AppContext } from "../types";
import { getCookie } from "hono/cookie";

const sessionSchema = z.object({
  colleagueId: z.string(),
  email: z.string(),
  role: z.string(),
  ip: z.string().optional(),
  refreshedAt: z.number().optional(),
});

export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);

  if (sessionToken == null || sessionToken === "") {
    throw new HTTPException(401, { message: "Authentication required" });
  }

  const sessionJson = await c.env.SESSIONS.get(`session:${sessionToken}`);
  if (sessionJson == null) {
    throw new HTTPException(401, { message: "Invalid or expired session" });
  }

  const session = sessionSchema.parse(JSON.parse(sessionJson) as unknown);

  // Sliding session refresh: re-PUT with fresh TTL if refreshedAt is stale or absent
  const now = Date.now();
  const age = session.refreshedAt != null ? (now - session.refreshedAt) / 1000 : Infinity;
  if (age > SESSION_REFRESH_THRESHOLD_SECONDS) {
    const refreshed = { ...session, refreshedAt: now };
    // Fire-and-forget — don't block the response on KV write
    void c.env.SESSIONS.put(
      `session:${sessionToken}`,
      JSON.stringify(refreshed),
      { expirationTtl: SESSION_TTL_SECONDS },
    );
  }

  c.set("session", session);
  await next();
});
