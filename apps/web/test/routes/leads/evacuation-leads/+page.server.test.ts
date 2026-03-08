import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, type ActionFailure, Redirect } from "@sveltejs/kit";
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

import { load } from "../../../../src/routes/leads/evacuation-leads/+page";
import { actions } from "../../../../src/routes/leads/evacuation-leads/+page.server";

describe("leads/evacuation-leads +page.ts load", () => {
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

  it("returns evacuation leads from API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: "el1", first_name: "John" }] }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "agent" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.evacuationLeads).toHaveLength(1);
    expect(result.evacuationLeads[0]).toMatchObject({ id: "el1", first_name: "John" });
    expect(result.userRole).toBe("agent");
  });

  it("returns empty array when API fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "fail" }),
    });

    const result = await load({
      parent: async () => ({
        user: { id: "u1", role: "agent" },
        sessionToken: "test-token",
      }),
      fetch: mockFetch,
    });

    expect(result.evacuationLeads).toEqual([]);
  });

  it("passes session cookie in header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await load({
      parent: async () => ({
        user: { id: "u1", role: "agent" },
        sessionToken: "my-session-xyz",
      }),
      fetch: mockFetch,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/evacuation-leads"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "humans_session=my-session-xyz",
        }),
      }),
    );
  });
});

describe("leads/evacuation-leads actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes an evacuation lead and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/evacuation-leads/el1": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "el1" } });
    const result = await actions.delete(event as any);

    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/evacuation-leads/el1": { status: 404, body: { error: "Evacuation lead not found", code: "EVACUATION_LEAD_NOT_FOUND", requestId: "req-1" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "el1" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string; code?: string; requestId?: string }>;
    expect(failure.status).toBe(404);
    expect(failure.data.error).toBe("Evacuation lead not found");
    expect(failure.data.code).toBe("EVACUATION_LEAD_NOT_FOUND");
    expect(failure.data.requestId).toBe("req-1");
  });

  it("uses fallback message when API returns no error field", async () => {
    const mockFetch = createMockFetch({
      "/api/evacuation-leads/el2": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "el2" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string }>;
    expect(failure.status).toBe(500);
    expect(failure.data.error).toBe("Failed to delete evacuation lead");
  });
});
