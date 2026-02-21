import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/leads/website-booking-requests/+page.server";

describe("website-booking-requests +page.server load", () => {
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

  it("returns bookings list from API", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests": {
        body: {
          data: [{ id: "b1", status: "new" }],
          meta: { page: 1, limit: 25, total: 1 },
        },
      },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.bookings).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
    expect(result.total).toBe(1);
  });

  it("returns empty array and zero total when API fails", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.bookings).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("passes page and limit from URL params", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests": {
        body: {
          data: [],
          meta: { page: 2, limit: 10, total: 50 },
        },
      },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ url: "http://localhost/leads/website-booking-requests?page=2&limit=10" });
    const result = await load(event as any);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("page=2"),
      expect.any(Object),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=10"),
      expect.any(Object),
    );
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });

  it("returns userRole from locals", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests": { body: { data: [], meta: { page: 1, limit: 25, total: 0 } } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "manager", name: "Mgr" } });
    const result = await load(event as any);
    expect(result.userRole).toBe("manager");
  });
});

describe("website-booking-requests +page.server actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ formData: { id: "b1" } });
    const result = await actions.delete(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/website-booking-requests/b1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ formData: { id: "b1" } });
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Not found");
    }
  });
});
