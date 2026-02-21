import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load, actions } from "../../../../../src/routes/route-interests/expressions/[id]/+page.server";

const sampleExpression = {
  id: "expr1",
  routeInterestId: "ri1",
  humanId: "h1",
  frequency: "one_time",
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "expr1" };
  return event;
}

describe("route-interests/expressions/[id] +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/route-interest-expressions/expr1": { body: { data: sampleExpression } },
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

  it("redirects to /route-interests when API returns 404", async () => {
    mockFetch = createMockFetch({
      "/api/route-interest-expressions/expr1": { status: 404, body: { error: "Not found" } },
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

  it("redirects to /route-interests when API returns non-object data", async () => {
    mockFetch = createMockFetch({
      "/api/route-interest-expressions/expr1": { body: { weird: true } },
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
});

describe("route-interests/expressions/[id] actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to parent route-interest after successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions/expr1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { routeInterestId: "ri1" } });
    try {
      await actions.delete(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/route-interests/ri1");
    }
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/route-interest-expressions/expr1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions/expr1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { routeInterestId: "ri1" } });
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Not found");
    }
  });

  it("passes session token in cookie header", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions/expr1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({
      formData: { routeInterestId: "ri1" },
      sessionToken: "sess-tok",
    });
    try {
      await actions.delete(event as any);
    } catch {
      // redirect expected
    }
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { Cookie: "humans_session=sess-tok" },
      }),
    );
  });
});
