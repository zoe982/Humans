import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/admin/colleague-user-accounts/+page.server";

describe("admin/colleague-user-accounts +page.server", () => {
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

    it("returns colleagues on successful load", async () => {
      mockFetch = createMockFetch({
        "/api/admin/colleagues": {
          body: { data: [{ id: "c1", email: "colleague@test.com", firstName: "Jane", lastName: "Doe", role: "agent" }] },
        },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.colleagues).toEqual([
        { id: "c1", email: "colleague@test.com", firstName: "Jane", lastName: "Doe", role: "agent" },
      ]);
    });

    it("returns empty colleagues when API returns error", async () => {
      mockFetch = createMockFetch({
        "/api/admin/colleagues": { status: 500, body: { error: "Internal error" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.colleagues).toEqual([]);
    });

    it("returns empty colleagues when API returns non-list data", async () => {
      mockFetch = createMockFetch({
        "/api/admin/colleagues": { body: { message: "unexpected shape" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
      const result = await load(event as any);

      expect(result.colleagues).toEqual([]);
    });

    it("passes session token in cookie header", async () => {
      mockFetch = createMockFetch({
        "/api/admin/colleagues": { body: { data: [] } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" },
        sessionToken: "my-session-123",
      });
      await load(event as any);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/colleagues"),
        expect.objectContaining({
          headers: { Cookie: "humans_session=my-session-123" },
        }),
      );
    });
  });

  describe("actions.invite", () => {
    it("invites a colleague successfully", async () => {
      mockFetch = createMockFetch({
        "/api/admin/colleagues": { body: { data: { id: "new-1" } } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        formData: {
          email: "new@example.com",
          firstName: "John",
          lastName: "Smith",
          role: "agent",
        },
      });
      const result = await actions.invite(event as any);

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/colleagues"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("returns validation failure for invalid input", async () => {
      mockFetch = createMockFetch({});
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        formData: {
          email: "not-an-email",
          firstName: "",
          lastName: "",
          role: "invalid-role",
        },
      });
      const result = await actions.invite(event as any);

      expect(isActionFailure(result)).toBe(true);
      if (isActionFailure(result)) {
        expect(result.status).toBe(400);
        expect(result.data.error).toBe("Invalid input");
      }
    });

    it("returns failure when API returns error", async () => {
      mockFetch = createMockFetch({
        "/api/admin/colleagues": { status: 409, body: { error: "Email already exists", code: "CONFLICT" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        formData: {
          email: "existing@example.com",
          firstName: "John",
          lastName: "Smith",
          role: "agent",
        },
      });
      const result = await actions.invite(event as any);

      expect(isActionFailure(result)).toBe(true);
      if (isActionFailure(result)) {
        expect(result.status).toBe(409);
        expect(result.data.error).toBe("Email already exists");
        expect(result.data.code).toBe("CONFLICT");
      }
    });
  });

  describe("actions.update", () => {
    it("updates a colleague successfully", async () => {
      mockFetch = createMockFetch({
        "/api/admin/colleagues/c1": { body: { data: { id: "c1" } } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        formData: {
          id: "c1",
          role: "admin",
          isActive: "true",
        },
      });
      const result = await actions.update(event as any);

      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/colleagues/c1"),
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("returns failure when API returns error", async () => {
      mockFetch = createMockFetch({
        "/api/admin/colleagues": { status: 404, body: { error: "Colleague not found" } },
      });
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        formData: {
          id: "bad-id",
          role: "agent",
          isActive: "true",
        },
      });
      const result = await actions.update(event as any);

      expect(isActionFailure(result)).toBe(true);
      if (isActionFailure(result)) {
        expect(result.status).toBe(404);
      }
    });

    it("returns validation failure for invalid role", async () => {
      mockFetch = createMockFetch({});
      vi.stubGlobal("fetch", mockFetch);

      const event = mockEvent({
        formData: {
          id: "c1",
          role: "superadmin",
          isActive: "true",
        },
      });
      const result = await actions.update(event as any);

      expect(isActionFailure(result)).toBe(true);
      if (isActionFailure(result)) {
        expect(result.status).toBe(400);
        expect(result.data.error).toBe("Invalid input");
      }
    });
  });
});
