import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
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

import { load } from "../../../../src/routes/leads/route-signups/+page";
import { actions } from "../../../../src/routes/leads/route-signups/+page.server";

describe("leads/route-signups +page.ts load", () => {
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

  it("returns signups from API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "rs1", routeName: "Rome" }] }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.signups).toHaveLength(1);
    expect(result.signups[0]).toMatchObject({ id: "rs1", routeName: "Rome" });
    expect(result.userRole).toBe("member");
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

    expect(result.signups).toEqual([]);
  });

  it("passes session cookie in header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "my-session-xyz",
      }),
      fetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/route-signups"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "humans_session=my-session-xyz",
        }),
      }),
    );
  });
});

describe("leads/route-signups actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes a route signup and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs1": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "rs1" } });
    const result = await actions.delete(event as any);

    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs1": { status: 404, body: { error: "Signup not found", code: "NOT_FOUND", requestId: "req-1" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "rs1" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(404);
    expect((result as any).data.error).toBe("Signup not found");
    expect((result as any).data.code).toBe("NOT_FOUND");
    expect((result as any).data.requestId).toBe("req-1");
  });

  it("uses fallback message when API returns no error field", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups/rs2": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "rs2" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(500);
    expect((result as any).data.error).toBe("Failed to delete route signup");
  });
});
