import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/leads/general-leads/+page.server";

describe("general-leads list load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/general-leads": {
        body: {
          data: [{ id: "lea-1", source: "web", status: "new" }],
          meta: { page: 1, limit: 25, total: 1 },
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

  it("returns leads list on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.leads).toEqual([{ id: "lea-1", source: "web", status: "new" }]);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
    expect(result.total).toBe(1);
  });

  it("returns userRole from authenticated user", async () => {
    const event = mockEvent({ user: { id: "u-1", email: "agent@test.com", role: "agent", name: "Agent" } });
    const result = await load(event as any);
    expect(result.userRole).toBe("agent");
  });

  it("returns empty leads and zero total when API fails", async () => {
    mockFetch = createMockFetch({
      "/api/general-leads": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.leads).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("returns empty leads when response has no data array", async () => {
    mockFetch = createMockFetch({
      "/api/general-leads": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.leads).toEqual([]);
  });

  it("returns empty leads when meta is missing", async () => {
    mockFetch = createMockFetch({
      "/api/general-leads": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.leads).toEqual([]);
    expect(result.total).toBe(0);
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
