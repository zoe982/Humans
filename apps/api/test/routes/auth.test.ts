/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF, env } from "cloudflare:test";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildUser } from "@humans/test-utils";

describe("GET /auth/google/login", () => {
  it("redirects to Google OAuth", async () => {
    const res = await SELF.fetch("http://localhost/auth/google/login", {
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(location).toContain("client_id=test-client-id");
    expect(location).toContain("state=");
  });

  it("stores oauth state in KV", async () => {
    const res = await SELF.fetch("http://localhost/auth/google/login", {
      redirect: "manual",
    });
    const location = res.headers.get("location") ?? "";
    const url = new URL(location);
    const state = url.searchParams.get("state") ?? "";
    const stored = await env.SESSIONS.get(`oauth_state:${state}`);
    expect(stored).toBe("1");
  });
});

describe("GET /auth/google/callback", () => {
  it("returns 400 when code is missing", async () => {
    const res = await SELF.fetch("http://localhost/auth/google/callback?state=abc");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Missing code or state");
  });

  it("returns 400 when state is missing", async () => {
    const res = await SELF.fetch("http://localhost/auth/google/callback?code=abc");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Missing code or state");
  });

  it("returns 400 when state is invalid or expired", async () => {
    const res = await SELF.fetch(
      "http://localhost/auth/google/callback?code=abc&state=nonexistent-state",
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Invalid or expired state");
  });

  it("returns 400 when token exchange fails", async () => {
    await env.SESSIONS.put("oauth_state:test-state", "1", { expirationTtl: 600 });

    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url === "https://oauth2.googleapis.com/token") {
          return new Response(JSON.stringify({ error: "invalid_grant" }), {
            status: 400,
          });
        }
        return originalFetch(input);
      }),
    );

    const res = await SELF.fetch(
      "http://localhost/auth/google/callback?code=bad-code&state=test-state",
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Token exchange failed");

    vi.unstubAllGlobals();
  });

  it("returns 403 when user email is not in the system", async () => {
    await env.SESSIONS.put("oauth_state:test-state", "1", { expirationTtl: 600 });

    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url === "https://oauth2.googleapis.com/token") {
          return new Response(JSON.stringify({ access_token: "test-token" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
          return new Response(
            JSON.stringify({
              id: "google-123",
              email: "unknown@notregistered.com",
              name: "Unknown",
              picture: "",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return originalFetch(input);
      }),
    );

    const res = await SELF.fetch(
      "http://localhost/auth/google/callback?code=valid-code&state=test-state",
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Access denied");

    vi.unstubAllGlobals();
  });

  it("returns 403 when user account is deactivated", async () => {
    const db = getDb();
    const user = buildUser({ email: "inactive@test.com", isActive: false });
    await db.insert(schema.users).values(user);

    await env.SESSIONS.put("oauth_state:test-state", "1", { expirationTtl: 600 });

    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url === "https://oauth2.googleapis.com/token") {
          return new Response(JSON.stringify({ access_token: "test-token" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
          return new Response(
            JSON.stringify({
              id: "google-999",
              email: "inactive@test.com",
              name: "Inactive User",
              picture: "",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return originalFetch(input);
      }),
    );

    const res = await SELF.fetch(
      "http://localhost/auth/google/callback?code=valid-code&state=test-state",
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("deactivated");

    vi.unstubAllGlobals();
  });

  it("creates session and redirects on successful login", async () => {
    const db = getDb();
    const user = buildUser({ email: "active@test.com", isActive: true });
    await db.insert(schema.users).values(user);

    await env.SESSIONS.put("oauth_state:test-state", "1", { expirationTtl: 600 });

    const originalFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = input.toString();
        if (url === "https://oauth2.googleapis.com/token") {
          return new Response(JSON.stringify({ access_token: "test-token" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
          return new Response(
            JSON.stringify({
              id: "google-active-1",
              email: "active@test.com",
              name: "Active User",
              picture: "https://example.com/avatar.jpg",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return originalFetch(input);
      }),
    );

    const res = await SELF.fetch(
      "http://localhost/auth/google/callback?code=valid-code&state=test-state",
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("http://localhost");
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("humans_session=");
    expect(setCookie).toContain("HttpOnly");

    vi.unstubAllGlobals();
  });
});

describe("POST /auth/logout", () => {
  it("returns 200 and clears session cookie without an active session", async () => {
    const res = await SELF.fetch("http://localhost/auth/logout", {
      method: "POST",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("deletes KV session on logout", async () => {
    const { token } = await createUserAndSession("agent");

    const res = await SELF.fetch("http://localhost/auth/logout", {
      method: "POST",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);

    const session = await env.SESSIONS.get(`session:${token}`);
    expect(session).toBeNull();
  });
});

describe("GET /auth/me", () => {
  it("returns null user when no session cookie", async () => {
    const res = await SELF.fetch("http://localhost/auth/me");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: null };
    expect(body.user).toBeNull();
  });

  it("returns null user when session token is invalid", async () => {
    const res = await SELF.fetch("http://localhost/auth/me", {
      headers: { Cookie: "humans_session=nonexistent-token" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: null };
    expect(body.user).toBeNull();
  });

  it("returns user data for a valid session", async () => {
    const { user, token } = await createUserAndSession("manager");

    const res = await SELF.fetch("http://localhost/auth/me", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { id: string; email: string; role: string } };
    expect(body.user).not.toBeNull();
    expect(body.user?.id).toBe(user.id);
    expect(body.user?.email).toBe(user.email);
    expect(body.user?.role).toBe("manager");
  });
});
