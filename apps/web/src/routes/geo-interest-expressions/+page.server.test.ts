import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../test/helpers";
import { load } from "./+page.server";

describe("geo-interest-expressions +page.server load", () => {
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

  it("returns expressions from API", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { body: { data: [{ id: "ex1", humanId: "h1", geoInterestId: "g1" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.expressions).toHaveLength(1);
    expect(result.expressions[0]).toEqual({ id: "ex1", humanId: "h1", geoInterestId: "g1" });
  });

  it("returns empty array when API fails", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.expressions).toEqual([]);
  });
});
