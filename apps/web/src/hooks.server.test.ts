import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock $env/dynamic/private
vi.mock("$env/dynamic/private", () => ({
  env: {} as Record<string, string | undefined>,
}));

import { handle, handleError } from "./hooks.server";
import { env } from "$env/dynamic/private";

function createMockEvent(cookies: Record<string, string> = {}) {
  return {
    cookies: {
      get: (name: string) => cookies[name],
    },
    locals: {} as Record<string, unknown>,
    url: new URL("http://localhost/test"),
    request: new Request("http://localhost/test"),
  };
}

function createMockResolve() {
  return vi.fn().mockResolvedValue(new Response("OK"));
}

describe("handle hook", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (env as Record<string, string | undefined>)["TEST_BYPASS_AUTH"] = undefined;
  });

  it("sets user to null when no session cookie", async () => {
    const event = createMockEvent();
    const resolve = createMockResolve();

    await handle({ event, resolve } as never);
    expect(event.locals.user).toBeNull();
    expect(resolve).toHaveBeenCalledOnce();
  });

  it("sets user to null when session cookie is empty", async () => {
    const event = createMockEvent({ humans_session: "" });
    const resolve = createMockResolve();

    await handle({ event, resolve } as never);
    expect(event.locals.user).toBeNull();
  });

  it("sets user from API response when session is valid", async () => {
    const mockUser = { id: "u-1", name: "Jane", email: "jane@test.com", role: "admin", avatarUrl: null };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    const event = createMockEvent({ humans_session: "valid-token" });
    const resolve = createMockResolve();

    await handle({ event, resolve } as never);
    expect(event.locals.user).toStrictEqual(mockUser);
  });

  it("sets user to null when API returns non-ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const event = createMockEvent({ humans_session: "expired-token" });
    const resolve = createMockResolve();

    await handle({ event, resolve } as never);
    expect(event.locals.user).toBeNull();
  });

  it("sets user to null when API fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const event = createMockEvent({ humans_session: "some-token" });
    const resolve = createMockResolve();

    await handle({ event, resolve } as never);
    expect(event.locals.user).toBeNull();
    consoleSpy.mockRestore();
  });

  it("bypasses auth when TEST_BYPASS_AUTH is set", async () => {
    (env as Record<string, string | undefined>)["TEST_BYPASS_AUTH"] = "1";

    const event = createMockEvent();
    const resolve = createMockResolve();

    await handle({ event, resolve } as never);
    expect(event.locals.user).toStrictEqual({
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      role: "admin",
      avatarUrl: null,
    });
  });

  it("sets user to null when response body is not a user object", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ something: "else" }),
    });

    const event = createMockEvent({ humans_session: "valid-token" });
    const resolve = createMockResolve();

    await handle({ event, resolve } as never);
    expect(event.locals.user).toBeNull();
  });
});

describe("handleError", () => {
  it("returns error message from Error instance", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = handleError({ error: new Error("test error"), event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("test error");
    consoleSpy.mockRestore();
  });

  it("returns default message for non-Error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = handleError({ error: "string error", event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("string error");
    consoleSpy.mockRestore();
  });

  it("returns fallback message when error has no message", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = handleError({ error: new Error(""), event: {} as never, status: 500, message: "" });
    expect(result?.message).toBe("An unexpected error occurred");
    consoleSpy.mockRestore();
  });
});
