import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load } from "../../../src/routes/social-ids/+page.server";

describe("social-ids +page.server load", () => {
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

  it("returns social IDs from API", async () => {
    const mockFetch = createMockFetch({
      "/api/social-ids": { body: { data: [{ id: "s1", handle: "@jane" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.socialIds).toHaveLength(1);
    expect(result.socialIds[0]).toMatchObject({ id: "s1", handle: "@jane" });
  });

  it("returns empty array when API fails", async () => {
    const mockFetch = createMockFetch({
      "/api/social-ids": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.socialIds).toEqual([]);
  });

  it("returns empty array when API returns non-list data", async () => {
    const mockFetch = createMockFetch({
      "/api/social-ids": { body: { message: "unexpected" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.socialIds).toEqual([]);
  });
});
