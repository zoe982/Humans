import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load } from "../../../../../src/routes/route-interests/[id]/activities/+page.server";

const sampleRouteInterest = {
  id: "roi-1",
  displayId: "ROI-AAA-001",
  status: "active",
  originCity: "New York",
  destinationCity: "London",
};

const sampleActivities = [
  { id: "act-1", type: "call", subject: "Route inquiry call" },
  { id: "act-2", type: "email", subject: "Route details sent" },
];

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "roi-1" };
  return event;
}

describe("route-interests/[id]/activities load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/route-interests/roi-1": { body: { data: sampleRouteInterest } },
      "/api/activities": { body: { data: sampleActivities } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when user is null", async () => {
    const event = makeEvent({ user: null });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("returns routeInterest and activities on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);

    expect(result.routeInterest).toEqual(sampleRouteInterest);
    expect(result.activities).toEqual(sampleActivities);
  });

  it("activities query includes routeSignupId and linkedEntities param", async () => {
    const event = makeEvent();
    await load(event as any);

    const activitiesCall = (mockFetch.mock.calls as [string][]).find(
      ([url]) => typeof url === "string" && url.includes("/api/activities"),
    );
    expect(activitiesCall).toBeDefined();
    expect(activitiesCall?.[0]).toContain("routeSignupId=roi-1");
    expect(activitiesCall?.[0]).toContain("include=linkedEntities");
  });

  it("redirects to /route-interests when route interest API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/route-interests/roi-1": { status: 404, body: { error: "Not found" } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/route-interests");
    }
  });

  it("redirects to /route-interests when route interest response has no data", async () => {
    mockFetch = createMockFetch({
      "/api/route-interests/roi-1": { body: { unexpected: true } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/route-interests");
    }
  });

  it("returns empty activities array when activities API fails", async () => {
    mockFetch = createMockFetch({
      "/api/route-interests/roi-1": { body: { data: sampleRouteInterest } },
      "/api/activities": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.activities).toEqual([]);
  });

  it("returns empty activities array when activities response has no data list", async () => {
    mockFetch = createMockFetch({
      "/api/route-interests/roi-1": { body: { data: sampleRouteInterest } },
      "/api/activities": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.activities).toEqual([]);
  });
});
