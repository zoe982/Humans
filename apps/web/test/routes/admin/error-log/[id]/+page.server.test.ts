import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load } from "../../../../../src/routes/admin/error-log/[id]/+page.server";

describe("admin/error-log/[id] +page.server load", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when user is null", async () => {
    const event = mockEvent({ user: null });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("redirects to /dashboard when user is not admin", async () => {
    const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "agent", name: "Agent" } });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/dashboard");
    }
  });

  it("returns entry on success", async () => {
    const mockFetch = createMockFetch({
      "/api/admin/error-log/e1": { body: { data: { id: "e1", code: "AUTH_FAILED", message: "Token expired" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
    (event.params as Record<string, string>).id = "e1";
    const result = await load(event as any);

    expect(result.entry).toEqual({ id: "e1", code: "AUTH_FAILED", message: "Token expired" });
  });

  it("redirects to /admin/error-log when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/admin/error-log/e-bad": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
    (event.params as Record<string, string>).id = "e-bad";

    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/admin/error-log");
    }
  });

  it("redirects to /admin/error-log when response is not a data object", async () => {
    const mockFetch = createMockFetch({
      "/api/admin/error-log/e-weird": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
    (event.params as Record<string, string>).id = "e-weird";

    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/admin/error-log");
    }
  });
});
