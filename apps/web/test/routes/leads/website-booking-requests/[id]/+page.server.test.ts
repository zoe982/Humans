import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load, actions } from "../../../../../src/routes/leads/website-booking-requests/[id]/+page.server";

const sampleBooking = { id: "b1", status: "new", petName: "Buddy" };

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "b1" };
  return event;
}

describe("website-booking-requests/[id] +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
      "/api/activities": { body: { data: [{ id: "a1", type: "email" }] } },
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

  it("returns booking, activities, and user on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.booking).toEqual(sampleBooking);
    expect(result.activities).toHaveLength(1);
    expect(result.user).toBeDefined();
  });

  it("redirects to /leads/website-booking-requests when booking API returns 404", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { status: 404, body: { error: "Not found" } },
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

  it("redirects to /leads/website-booking-requests when API returns non-object data", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: { weird: true } },
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

  it("returns empty activities when activities API fails", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
      "/api/activities": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.activities).toEqual([]);
  });

  it("queries activities with websiteBookingRequestId filter", async () => {
    const event = makeEvent();
    await load(event as any);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("websiteBookingRequestId=b1"),
      expect.any(Object),
    );
  });
});

describe("website-booking-requests/[id] actions.updateStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid status update", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { status: "contacted" } });
    const result = await actions.updateStatus(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/website-booking-requests/b1"),
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { status: 422, body: { error: "Invalid status" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { status: "bad" } });
    const result = await actions.updateStatus(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Invalid status");
    }
  });
});

describe("website-booking-requests/[id] actions.updateNote", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid note update", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { crm_note: "Follow up next week" } });
    const result = await actions.updateNote(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { crm_note: "Some note" } });
    const result = await actions.updateNote(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to list after successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await actions.delete(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/leads/website-booking-requests");
    }
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/website-booking-requests/b1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.addActivity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid activity creation", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({
      formData: { type: "email", subject: "Follow up", activityDate: "2026-01-15" },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/activities"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { type: "email", subject: "" } });
    const result = await actions.addActivity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("includes websiteBookingRequestId in activity payload", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { type: "call", subject: "Discussion" } });
    await actions.addActivity(event as any);
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    const body = JSON.parse((postCall as unknown[])[1]
      ? ((postCall as unknown[])[1] as RequestInit).body as string
      : "{}");
    expect(body.websiteBookingRequestId).toBe("b1");
  });
});

describe("website-booking-requests/[id] actions.convertToHuman", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid convert", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h1/convert-from-signup": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { humanId: "h1" } });
    const result = await actions.convertToHuman(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/humans/h1/convert-from-signup"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h1/convert-from-signup": { status: 404, body: { error: "Human not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { humanId: "h1" } });
    const result = await actions.convertToHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Human not found");
    }
  });

  it("passes booking id as routeSignupId in body", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h1/convert-from-signup": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { humanId: "h1" } });
    await actions.convertToHuman(event as any);
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    const body = JSON.parse((postCall as unknown[])[1]
      ? ((postCall as unknown[])[1] as RequestInit).body as string
      : "{}");
    expect(body.routeSignupId).toBe("b1");
  });
});
