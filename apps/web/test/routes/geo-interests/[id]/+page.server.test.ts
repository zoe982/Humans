import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/geo-interests/[id]/+page.server";

const sampleGeoInterest = {
  id: "gi-1",
  city: "Rome",
  country: "Italy",
  expressions: [],
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "gi-1" };
  return event;
}

describe("geo-interests/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/geo-interests/gi-1": { body: { data: sampleGeoInterest } },
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane" }] } },
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

  it("returns geoInterest and humans on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.geoInterest).toEqual(sampleGeoInterest);
    expect(result.humans).toEqual([{ id: "h-1", firstName: "Jane" }]);
  });

  it("redirects to /geo-interests when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/geo-interests/gi-1": { status: 404, body: { error: "Not found" } },
      "/api/humans": { body: { data: [] } },
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
});

describe("geo-interests/[id] delete action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /geo-interests on successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interests/gi-1": { body: {} },
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
      "/api/geo-interests/gi-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("geo-interests/[id] deleteExpression action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { expressionId: "expr-1" } });
    const result = await actions.deleteExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { expressionId: "expr-1" } });
    const result = await actions.deleteExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("geo-interests/[id] createExpression action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when expression is created", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { humanId: "h-1", notes: "Very interested" },
    });
    const result = await actions.createExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when humanId is missing", async () => {
    const mockFetch = createMockFetch({});
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { notes: "Some notes" } });
    const result = await actions.createExpression(event as any);
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

    const event = makeEvent({ formData: { humanId: "h-1" } });
    const result = await actions.createExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});
