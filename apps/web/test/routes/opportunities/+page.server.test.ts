import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load, actions } from "../../../src/routes/opportunities/+page.server";

describe("opportunities +page.server load", () => {
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
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("returns opportunities from API with pagination", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { body: { data: [{ id: "opp1", displayId: "OPP-alpha-001", stage: "open" }], meta: { page: 1, limit: 25, total: 1 } } },
      "/api/colleagues": { body: { data: [{ id: "col1", name: "Agent A" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0]).toEqual({ id: "opp1", displayId: "OPP-alpha-001", stage: "open" });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
    expect(result.total).toBe(1);
    expect(result.colleagues).toHaveLength(1);
    expect(result.colleagues[0]).toEqual({ id: "col1", name: "Agent A" });
  });

  it("returns empty array when API fails", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { status: 500, body: { error: "Server error" } },
      "/api/colleagues": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.opportunities).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("returns empty colleagues when colleagues API fails", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { body: { data: [], meta: { page: 1, limit: 25, total: 0 } } },
      "/api/colleagues": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.colleagues).toEqual([]);
  });

  it("passes filter params to API", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { body: { data: [], meta: { page: 1, limit: 25, total: 0 } } },
      "/api/colleagues": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ url: "http://localhost/opportunities?stage=open&ownerId=col1&overdueOnly=true&q=test" });
    const result = await load(event as any);

    expect(result.stage).toBe("open");
    expect(result.ownerId).toBe("col1");
    expect(result.overdueOnly).toBe(true);
    expect(result.q).toBe("test");
  });

  it("defaults filter params to empty strings and false when absent", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { body: { data: [], meta: { page: 1, limit: 25, total: 0 } } },
      "/api/colleagues": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.stage).toBe("");
    expect(result.ownerId).toBe("");
    expect(result.overdueOnly).toBe(false);
    expect(result.q).toBe("");
  });

  it("exposes userRole from locals", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { body: { data: [], meta: { page: 1, limit: 25, total: 0 } } },
      "/api/colleagues": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "admin", name: "Admin" } });
    const result = await load(event as any);

    expect(result.userRole).toBe("admin");
  });
});

describe("opportunities actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes an opportunity and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "opp1" } });
    const result = await actions.delete(event as any);

    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1": { status: 404, body: { error: "Not found", code: "NOT_FOUND", requestId: "req-1" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "opp1" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(404);
    expect((result as any).data.error).toBe("Not found");
    expect((result as any).data.code).toBe("NOT_FOUND");
    expect((result as any).data.requestId).toBe("req-1");
  });

  it("uses fallback message when API returns no error field", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp2": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { id: "opp2" } });
    const result = await actions.delete(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(500);
    expect((result as any).data.error).toBe("Failed to delete opportunity");
  });
});
