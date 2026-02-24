import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load } from "../../../../src/routes/flights/[id]/+page.server";

const sampleFlight = {
  id: "fly-1",
  origin: "JFK",
  destination: "LAX",
  departureDate: "2025-09-01",
  displayId: "FLY-AAA-001",
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "fly-1" };
  return event;
}

describe("flights/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/flights/fly-1": {
        body: {
          data: sampleFlight,
          linkedOpportunities: [{ id: "opp-1", name: "Big Deal" }],
          linkedDiscountCodes: [{ id: "dc-1", code: "SAVE10" }],
        },
      },
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

  it("returns flight data on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.flight).toEqual(sampleFlight);
  });

  it("returns linkedOpportunities on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.linkedOpportunities).toEqual([{ id: "opp-1", name: "Big Deal" }]);
  });

  it("returns linkedDiscountCodes on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.linkedDiscountCodes).toEqual([{ id: "dc-1", code: "SAVE10" }]);
  });

  it("defaults linkedOpportunities to empty array when not in response", async () => {
    mockFetch = createMockFetch({
      "/api/flights/fly-1": { body: { data: sampleFlight } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.linkedOpportunities).toEqual([]);
  });

  it("defaults linkedDiscountCodes to empty array when not in response", async () => {
    mockFetch = createMockFetch({
      "/api/flights/fly-1": { body: { data: sampleFlight } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.linkedDiscountCodes).toEqual([]);
  });

  it("redirects to /flights when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/flights/fly-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/flights");
    }
  });

  it("redirects to /flights when response has no data field", async () => {
    mockFetch = createMockFetch({
      "/api/flights/fly-1": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/flights");
    }
  });
});
