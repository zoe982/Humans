import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { colleagues } from "@humans/db/schema";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  OAUTH_STATE_TTL_SECONDS,
  ERROR_CODES,
} from "@humans/shared";
import { badRequest, forbidden } from "../lib/errors";
import type { AppContext } from "../types";

const tokenResponseSchema = z.object({ access_token: z.string() });
const googleUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  picture: z.string(),
});
const meSessionSchema = z.object({ colleagueId: z.string() });

const auth = new Hono<AppContext>();

auth.get("/auth/google/login", async (c) => {
  const state = crypto.randomUUID();
  await c.env.SESSIONS.put(`oauth_state:${state}`, "1", {
    expirationTtl: OAUTH_STATE_TTL_SECONDS,
  });

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: c.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

auth.get("/auth/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (code == null || state == null) {
    throw badRequest(ERROR_CODES.AUTH_OAUTH_MISSING_PARAMS, "Missing code or state");
  }

  // Verify state
  const storedState = await c.env.SESSIONS.get(`oauth_state:${state}`);
  if (storedState == null) {
    throw badRequest(ERROR_CODES.AUTH_OAUTH_INVALID_STATE, "Invalid or expired state");
  }
  await c.env.SESSIONS.delete(`oauth_state:${state}`);

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: c.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw badRequest(ERROR_CODES.AUTH_OAUTH_TOKEN_FAILED, "Token exchange failed");
  }

  const tokens = tokenResponseSchema.parse(await tokenRes.json());

  // Get user info
  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    throw badRequest(ERROR_CODES.AUTH_OAUTH_USER_INFO_FAILED, "Failed to get user info");
  }

  const googleUser = googleUserSchema.parse(await userInfoRes.json());

  const db = c.get("db");

  // Look up colleague by googleId or email
  let colleague = await db.query.colleagues.findFirst({
    where: eq(colleagues.googleId, googleUser.id),
  });

  if (colleague == null) {
    colleague = await db.query.colleagues.findFirst({
      where: eq(colleagues.email, googleUser.email),
    });

    if (colleague == null) {
      throw forbidden(ERROR_CODES.AUTH_ACCESS_DENIED, `Access denied (debug: google email = ${googleUser.email})`);
    }

    // First Google login - populate googleId and avatar
    await db
      .update(colleagues)
      .set({
        googleId: googleUser.id,
        avatarUrl: googleUser.picture,
        name: googleUser.name,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(colleagues.id, colleague.id));
  }

  if (!colleague.isActive) {
    throw forbidden(ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED, "Account is deactivated");
  }

  // Create session
  const sessionToken = crypto.randomUUID();
  await c.env.SESSIONS.put(
    `session:${sessionToken}`,
    JSON.stringify({
      colleagueId: colleague.id,
      email: colleague.email,
      role: colleague.role,
    }),
    { expirationTtl: SESSION_TTL_SECONDS },
  );

  const appDomain = new URL(c.env.APP_URL).hostname;

  setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    domain: appDomain,
  });

  return c.redirect(c.env.APP_URL);
});

auth.post("/auth/logout", async (c) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  if (sessionToken != null && sessionToken !== "") {
    await c.env.SESSIONS.delete(`session:${sessionToken}`);
  }
  const appDomain = new URL(c.env.APP_URL).hostname;
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/", domain: appDomain });
  return c.json({ success: true });
});

auth.get("/auth/me", async (c) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  if (sessionToken == null || sessionToken === "") {
    return c.json({ user: null });
  }

  const sessionJson = await c.env.SESSIONS.get(`session:${sessionToken}`);
  if (sessionJson == null) {
    return c.json({ user: null });
  }

  const session = meSessionSchema.parse(JSON.parse(sessionJson) as unknown);
  const db = c.get("db");
  const colleague = await db.query.colleagues.findFirst({
    where: eq(colleagues.id, session.colleagueId),
    columns: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
    },
  });

  // Keep "user" response key for web compatibility
  return c.json({ user: colleague ?? null });
});

export { auth };
