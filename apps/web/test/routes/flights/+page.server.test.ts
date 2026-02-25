import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";

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

// Browser defaults to false in test mocks ($app/environment)
import { load } from "../../../src/routes/flights/+page";

describe("flights +page.ts load", () => {
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

  it("returns flights data from API on server (browser=false)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "flight-1", origin_city: "JFK", destination_city: "LAX" }],
      }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.flights).toHaveLength(1);
    expect(result.flights[0]).toMatchObject({ id: "flight-1" });
    expect(result.userRole).toBe("member");
  });

  it("passes session cookie in header on server", async () => {
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
      expect.stringContaining("/api/flights"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "humans_session=my-session-123",
        }),
      }),
    );
  });

  it("returns empty flights array when API returns error", async () => {
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

    expect(result.flights).toEqual([]);
  });
});
