import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load } from "../../../src/routes/search/+page.server";

describe("search +page.server load", () => {
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

  it("returns empty results when query is blank", async () => {
    const event = mockEvent({ url: "http://localhost/search" });
    const result = await load(event as any);

    expect(result.q).toBe("");
    expect(result.humans).toEqual([]);
    expect(result.routeSignups).toEqual([]);
    expect(result.activities).toEqual([]);
    expect(result.geoInterests).toEqual([]);
    expect(result.accounts).toEqual([]);
  });

  it("returns empty results when query is whitespace only", async () => {
    const event = mockEvent({ url: "http://localhost/search?q=%20%20" });
    const result = await load(event as any);

    expect(result.q).toBe("  ");
    expect(result.humans).toEqual([]);
  });

  it("returns search results from API", async () => {
    const mockFetch = createMockFetch({
      "/api/search": {
        body: {
          humans: [{ id: "h1", firstName: "Jane" }],
          routeSignups: [],
          activities: [{ id: "a1" }],
          geoInterests: [],
          accounts: [{ id: "acc1" }],
        },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ url: "http://localhost/search?q=jane" });
    const result = await load(event as any);

    expect(result.q).toBe("jane");
    expect(result.humans).toHaveLength(1);
    expect(result.activities).toHaveLength(1);
    expect(result.accounts).toHaveLength(1);
  });

  it("returns empty results when API fails", async () => {
    const mockFetch = createMockFetch({
      "/api/search": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ url: "http://localhost/search?q=test" });
    const result = await load(event as any);

    expect(result.q).toBe("test");
    expect(result.humans).toEqual([]);
    expect(result.routeSignups).toEqual([]);
    expect(result.activities).toEqual([]);
    expect(result.geoInterests).toEqual([]);
    expect(result.accounts).toEqual([]);
  });
});
