import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load } from "../../../../src/routes/admin/audit-log/+page.server";

describe("admin/audit-log +page.server", () => {
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

    it("returns logs with default pagination", async () => {
      mockFetch = createMockFetch({
        "/api/admin/audit-log": {
          body: {
            data: [
              { id: "log1", action: "create", entity: "human", createdAt: "2026-01-01T00:00:00Z" },
              { id: "log2", action: "update", entity: "account", createdAt: "2026-01-01T01:00:00Z" },
            ],
          },
        },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.logs).toHaveLength(2);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(50);
    });

    it("passes offset from URL search params", async () => {
      mockFetch = createMockFetch({
        "/api/admin/audit-log": { body: { data: [] } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" },
        url: "http://localhost/admin/audit-log?offset=100",
      });
      const result = await load(event as any);

      expect(result.offset).toBe(100);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("offset=100"),
        expect.any(Object),
      );
    });

    it("returns empty logs when API returns error", async () => {
      mockFetch = createMockFetch({
        "/api/admin/audit-log": { status: 500, body: { error: "Internal error" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.logs).toEqual([]);
      expect(result.offset).toBe(0);
      expect(result.limit).toBe(50);
    });

    it("returns empty logs when API returns non-list data", async () => {
      mockFetch = createMockFetch({
        "/api/admin/audit-log": { body: { message: "unexpected" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.logs).toEqual([]);
    });

    it("passes session token in cookie header", async () => {
      mockFetch = createMockFetch({
        "/api/admin/audit-log": { body: { data: [] } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" },
        sessionToken: "sess-abc",
      });
      await load(event as any);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Cookie: "humans_session=sess-abc" },
        }),
      );
    });
  });
});
