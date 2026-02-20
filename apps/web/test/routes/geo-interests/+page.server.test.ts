import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load, actions } from "../../../src/routes/geo-interests/+page.server";

describe("geo-interests +page.server", () => {
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

    it("returns geo-interests from API", async () => {
      const mockFetch = createMockFetch({
        "/api/geo-interests": { body: { data: [{ id: "g1", city: "Rome", country: "IT" }] } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent();
      const result = await load(event as any);

      expect(result.geoInterests).toHaveLength(1);
      expect(result.geoInterests[0]).toEqual({ id: "g1", city: "Rome", country: "IT" });
    });

    it("returns empty array when API fails", async () => {
      const mockFetch = createMockFetch({
        "/api/geo-interests": { status: 500, body: { error: "fail" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent();
      const result = await load(event as any);

      expect(result.geoInterests).toEqual([]);
    });
  });

  describe("actions.create", () => {
    it("creates a geo-interest and returns success", async () => {
      const mockFetch = createMockFetch({
        "/api/geo-interests": { status: 200, body: { data: { id: "g1" } } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ formData: { city: "Rome", country: "IT" } });
      const result = await actions.create(event as any);

      expect(result).toEqual({ success: true });
    });

    it("returns validation failure when city is missing", async () => {
      const event = mockEvent({ formData: { city: "", country: "IT" } });
      const result = await actions.create(event as any);

      expect(isActionFailure(result)).toBe(true);
      expect((result as any).status).toBe(400);
      expect((result as any).data.error).toBe("City and country are required.");
    });

    it("returns validation failure when country is missing", async () => {
      const event = mockEvent({ formData: { city: "Rome", country: "" } });
      const result = await actions.create(event as any);

      expect(isActionFailure(result)).toBe(true);
      expect((result as any).status).toBe(400);
      expect((result as any).data.error).toBe("City and country are required.");
    });

    it("returns failure when API returns error", async () => {
      const mockFetch = createMockFetch({
        "/api/geo-interests": { status: 422, body: { error: "Duplicate entry", code: "DUPLICATE", requestId: "req-1" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ formData: { city: "Rome", country: "IT" } });
      const result = await actions.create(event as any);

      expect(isActionFailure(result)).toBe(true);
      expect((result as any).status).toBe(422);
      expect((result as any).data.error).toBe("Duplicate entry");
      expect((result as any).data.code).toBe("DUPLICATE");
    });
  });

  describe("actions.delete", () => {
    it("deletes a geo-interest and returns success", async () => {
      const mockFetch = createMockFetch({
        "/api/geo-interests/g1": { status: 200, body: { success: true } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ formData: { id: "g1" } });
      const result = await actions.delete(event as any);

      expect(result).toEqual({ success: true });
    });

    it("returns failure when API returns error", async () => {
      const mockFetch = createMockFetch({
        "/api/geo-interests/g1": { status: 404, body: { error: "Geo-interest not found", code: "NOT_FOUND", requestId: "req-1" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ formData: { id: "g1" } });
      const result = await actions.delete(event as any);

      expect(isActionFailure(result)).toBe(true);
      expect((result as any).status).toBe(404);
      expect((result as any).data.error).toBe("Geo-interest not found");
      expect((result as any).data.code).toBe("NOT_FOUND");
      expect((result as any).data.requestId).toBe("req-1");
    });

    it("uses fallback message when API returns no error field", async () => {
      const mockFetch = createMockFetch({
        "/api/geo-interests/g2": { status: 500, body: {} },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ formData: { id: "g2" } });
      const result = await actions.delete(event as any);

      expect(isActionFailure(result)).toBe(true);
      expect((result as any).status).toBe(500);
      expect((result as any).data.error).toBe("Failed to delete geo-interest");
    });
  });
});
