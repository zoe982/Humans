import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";

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

import { load } from "../../../src/routes/humans/+page";
import { actions } from "../../../src/routes/humans/+page.server";

describe("humans +page.ts load", () => {
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

  it("returns humans from API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "h1", firstName: "Jane" }] }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.humans).toHaveLength(1);
    expect(result.humans[0]).toMatchObject({ id: "h1", firstName: "Jane" });
    expect(result.userRole).toBe("member");
  });

  it("returns empty array when API fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.humans).toEqual([]);
  });

  it("passes session cookie in header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "my-session-123",
      }),
      fetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/humans"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "humans_session=my-session-123",
        }),
      }),
    );
  });
});

describe("humans actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes a human and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h1": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "h1" } });
    const result = await actions.delete(event as any);

    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h1": { status: 404, body: { error: "Human not found", code: "NOT_FOUND", requestId: "req-1" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "h1" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(404);
    expect((result as any).data.error).toBe("Human not found");
    expect((result as any).data.code).toBe("NOT_FOUND");
    expect((result as any).data.requestId).toBe("req-1");
  });

  it("uses fallback message when API returns no error field", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h2": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "h2" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(500);
    expect((result as any).data.error).toBe("Failed to delete human");
  });
});
