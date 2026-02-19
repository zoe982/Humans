import { describe, it, expect } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent } from "../../helpers";
import { load } from "../../../src/routes/admin/+page.server";

describe("admin +page.server load", () => {
  it("redirects to /login when user is null", () => {
    const event = mockEvent({ user: null });
    try {
      (load as Function)(event);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("redirects to /dashboard when user is not admin", () => {
    const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "agent", name: "Agent" } });
    try {
      (load as Function)(event);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/dashboard");
    }
  });

  it("does not redirect when user is admin", () => {
    const event = mockEvent({ user: { id: "u1", email: "admin@b.com", role: "admin", name: "Admin" } });
    // Should not throw
    const result = (load as Function)(event);
    expect(result).toBeUndefined();
  });
});
