import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../test/helpers";
import { load, actions } from "./+page.server";

const sampleActivity = {
  id: "a-1",
  type: "email",
  subject: "Follow up",
  humanId: "h-1",
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "a-1" };
  return event;
}

describe("activities/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/activities/a-1": { body: { data: sampleActivity } },
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane" }] } },
      "/api/accounts": { body: { data: [{ id: "acc-1", name: "Acme" }] } },
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
    }
  });

  it("returns activity, humans, accounts, and apiUrl on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.activity).toEqual(sampleActivity);
    expect(result.humans).toEqual([{ id: "h-1", firstName: "Jane" }]);
    expect(result.accounts).toEqual([{ id: "acc-1", name: "Acme" }]);
    expect(result.apiUrl).toBeDefined();
  });

  it("redirects to /activities when activity API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/activities/a-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns empty humans and accounts when those APIs fail", async () => {
    mockFetch = createMockFetch({
      "/api/activities/a-1": { body: { data: sampleActivity } },
      "/api/humans": { status: 500, body: {} },
      "/api/accounts": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.activity).toEqual(sampleActivity);
    expect(result.humans).toEqual([]);
    expect(result.accounts).toEqual([]);
  });
});

describe("activities/[id] delete action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /activities on successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/activities/a-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await actions.delete(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/activities/a-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("activities/[id] addGeoInterestExpression action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success with geoInterestId", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { geoInterestId: "gi-1", humanId: "h-1", notes: "Interested" },
    });
    const result = await actions.addGeoInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns success with city/country when no geoInterestId", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { humanId: "h-1", city: "Paris", country: "France" },
    });
    const result = await actions.addGeoInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when humanId is missing", async () => {
    const mockFetch = createMockFetch({});
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { geoInterestId: "gi-1" },
    });
    const result = await actions.addGeoInterestExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toContain("human");
    }
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { geoInterestId: "gi-1", humanId: "h-1" },
    });
    const result = await actions.addGeoInterestExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("activities/[id] deleteGeoInterestExpression action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "expr-1" } });
    const result = await actions.deleteGeoInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "expr-1" } });
    const result = await actions.deleteGeoInterestExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});
