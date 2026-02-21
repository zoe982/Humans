import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/route-interests/[id]/+page.server";

const sampleRI = {
  id: "ri1",
  originCity: "London",
  originCountry: "UK",
  destinationCity: "Paris",
  destinationCountry: "France",
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "ri1" };
  return event;
}

describe("route-interests/[id] +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/route-interests/ri1": { body: { data: sampleRI } },
      "/api/humans": { body: { data: [{ id: "h1", firstName: "Jane" }] } },
      "/api/route-interests": { body: { data: [sampleRI] } },
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

  it("returns routeInterest, humans, and reverseRoute on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.routeInterest).toEqual(sampleRI);
    expect(result.humans).toHaveLength(1);
    // No reverse route since the list only contains the same route
    expect(result.reverseRoute).toBeNull();
  });

  it("redirects to /route-interests when route interest API returns 404", async () => {
    mockFetch = createMockFetch({
      "/api/route-interests/ri1": { status: 404, body: { error: "Not found" } },
      "/api/humans": { body: { data: [] } },
      "/api/route-interests": { body: { data: [] } },
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

  it("finds reverse route when present in the list", async () => {
    const reverseRI = {
      id: "ri2",
      originCity: "Paris",
      originCountry: "France",
      destinationCity: "London",
      destinationCountry: "UK",
    };
    mockFetch = createMockFetch({
      "/api/route-interests/ri2": { body: { data: reverseRI } },
      "/api/route-interests/ri1": { body: { data: sampleRI } },
      "/api/humans": { body: { data: [] } },
      "/api/route-interests": { body: { data: [sampleRI, reverseRI] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.reverseRoute).toEqual(reverseRI);
  });

  it("returns empty humans when humans API fails", async () => {
    mockFetch = createMockFetch({
      "/api/route-interests/ri1": { body: { data: sampleRI } },
      "/api/humans": { status: 500, body: { error: "fail" } },
      "/api/route-interests": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.humans).toEqual([]);
  });
});

describe("route-interests/[id] actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /route-interests after successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interests/ri1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await actions.delete(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/route-interests");
    }
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/route-interests/ri1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interests/ri1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-interests/[id] actions.deleteExpression", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions/expr1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { expressionId: "expr1" } });
    const result = await actions.deleteExpression(event as any);
    expect(result).toEqual({ success: true });
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
    const event = makeEvent({ formData: { expressionId: "expr1" } });
    const result = await actions.deleteExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-interests/[id] actions.createExpression", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid create", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions": { body: { data: { id: "expr-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({
      formData: { humanId: "h1", notes: "Interested", frequency: "monthly" },
    });
    const result = await actions.createExpression(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/route-interest-expressions"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns fail when humanId is missing", async () => {
    const event = makeEvent({ formData: { humanId: "" } });
    const result = await actions.createExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toContain("human");
    }
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions": { status: 422, body: { error: "Validation error" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({
      formData: { humanId: "h1", frequency: "one_time" },
    });
    const result = await actions.createExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("includes travel date fields when provided", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions": { body: { data: { id: "expr-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({
      formData: {
        humanId: "h1",
        frequency: "one_time",
        travelYear: "2026",
        travelMonth: "6",
        travelDay: "15",
      },
    });
    const result = await actions.createExpression(event as any);
    expect(result).toEqual({ success: true });
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    const body = JSON.parse((postCall as unknown[])[1] ? ((postCall as unknown[])[1] as RequestInit).body as string : "{}");
    expect(body.travelYear).toBe(2026);
    expect(body.travelMonth).toBe(6);
    expect(body.travelDay).toBe(15);
  });
});
