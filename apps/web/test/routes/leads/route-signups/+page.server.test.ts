import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/leads/route-signups/+page.server";

describe("leads/route-signups +page.server load", () => {
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

  it("returns signups from API with pagination and filter fields", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups": { body: { data: [{ id: "rs1", routeName: "Rome" }], meta: { page: 1, limit: 25, total: 1 } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.signups).toHaveLength(1);
    expect(result.signups[0]).toEqual({ id: "rs1", routeName: "Rome" });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
    expect(result.total).toBe(1);
    expect(result.status).toBe("");
    expect(result.q).toBe("");
    expect(result.origin).toBe("");
    expect(result.destination).toBe("");
    expect(result.dateFrom).toBe("");
    expect(result.dateTo).toBe("");
  });

  it("returns empty array when API fails", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.signups).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.status).toBe("");
    expect(result.q).toBe("");
    expect(result.origin).toBe("");
    expect(result.destination).toBe("");
    expect(result.dateFrom).toBe("");
    expect(result.dateTo).toBe("");
  });

  it("passes filter params to API and returns them in data", async () => {
    const mockFetch = createMockFetch({
      "/api/route-signups": { body: { data: [], meta: { page: 1, limit: 25, total: 0 } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      url: "http://localhost/leads/route-signups?status=open&q=test&origin=Rome&destination=NYC&dateFrom=2025-01-01&dateTo=2025-12-31",
    });
    const result = await load(event as any);

    // Verify filter values returned in page data
    expect(result.status).toBe("open");
    expect(result.q).toBe("test");
    expect(result.origin).toBe("Rome");
    expect(result.destination).toBe("NYC");
    expect(result.dateFrom).toBe("2025-01-01");
    expect(result.dateTo).toBe("2025-12-31");

    // Verify params were forwarded to the API
    const fetchUrl = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(fetchUrl).toContain("status=open");
    expect(fetchUrl).toContain("q=test");
    expect(fetchUrl).toContain("origin=Rome");
    expect(fetchUrl).toContain("destination=NYC");
    expect(fetchUrl).toContain("dateFrom=2025-01-01");
    expect(fetchUrl).toContain("dateTo=2025-12-31");
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
