import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../test/helpers";
import { load } from "./+page.server";

describe("humans +page.server load", () => {
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

  it("returns humans from API", async () => {
    const mockFetch = createMockFetch({
      "/api/humans": { body: { data: [{ id: "h1", firstName: "Jane" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.humans).toHaveLength(1);
    expect(result.humans[0]).toEqual({ id: "h1", firstName: "Jane" });
  });

  it("returns empty array when API fails", async () => {
    const mockFetch = createMockFetch({
      "/api/humans": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.humans).toEqual([]);
  });
});
