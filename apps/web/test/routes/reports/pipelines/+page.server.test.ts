import { describe, it, expect } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent } from "../../../helpers";
import { load } from "../../../../src/routes/reports/pipelines/+page.server";

describe("reports/pipelines load", () => {
  it("redirects to /login when user is null", async () => {
    const event = mockEvent({ user: null });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns an empty object when the user is authenticated", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result).toEqual({});
  });
});
