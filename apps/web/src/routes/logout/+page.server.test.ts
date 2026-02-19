import { describe, it, expect, vi } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../test/helpers";
import { actions } from "./+page.server";

describe("logout +page.server actions.default", () => {
  it("calls logout API, deletes cookie, and redirects to /login", async () => {
    const mockFetch = createMockFetch({
      "/auth/logout": { status: 200, body: {} },
    });
    const event = mockEvent({ fetch: mockFetch });

    try {
      await actions.default(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(303);
      expect((e as Redirect).location).toBe("/login");
    }

    // Verify API was called
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const fetchCall = mockFetch.mock.calls[0];
    expect(fetchCall[0]).toContain("/auth/logout");
    expect(fetchCall[1].method).toBe("POST");

    // Verify cookie was deleted
    expect(event.cookies.delete).toHaveBeenCalledWith("humans_session", { path: "/" });
  });

  it("redirects even when no session token exists", async () => {
    const event = mockEvent();
    // Override cookies.get to return undefined (no session token)
    event.cookies.get = vi.fn(() => undefined);

    try {
      await actions.default(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(303);
      expect((e as Redirect).location).toBe("/login");
    }

    // Should not have called fetch or deleted cookie when there's no session
    expect(event.cookies.delete).not.toHaveBeenCalled();
  });

  it("redirects even when logout API fails", async () => {
    const mockFetch = vi.fn(async () => {
      throw new Error("Network error");
    });
    const event = mockEvent({ fetch: mockFetch });

    try {
      await actions.default(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(303);
      expect((e as Redirect).location).toBe("/login");
    }

    // Cookie should still be deleted even on network error
    expect(event.cookies.delete).toHaveBeenCalledWith("humans_session", { path: "/" });
  });
});
