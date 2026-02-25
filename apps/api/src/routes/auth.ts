import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { colleagues } from "@humans/db/schema";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  SESSION_REFRESH_THRESHOLD_SECONDS,
  OAUTH_STATE_TTL_SECONDS,
  ERROR_CODES,
} from "@humans/shared";
import { logError } from "../lib/logger";
import type { AppContext } from "../types";

const tokenResponseSchema = z.object({ access_token: z.string() });
const googleUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  picture: z.string(),
});
const meSessionSchema = z.object({ colleagueId: z.string(), ip: z.string().optional(), refreshedAt: z.number().optional() });

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
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

auth.get("/auth/google/callback", async (c) => {
  const loginUrl = `${c.env.APP_URL}/login`;

  try {
    // Google sends ?error= when user cancels or an error occurs
    const googleError = c.req.query("error");
    if (googleError != null) {
      const code =
        googleError === "access_denied"
          ? ERROR_CODES.AUTH_OAUTH_CANCELLED
          : ERROR_CODES.AUTH_OAUTH_TOKEN_FAILED;
      logError("Google OAuth error", { code, message: `Google error: ${googleError}` });
      return c.redirect(`${loginUrl}?error=${code}`);
    }

    const code = c.req.query("code");
    const state = c.req.query("state");

    if (code == null || state == null) {
      logError("OAuth callback missing params", { code: ERROR_CODES.AUTH_OAUTH_MISSING_PARAMS });
      return c.redirect(`${loginUrl}?error=${ERROR_CODES.AUTH_OAUTH_MISSING_PARAMS}`);
    }

    // Verify state
    const storedState = await c.env.SESSIONS.get(`oauth_state:${state}`);
    if (storedState == null) {
      logError("OAuth invalid state", { code: ERROR_CODES.AUTH_OAUTH_INVALID_STATE });
      return c.redirect(`${loginUrl}?error=${ERROR_CODES.AUTH_OAUTH_INVALID_STATE}`);
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
      logError("OAuth token exchange failed", { code: ERROR_CODES.AUTH_OAUTH_TOKEN_FAILED });
      return c.redirect(`${loginUrl}?error=${ERROR_CODES.AUTH_OAUTH_TOKEN_FAILED}`);
    }

    const tokens = tokenResponseSchema.parse(await tokenRes.json());

    // Get user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      logError("OAuth user info failed", { code: ERROR_CODES.AUTH_OAUTH_USER_INFO_FAILED });
      return c.redirect(`${loginUrl}?error=${ERROR_CODES.AUTH_OAUTH_USER_INFO_FAILED}`);
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
        logError("OAuth access denied - unknown email", {
          code: ERROR_CODES.AUTH_ACCESS_DENIED,
          message: googleUser.email,
        });
        return c.redirect(`${loginUrl}?error=${ERROR_CODES.AUTH_ACCESS_DENIED}`);
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
      logError("OAuth account deactivated", {
        code: ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED,
        message: colleague.email,
      });
      return c.redirect(`${loginUrl}?error=${ERROR_CODES.AUTH_ACCOUNT_DEACTIVATED}`);
    }

    // Create session
    const sessionToken = crypto.randomUUID();
    await c.env.SESSIONS.put(
      `session:${sessionToken}`,
      JSON.stringify({
        colleagueId: colleague.id,
        email: colleague.email,
        role: colleague.role,
        refreshedAt: Date.now(),
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
  } catch (err) {
    logError("OAuth unexpected error", {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
    });
    return c.redirect(`${loginUrl}?error=${ERROR_CODES.INTERNAL_ERROR}`);
  }
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

  // Sliding session refresh
  const now = Date.now();
  const age = session.refreshedAt != null ? (now - session.refreshedAt) / 1000 : Infinity;
  if (age > SESSION_REFRESH_THRESHOLD_SECONDS) {
    void c.env.SESSIONS.put(
      `session:${sessionToken}`,
      JSON.stringify({ ...session, refreshedAt: now }),
      { expirationTtl: SESSION_TTL_SECONDS },
    );
  }

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
