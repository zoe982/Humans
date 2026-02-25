import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
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

import { load } from "../../../../src/routes/leads/general-leads/+page";
import { actions } from "../../../../src/routes/leads/general-leads/+page.server";

describe("general-leads +page.ts load", () => {
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
    }
  });

  it("returns leads list on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "lea-1", source: "web", status: "new" }] }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.leads).toEqual([{ id: "lea-1", source: "web", status: "new" }]);
  });

  it("returns userRole from authenticated user", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u-1", role: "agent" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.userRole).toBe("agent");
  });

  it("returns empty leads when API fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.leads).toEqual([]);
  });

  it("returns empty leads when response has no data array", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ unexpected: true }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.leads).toEqual([]);
  });
});

describe("general-leads actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes a lead and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "lea-1" } });
    const result = await actions.delete(event as any);

    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { status: 404, body: { error: "Lead not found", code: "NOT_FOUND", requestId: "req-1" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "lea-1" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(404);
    expect((result as any).data.error).toBe("Lead not found");
    expect((result as any).data.code).toBe("NOT_FOUND");
    expect((result as any).data.requestId).toBe("req-1");
  });

  it("uses fallback message when API returns no error field", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-2": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "lea-2" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(500);
    expect((result as any).data.error).toBe("Failed to delete general lead");
  });
});
