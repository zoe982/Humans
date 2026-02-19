import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { SESSION_COOKIE_NAME } from "@humans/shared";
import type { AppContext } from "../types";
import { getCookie } from "hono/cookie";

const sessionSchema = z.object({
  userId: z.string(),
  email: z.string(),
  role: z.string(),
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
  c.set("session", session);
  await next();
});
