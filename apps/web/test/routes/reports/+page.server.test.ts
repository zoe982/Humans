import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load } from "../../../src/routes/reports/+page.server";

describe("reports +page.server load", () => {
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

  it("redirects agent to /dashboard", async () => {
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

  it("does not redirect manager", async () => {
    const mockFetch = createMockFetch({
      "/api/admin/colleagues": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "manager", name: "Mgr" } });
    const result = await load(event as any);
    expect(result).toBeDefined();
    expect(result.colleagues).toEqual([]);
  });

  it("does not redirect admin", async () => {
    const mockFetch = createMockFetch({
      "/api/admin/colleagues": { body: { data: [{ id: "c1", name: "Admin User" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "admin", name: "Admin" } });
    const result = await load(event as any);
    expect(result).toBeDefined();
    expect(result.colleagues).toHaveLength(1);
  });
});
