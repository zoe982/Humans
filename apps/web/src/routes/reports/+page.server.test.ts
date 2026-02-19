import { describe, it, expect } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent } from "../../../test/helpers";
import { load } from "./+page.server";

describe("reports +page.server load", () => {
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

  it("redirects agent to /dashboard", () => {
    const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "agent", name: "Agent" } });
    try {
      load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/dashboard");
    }
  });

  it("does not redirect manager", () => {
    const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "manager", name: "Mgr" } });
    const result = load(event as any);
    expect(result).toBeUndefined();
  });

  it("does not redirect admin", () => {
    const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "admin", name: "Admin" } });
    const result = load(event as any);
    expect(result).toBeUndefined();
  });
});
