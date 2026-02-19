import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load, actions } from "../../../src/routes/activities/+page.server";

describe("activities +page.server", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("load", () => {
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

    it("returns activities from API", async () => {
      const mockFetch = createMockFetch({
        "/api/activities": { body: { data: [{ id: "a1", type: "call" }] } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent();
      const result = await load(event as any);

      expect(result.activities).toHaveLength(1);
      expect(result.activities[0]).toEqual({ id: "a1", type: "call" });
      expect(result.type).toBe("");
      expect(result.dateFrom).toBe("");
      expect(result.dateTo).toBe("");
    });

    it("passes filter params to API", async () => {
      const mockFetch = createMockFetch({
        "/api/activities": { body: { data: [] } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        url: "http://localhost/activities?type=call&dateFrom=2024-01-01&dateTo=2024-12-31",
      });
      const result = await load(event as any);

      expect(result.type).toBe("call");
      expect(result.dateFrom).toBe("2024-01-01");
      expect(result.dateTo).toBe("2024-12-31");

      const fetchedUrl = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(fetchedUrl).toContain("type=call");
      expect(fetchedUrl).toContain("dateFrom=2024-01-01");
      expect(fetchedUrl).toContain("dateTo=2024-12-31");
    });

    it("returns empty array when API fails", async () => {
      const mockFetch = createMockFetch({
        "/api/activities": { status: 500, body: { error: "fail" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent();
      const result = await load(event as any);

      expect(result.activities).toEqual([]);
    });
  });

  describe("actions.delete", () => {
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
      expect((result as any).status).toBe(404);
      expect((result as any).data.error).toBe("Not found");
    });
  });
});
