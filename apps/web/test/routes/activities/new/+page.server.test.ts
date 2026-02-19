import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/activities/new/+page.server";

describe("activities/new load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane" }] } },
      "/api/accounts": { body: { data: [{ id: "acc-1", name: "Acme" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when user is null", async () => {
    const event = mockEvent({ user: null });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns humans, accounts, and apiUrl on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.humans).toEqual([{ id: "h-1", firstName: "Jane" }]);
    expect(result.accounts).toEqual([{ id: "acc-1", name: "Acme" }]);
    expect(result.apiUrl).toBeDefined();
  });

  it("returns empty arrays when API fails", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { status: 500, body: {} },
      "/api/accounts": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.humans).toEqual([]);
    expect(result.accounts).toEqual([]);
  });
});

describe("activities/new create action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /activities on successful create", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: {
        type: "email",
        subject: "Follow up",
        activityDate: "2025-01-15",
        humanId: "h-1",
      },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns failure when humanId is missing", async () => {
    const mockFetch = createMockFetch({});
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: {
        type: "email",
        subject: "Test",
        activityDate: "2025-01-15",
      },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("A linked human is required.");
    }
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { status: 422, body: { error: "Validation failed" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: {
        type: "email",
        subject: "",
        activityDate: "2025-01-15",
        humanId: "h-1",
      },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Validation failed");
    }
  });

  it("creates geo-interest expression when geo fields present", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: {
        type: "meeting",
        subject: "Travel planning",
        activityDate: "2025-01-15",
        humanId: "h-1",
        geoCity: "Rome",
        geoCountry: "Italy",
        geoNotes: "Wants to visit",
      },
    });
    try {
      await actions.create(event as any);
    } catch {
      // redirect expected
    }
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("geo-interest-expressions"))).toBe(true);
  });

  it("creates geo-interest expression with geoInterestId", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: {
        type: "meeting",
        subject: "Travel planning",
        activityDate: "2025-01-15",
        humanId: "h-1",
        geoInterestId: "gi-1",
      },
    });
    try {
      await actions.create(event as any);
    } catch {
      // redirect expected
    }
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("geo-interest-expressions"))).toBe(true);
  });
});
