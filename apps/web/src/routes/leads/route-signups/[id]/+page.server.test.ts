import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../../test/helpers";
import { load, actions } from "./+page.server";

const sampleSignup = {
  id: "rs-1",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  status: "new",
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "rs-1" };
  return event;
}

describe("route-signups/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: sampleSignup } },
      "/api/activities?routeSignupId=rs-1": { body: { data: [{ id: "a-1", type: "email" }] } },
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

  it("returns signup, activities, and user on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.signup).toEqual(sampleSignup);
    expect(result.activities).toEqual([{ id: "a-1", type: "email" }]);
    expect(result.user).toBeDefined();
  });

  it("redirects to /leads/route-signups when signup API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { status: 404, body: { error: "Not found" } },
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

  it("returns empty activities when activities API fails", async () => {
    mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: sampleSignup } },
      "/api/activities?routeSignupId=rs-1": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.signup).toEqual(sampleSignup);
    expect(result.activities).toEqual([]);
  });
});

describe("route-signups/[id] updateStatus action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on status update", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { status: "contacted" } });
    const result = await actions.updateStatus(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { status: 400, body: { error: "Invalid status" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { status: "bad" } });
    const result = await actions.updateStatus(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] updateNote action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on note update", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { note: "Called and left voicemail" } });
    const result = await actions.updateNote(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { note: "test" } });
    const result = await actions.updateNote(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] delete action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /leads/route-signups on successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs-1": { body: {} },
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
      "/api/route-signups/rs-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] addActivity action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on activity creation", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: {
        type: "email",
        subject: "Initial outreach",
        activityDate: "2025-01-15",
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { type: "email", subject: "Test" },
    });
    const result = await actions.addActivity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("route-signups/[id] convertToHuman action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on conversion", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/convert-from-signup": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { humanId: "h-1" } });
    const result = await actions.convertToHuman(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/convert-from-signup": { status: 400, body: { error: "Already converted" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { humanId: "h-1" } });
    const result = await actions.convertToHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Already converted");
    }
  });
});
