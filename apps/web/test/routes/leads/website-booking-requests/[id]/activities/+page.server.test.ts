import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../../helpers";
import { load } from "../../../../../../src/routes/leads/website-booking-requests/[id]/activities/+page.server";

const sampleBooking = {
  id: "bor-1",
  displayId: "BOR-AAA-001",
  status: "pending",
  requestDate: "2025-01-15T00:00:00.000Z",
};

const sampleActivities = [
  { id: "act-1", type: "call", subject: "Booking enquiry call" },
  { id: "act-2", type: "email", subject: "Confirmation sent" },
];

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "bor-1" };
  return event;
}

describe("leads/website-booking-requests/[id]/activities load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/bor-1": { body: { data: sampleBooking } },
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

  it("returns booking and activities on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);

    expect(result.booking).toEqual(sampleBooking);
    expect(result.activities).toEqual(sampleActivities);
  });

  it("activities query includes websiteBookingRequestId and linkedEntities param", async () => {
    const event = makeEvent();
    await load(event as any);

    const activitiesCall = (mockFetch.mock.calls as [string][]).find(
      ([url]) => typeof url === "string" && url.includes("/api/activities"),
    );
    expect(activitiesCall).toBeDefined();
    expect(activitiesCall?.[0]).toContain("websiteBookingRequestId=bor-1");
    expect(activitiesCall?.[0]).toContain("include=linkedEntities");
  });

  it("redirects to /leads/website-booking-requests when booking API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/bor-1": { status: 404, body: { error: "Not found" } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/leads/website-booking-requests");
    }
  });

  it("redirects to /leads/website-booking-requests when booking response has no data", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/bor-1": { body: { unexpected: true } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/leads/website-booking-requests");
    }
  });

  it("returns empty activities array when activities API fails", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/bor-1": { body: { data: sampleBooking } },
      "/api/activities": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.activities).toEqual([]);
  });

  it("returns empty activities array when activities response has no data list", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/bor-1": { body: { data: sampleBooking } },
      "/api/activities": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.activities).toEqual([]);
  });
});
