import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/admin/error-log/+page.server";

describe("admin/error-log +page.server", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

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

    it("redirects to /dashboard when user is not admin", async () => {
      const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "agent", name: "Agent" } });
      try {
        await load(event as any);
        expect.fail("should have redirected");
      } catch (e) {
        expect(isRedirect(e)).toBe(true);
        expect((e as Redirect).status).toBe(302);
        expect((e as Redirect).location).toBe("/dashboard");
      }
    });

    it("returns errors with default pagination and empty filters", async () => {
      mockFetch = createMockFetch({
        "/api/admin/error-log": {
          body: {
            data: [
              { id: "e1", code: "AUTH_FAILED", message: "Token expired", createdAt: "2026-01-01T00:00:00Z" },
            ],
          },
        },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.errors).toHaveLength(1);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(50);
      expect(result.codeFilter).toBe("");
      expect(result.dateFrom).toBe("");
      expect(result.dateTo).toBe("");
    });

    it("passes offset from URL search params", async () => {
      mockFetch = createMockFetch({
        "/api/admin/error-log": { body: { data: [] } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" },
        url: "http://localhost/admin/error-log?offset=50",
      });
      const result = await load(event as any);

      expect(result.offset).toBe(50);
    });

    it("passes code filter to API", async () => {
      mockFetch = createMockFetch({
        "/api/admin/error-log": { body: { data: [] } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" },
        url: "http://localhost/admin/error-log?code=AUTH_FAILED",
      });
      const result = await load(event as any);

      expect(result.codeFilter).toBe("AUTH_FAILED");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("code=AUTH_FAILED"),
        expect.any(Object),
      );
    });

    it("passes date range filters to API", async () => {
      mockFetch = createMockFetch({
        "/api/admin/error-log": { body: { data: [] } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" },
        url: "http://localhost/admin/error-log?dateFrom=2026-01-01&dateTo=2026-01-31",
      });
      const result = await load(event as any);

      expect(result.dateFrom).toBe("2026-01-01");
      expect(result.dateTo).toBe("2026-01-31");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("dateFrom=2026-01-01"),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("dateTo=2026-01-31"),
        expect.any(Object),
      );
    });

    it("returns empty errors when API returns error", async () => {
      mockFetch = createMockFetch({
        "/api/admin/error-log": { status: 500, body: { error: "Internal error" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.errors).toEqual([]);
    });

    it("returns empty errors when API returns non-list data", async () => {
      mockFetch = createMockFetch({
        "/api/admin/error-log": { body: { message: "unexpected" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.errors).toEqual([]);
    });
  });

  describe("actions.toggleResolution", () => {
    it("redirects to /login when user is null", async () => {
      const event = mockEvent({ user: null, formData: { id: "e1", resolutionStatus: "resolved" } });
      try {
        await actions.toggleResolution(event as any);
        expect.fail("should have redirected");
      } catch (e) {
        expect(isRedirect(e)).toBe(true);
        expect((e as Redirect).status).toBe(302);
        expect((e as Redirect).location).toBe("/login");
      }
    });

    it("redirects to /dashboard when user is not admin", async () => {
      const event = mockEvent({
        user: { id: "u1", email: "a@b.com", role: "agent", name: "Agent" },
        formData: { id: "e1", resolutionStatus: "resolved" },
      });
      try {
        await actions.toggleResolution(event as any);
        expect.fail("should have redirected");
      } catch (e) {
        expect(isRedirect(e)).toBe(true);
        expect((e as Redirect).status).toBe(302);
        expect((e as Redirect).location).toBe("/dashboard");
      }
    });

    it("calls toggle-resolution endpoint and returns success", async () => {
      mockFetch = createMockFetch({
        "/api/admin/error-log": { body: {} },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" },
        formData: { id: "e1", resolutionStatus: "resolved" },
      });
      const result = await actions.toggleResolution(event as any);

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/error-log/e1/resolution"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("passes session token in cookie header", async () => {
      mockFetch = createMockFetch({
        "/api/admin/error-log": { body: {} },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" },
        sessionToken: "sess-xyz",
        formData: { id: "e1", resolutionStatus: "resolved" },
      });
      await actions.toggleResolution(event as any);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Cookie: "humans_session=sess-xyz" }),
        }),
      );
    });
  });
});
