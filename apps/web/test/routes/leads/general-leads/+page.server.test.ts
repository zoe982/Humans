import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, type ActionFailure } from "@sveltejs/kit";
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
    const failure = result as ActionFailure<{ error: string; code?: string; requestId?: string }>;
    expect(failure.status).toBe(404);
    expect(failure.data.error).toBe("Lead not found");
    expect(failure.data.code).toBe("NOT_FOUND");
    expect(failure.data.requestId).toBe("req-1");
  });

  it("uses fallback message when API returns no error field", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-2": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "lea-2" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string }>;
    expect(failure.status).toBe(500);
    expect(failure.data.error).toBe("Failed to delete general lead");
  });
});

describe("general-leads actions.importFromFront", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when frontId is empty", async () => {
    const event = mockEvent({ formData: { frontId: "" } });
    const result = await actions.importFromFront(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ importError: string }>;
    expect(failure.status).toBe(400);
    expect(failure.data.importError).toBe("Please enter a Front message or conversation ID");
  });

  it("returns 400 when frontId is whitespace-only", async () => {
    const event = mockEvent({ formData: { frontId: "   " } });
    const result = await actions.importFromFront(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ importError: string }>;
    expect(failure.status).toBe(400);
    expect(failure.data.importError).toBe("Please enter a Front message or conversation ID");
  });

  it("redirects to lead detail page on success", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/import-from-front": {
        status: 201,
        body: { data: { lead: { id: "lea-new-1", displayId: "LEA-AAA-001" }, activitiesImported: 3, contactHandle: "john@example.com", contactName: "John Doe" } },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { frontId: "cnv_test123" } });
    try {
      await actions.importFromFront(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns failure with importError when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/import-from-front": {
        status: 400,
        body: { error: "Conversation already imported as LEA-AAA-001", code: "FRONT_IMPORT_ALREADY_EXISTS" },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { frontId: "cnv_test123" } });
    const result = await actions.importFromFront(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ importError: string; code?: string }>;
    expect(failure.status).toBe(400);
    expect(failure.data.importError).toBe("Conversation already imported as LEA-AAA-001");
    expect(failure.data.code).toBe("FRONT_IMPORT_ALREADY_EXISTS");
  });

  it("sends correct payload to API", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/import-from-front": {
        status: 201,
        body: { data: { lead: { id: "lea-1", displayId: "LEA-AAA-001" }, activitiesImported: 0, contactHandle: null, contactName: null } },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { frontId: "msg_abc123" } });
    try {
      await actions.importFromFront(event as any);
    } catch {
      // redirect expected
    }

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0]!;
    expect(call[0]).toContain("/api/general-leads/import-from-front");
    const opts = call[1] as RequestInit;
    expect(opts.method).toBe("POST");
    const parsedBody: unknown = JSON.parse(opts.body as string);
    expect(parsedBody).toEqual({ frontId: "msg_abc123" });
  });
});
