import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../test/helpers";
import { load } from "./+page.server";

describe("emails +page.server load", () => {
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

  it("returns emails from API", async () => {
    const mockFetch = createMockFetch({
      "/api/emails": { body: { data: [{ id: "e1", address: "test@example.com" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.emails).toHaveLength(1);
    expect(result.emails[0]).toEqual({ id: "e1", address: "test@example.com" });
  });

  it("returns empty array when API fails", async () => {
    const mockFetch = createMockFetch({
      "/api/emails": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.emails).toEqual([]);
  });
});
