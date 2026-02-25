import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, type ActionFailure, Redirect } from "@sveltejs/kit";
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

import { load } from "../../../src/routes/activities/+page";
import { actions } from "../../../src/routes/activities/+page.server";

describe("activities +page.ts load", () => {
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

  it("returns activities from API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "a1", type: "call" }] }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]).toMatchObject({ id: "a1", type: "call" });
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

    expect(result.activities).toEqual([]);
  });

  it("passes session cookie in header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await load({
      parent: async () => ({
        user: { id: "u1", role: "member" },
        sessionToken: "my-session-abc",
      }),
      fetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/activities"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "humans_session=my-session-abc",
        }),
      }),
    );
  });
});

describe("activities actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes an activity and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/activities/a1": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "a1" } });
    const result = await actions.delete(event as any);

    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/activities/a1": { status: 404, body: { error: "Not found", code: "NOT_FOUND", requestId: "req-1" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "a1" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string }>;
    expect(failure.status).toBe(404);
    expect(failure.data.error).toBe("Not found");
  });
});
