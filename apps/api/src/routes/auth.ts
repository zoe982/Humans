import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { users } from "@humans/db/schema";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  OAUTH_STATE_TTL_SECONDS,
} from "@humans/shared";
import type { AppContext } from "../types";

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

  if (!code || !state) {
    return c.json({ error: "Missing code or state" }, 400);
  }

  // Verify state
  const storedState = await c.env.SESSIONS.get(`oauth_state:${state}`);
  if (!storedState) {
    return c.json({ error: "Invalid or expired state" }, 400);
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
    return c.json({ error: "Token exchange failed" }, 400);
  }

  const tokens = (await tokenRes.json()) as { access_token: string };

  // Get user info
  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    return c.json({ error: "Failed to get user info" }, 400);
  }

  const googleUser = (await userInfoRes.json()) as {
    id: string;
    email: string;
    name: string;
    picture: string;
  };

  const db = c.get("db");

  // Look up user by googleId or email
  let user = await db.query.users.findFirst({
    where: eq(users.googleId, googleUser.id),
  });

  if (!user) {
    user = await db.query.users.findFirst({
      where: eq(users.email, googleUser.email),
    });

    if (!user) {
      return c.json({ error: "Access denied. Contact an admin to get an account." }, 403);
    }

    // First Google login - populate googleId and avatar
    await db
      .update(users)
      .set({
        googleId: googleUser.id,
        avatarUrl: googleUser.picture,
        name: googleUser.name,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));
  }

  if (!user.isActive) {
    return c.json({ error: "Account is deactivated" }, 403);
  }

  // Create session
  const sessionToken = crypto.randomUUID();
  await c.env.SESSIONS.put(
    `session:${sessionToken}`,
    JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
    }),
    { expirationTtl: SESSION_TTL_SECONDS },
  );

  setCookie(c, SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return c.redirect(c.env.APP_URL);
});

auth.post("/auth/logout", async (c) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  if (sessionToken) {
    await c.env.SESSIONS.delete(`session:${sessionToken}`);
  }
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  return c.json({ success: true });
});

auth.get("/auth/me", async (c) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionToken) {
    return c.json({ user: null });
  }

  const sessionJson = await c.env.SESSIONS.get(`session:${sessionToken}`);
  if (!sessionJson) {
    return c.json({ user: null });
  }

  const session = JSON.parse(sessionJson) as { userId: string };
  const db = c.get("db");
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      role: true,
    },
  });

  return c.json({ user: user ?? null });
});

export { auth };
