import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";

// Mock stores module to prevent $state compilation issues in test context
vi.mock("$lib/data/stores.svelte.ts", () => ({
  getStore: vi.fn(() => ({
    items: [],
    loading: false,
    lastSync: null,
    setItems: vi.fn(),
    setLoading: vi.fn(),
  })),
}));

vi.mock("$lib/data/sync", () => ({
  syncIfStale: vi.fn(),
}));

import { load } from "../../../../src/routes/leads/website-booking-requests/+page";
import { actions } from "../../../../src/routes/leads/website-booking-requests/+page.server";

describe("website-booking-requests +page.ts load", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects to /login when user is null", async () => {
    try {
      await load({
        parent: async () => ({ user: null, sessionToken: null }),
        fetch: vi.fn(),
      });
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("returns bookings list from API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "b1", status: "new" }] }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.bookings).toHaveLength(1);
    expect(result.bookings[0]).toMatchObject({ id: "b1", status: "new" });
  });

  it("returns empty array when API fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "fail" }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.bookings).toEqual([]);
  });

  it("passes session cookie in header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "my-session-456",
      }),
      fetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/website-booking-requests"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "humans_session=my-session-456",
        }),
      }),
    );
  });

  it("returns userRole from parent", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "manager" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.userRole).toBe("manager");
  });
});

describe("website-booking-requests +page.server actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ formData: { id: "b1" } });
    const result = await actions.delete(event as any);
    expect(result).toEqual({ success: true });
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
    const event = mockEvent({ formData: { id: "b1" } });
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Not found");
    }
  });
});
