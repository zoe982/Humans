import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handle } from "../src/hooks.server";

function makeEvent(overrides: { cookies?: { get: (name: string) => string | undefined; delete?: ReturnType<typeof vi.fn> } } = {}) {
  return {
    locals: {} as Record<string, unknown>,
    cookies: {
      get: overrides.cookies?.get ?? vi.fn((_name: string) => undefined),
      delete: overrides.cookies?.delete ?? vi.fn(),
    },
    url: new URL("http://localhost/"),
    request: new Request("http://localhost/"),
    fetch: vi.fn(async () => new Response(JSON.stringify({ user: null }), { status: 401 })),
    params: {},
    platform: {},
    route: { id: "/" },
    getClientAddress: () => "127.0.0.1",
    isDataRequest: false,
    isSubRequest: false,
    setHeaders: vi.fn(),
  };
}

function makeResolve() {
  return vi.fn(async () => new Response("OK", { status: 200 }));
}

describe("hooks.server handle", () => {
  beforeEach(() => {
    vi.stubEnv("TEST_BYPASS_AUTH", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("security headers", () => {
    it("sets X-Frame-Options to DENY", async () => {
      const event = makeEvent();
      const resolve = makeResolve();
      const response = await handle({ event: event as never, resolve });
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("sets X-Content-Type-Options to nosniff", async () => {
      const event = makeEvent();
      const resolve = makeResolve();
      const response = await handle({ event: event as never, resolve });
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("sets Referrer-Policy to strict-origin-when-cross-origin", async () => {
      const event = makeEvent();
      const resolve = makeResolve();
      const response = await handle({ event: event as never, resolve });
      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    });

    it("sets Permissions-Policy disabling camera, microphone, and geolocation", async () => {
      const event = makeEvent();
      const resolve = makeResolve();
      const response = await handle({ event: event as never, resolve });
      expect(response.headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
    });

    it("sets Cache-Control to no-store", async () => {
      const event = makeEvent();
      const resolve = makeResolve();
      const response = await handle({ event: event as never, resolve });
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("CSP connect-src includes wss://api.humans.pavinfo.app for WebSocket support", async () => {
      const event = makeEvent();
      const resolve = makeResolve();
      const response = await handle({ event: event as never, resolve });
      const csp = response.headers.get("Content-Security-Policy") ?? "";
      const connectSrc = csp.split(";").find((d) => d.trim().startsWith("connect-src")) ?? "";
      expect(connectSrc).toContain("wss://api.humans.pavinfo.app");
    });

    it("CSP connect-src includes https://api.humans.pavinfo.app", async () => {
      const event = makeEvent();
      const resolve = makeResolve();
      const response = await handle({ event: event as never, resolve });
      const csp = response.headers.get("Content-Security-Policy") ?? "";
      const connectSrc = csp.split(";").find((d) => d.trim().startsWith("connect-src")) ?? "";
      expect(connectSrc).toContain("https://api.humans.pavinfo.app");
    });
  });

  describe("auth behavior", () => {
    it("sets user to null when no session cookie is present", async () => {
      const event = makeEvent();
      const resolve = makeResolve();
      await handle({ event: event as never, resolve });
      expect(event.locals.user).toBeNull();
    });

    it("sets user from API response when session cookie is valid", async () => {
      const mockUser = { id: "u1", email: "a@b.com", role: "agent", name: "A", avatarUrl: null };
      // hooks.server.ts uses global fetch, not event.fetch
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ user: mockUser }), { status: 200 })
      );
      const event = makeEvent({
        cookies: { get: vi.fn((_name: string) => "valid-session-token") },
      });
      const resolve = makeResolve();
      await handle({ event: event as never, resolve });
      expect(event.locals.user).toEqual(mockUser);
    });

    it("sets user to null when API returns non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );
      const event = makeEvent({
        cookies: { get: vi.fn((_name: string) => "expired-token") },
      });
      const resolve = makeResolve();
      await handle({ event: event as never, resolve });
      expect(event.locals.user).toBeNull();
    });

    it("sets user to null when API fetch throws", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network failure"));
      const event = makeEvent({
        cookies: { get: vi.fn((_name: string) => "some-token") },
      });
      const resolve = makeResolve();
      await handle({ event: event as never, resolve });
      expect(event.locals.user).toBeNull();
    });

    it("deletes session cookie when /auth/me returns non-ok", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
      );
      const deleteFn = vi.fn();
      const event = makeEvent({
        cookies: { get: vi.fn((_name: string) => "expired-token"), delete: deleteFn },
      });
      const resolve = makeResolve();
      await handle({ event: event as never, resolve });
      expect(event.locals.user).toBeNull();
      expect(deleteFn).toHaveBeenCalledWith("humans_session", { path: "/" });
    });

    it("does not delete cookie on successful auth", async () => {
      const mockUser = { id: "u1", email: "a@b.com", role: "agent", name: "A", avatarUrl: null };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ user: mockUser }), { status: 200 })
      );
      const deleteFn = vi.fn();
      const event = makeEvent({
        cookies: { get: vi.fn((_name: string) => "valid-token"), delete: deleteFn },
      });
      const resolve = makeResolve();
      await handle({ event: event as never, resolve });
      expect(event.locals.user).toEqual(mockUser);
      expect(deleteFn).not.toHaveBeenCalled();
    });
  });
});
