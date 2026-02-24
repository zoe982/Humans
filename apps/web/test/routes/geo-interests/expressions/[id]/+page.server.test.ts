import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load, actions } from "../../../../../src/routes/geo-interests/expressions/[id]/+page.server";

const sampleExpression = {
  id: "expr-1",
  city: "Rome",
  country: "Italy",
  geoInterestId: "gi-1",
  humanId: "h-1",
  notes: null,
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "expr-1" };
  return event;
}

describe("geo-interests/expressions/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { body: { data: sampleExpression } },
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

  it("returns expression and apiUrl on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.expression).toEqual(sampleExpression);
    expect(result.apiUrl).toBeDefined();
  });

  it("redirects to /geo-interests when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/geo-interests");
    }
  });

  it("redirects to /geo-interests when API returns non-object data", async () => {
    mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/geo-interests");
    }
  });
});

describe("geo-interests/expressions/[id] delete action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to the parent geo-interest on successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { geoInterestId: "gi-1" } });
    try {
      await actions.delete(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/geo-interests/gi-1");
    }
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { geoInterestId: "gi-1" } });
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(500);
      expect(result.data.error).toBe("Server error");
    }
  });

  it("returns failure with fallback message when API error has no message", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { status: 404, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { geoInterestId: "gi-1" } });
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(typeof result.data.error).toBe("string");
      expect(result.data.error.length).toBeGreaterThan(0);
    }
  });
});
