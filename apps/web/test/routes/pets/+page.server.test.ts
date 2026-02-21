import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load, actions } from "../../../src/routes/pets/+page.server";

describe("pets +page.server load", () => {
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

  it("returns pets list from API", async () => {
    const mockFetch = createMockFetch({
      "/api/pets": { body: { data: [{ id: "p1", name: "Buddy" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.pets).toHaveLength(1);
    expect(result.pets[0]).toMatchObject({ id: "p1", name: "Buddy" });
  });

  it("returns empty array when API fails", async () => {
    const mockFetch = createMockFetch({
      "/api/pets": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.pets).toEqual([]);
  });

  it("returns empty array when API returns non-list data", async () => {
    const mockFetch = createMockFetch({
      "/api/pets": { body: { message: "unexpected" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.pets).toEqual([]);
  });

  it("returns user role from locals", async () => {
    const mockFetch = createMockFetch({
      "/api/pets": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "manager", name: "Mgr" } });
    const result = await load(event as any);
    expect(result.userRole).toBe("manager");
  });
});

describe("pets +page.server actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/pets/p1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ formData: { id: "p1" } });
    const result = await actions.delete(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/pets/p1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/pets/p1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ formData: { id: "p1" } });
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Not found");
    }
  });

  it("passes session token in cookie header", async () => {
    const mockFetch = createMockFetch({
      "/api/pets/p2": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ formData: { id: "p2" }, sessionToken: "tok-abc" });
    await actions.delete(event as any);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { Cookie: "humans_session=tok-abc" },
      }),
    );
  });
});
