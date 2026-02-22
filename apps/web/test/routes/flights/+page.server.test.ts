import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load } from "../../../src/routes/flights/+page.server";

describe("flights +page.server load", () => {
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

  it("returns flights data from API", async () => {
    const mockFetch = createMockFetch({
      "/api/flights": {
        body: {
          data: [{ id: "flight-1", origin: "JFK", destination: "LAX" }],
          meta: { page: 1, limit: 25, total: 1 },
        },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.flights).toHaveLength(1);
    expect(result.flights[0]).toEqual({ id: "flight-1", origin: "JFK", destination: "LAX" });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(25);
    expect(result.total).toBe(1);
  });
});
