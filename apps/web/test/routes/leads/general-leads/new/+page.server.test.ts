import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load, actions } from "../../../../../src/routes/leads/general-leads/new/+page.server";

describe("general-leads/new load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/colleagues": {
        body: {
          data: [{ id: "col-1", name: "Jane Doe", displayId: "COL-AAA-001" }],
        },
      },
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

  it("returns colleagues list on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.colleagues).toEqual([{ id: "col-1", name: "Jane Doe", displayId: "COL-AAA-001" }]);
  });

  it("returns empty colleagues when API fails", async () => {
    mockFetch = createMockFetch({
      "/api/colleagues": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.colleagues).toEqual([]);
  });

  it("returns empty colleagues when response has no data array", async () => {
    mockFetch = createMockFetch({
      "/api/colleagues": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.colleagues).toEqual([]);
  });
});

describe("general-leads/new create action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to new lead on successful create", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads": { body: { data: { id: "lea-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { source: "referral", notes: "Came via partner", ownerId: "col-1" },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads": { status: 422, body: { error: "Source required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { source: "" } });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Source required");
    }
  });

  it("returns failure when API returns unexpected response shape", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { source: "web" } });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("creates lead with optional email and phone fields", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads": { body: { data: { id: "lea-2" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { source: "web", email: "lead@example.com", phone: "+15551234567" },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });
});
