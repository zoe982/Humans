import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load } from "../../../src/routes/referral-codes/+page.server";

describe("referral-codes list load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/referral-codes": {
        body: { data: [{ id: "ref-1", code: "SUMMER10", description: "Summer discount" }] },
      },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

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
    }
  });

  it("returns referral codes list on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.referralCodes).toEqual([
      { id: "ref-1", code: "SUMMER10", description: "Summer discount" },
    ]);
  });

  it("returns empty array when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/referral-codes": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.referralCodes).toEqual([]);
  });

  it("returns empty array when response has no data array", async () => {
    mockFetch = createMockFetch({
      "/api/referral-codes": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.referralCodes).toEqual([]);
  });
});
