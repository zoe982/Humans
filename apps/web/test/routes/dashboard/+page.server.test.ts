import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load } from "../../../src/routes/dashboard/+page.server";

describe("dashboard +page.server load", () => {
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

  it("returns counts from API", async () => {
    // Order matters: more specific patterns must come first because
    // createMockFetch uses `includes()` and stops at the first match.
    const mockFetch = createMockFetch({
      "/api/pets/count": { body: { data: { total: 3 } } },
      "/api/humans?page=1&limit=1": { body: { data: [{ id: "h1" }], meta: { page: 1, limit: 1, total: 2 } } },
      "/api/activities?page=1&limit=10": { body: { data: [{ id: "a1", type: "email", subject: "Test", activityDate: "2024-01-01" }], meta: { page: 1, limit: 10, total: 1 } } },
      "/api/activities?page=1&limit=1": { body: { data: [{ id: "a1" }], meta: { page: 1, limit: 1, total: 1 } } },
      "/api/geo-interests": { body: { data: [{ id: "g1" }, { id: "g2" }, { id: "g3" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.counts.humans).toBe(2);
    expect(result.counts.activities).toBe(1);
    expect(result.counts.geoInterests).toBe(3);
    expect(result.counts.pets).toBe(3);
    expect(result.user).toEqual(event.locals.user);
    expect(result.recentActivities).toHaveLength(1);
  });

  it("returns zero counts when APIs fail", async () => {
    const mockFetch = createMockFetch({
      "/api/pets/count": { status: 500, body: { error: "fail" } },
      "/api/humans": { status: 500, body: { error: "fail" } },
      "/api/activities": { status: 500, body: { error: "fail" } },
      "/api/geo-interests": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.counts.humans).toBe(0);
    expect(result.counts.activities).toBe(0);
    expect(result.counts.geoInterests).toBe(0);
    expect(result.counts.pets).toBe(0);
  });
});
