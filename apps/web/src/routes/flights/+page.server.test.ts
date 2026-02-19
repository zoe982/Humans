import { describe, it, expect } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent } from "../../../test/helpers";
import { load } from "./+page.server";

describe("flights +page.server load", () => {
  it("redirects to /login when user is null", () => {
    const event = mockEvent({ user: null });
    try {
      load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("does not redirect when user is present", () => {
    const event = mockEvent();
    // Should not throw — returns undefined (no data to load)
    const result = load(event as any);
    expect(result).toBeUndefined();
  });
});
