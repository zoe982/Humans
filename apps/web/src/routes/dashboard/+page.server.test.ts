import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../test/helpers";
import { load } from "./+page.server";

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
      "/api/humans/h1/pets": { body: { data: [{ id: "p1" }] } },
      "/api/humans/h2/pets": { body: { data: [{ id: "p2" }, { id: "p3" }] } },
      "/api/humans": { body: { data: [{ id: "h1" }, { id: "h2" }] } },
      "/api/activities": { body: { data: [{ id: "a1" }] } },
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
  });

  it("returns zero counts when APIs fail", async () => {
    const mockFetch = createMockFetch({
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
