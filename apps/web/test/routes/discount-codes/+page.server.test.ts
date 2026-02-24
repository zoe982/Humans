import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load } from "../../../src/routes/discount-codes/+page.server";

describe("discount-codes list load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/discount-codes": {
        body: { data: [{ id: "disc-1", code: "SAVE20", description: "20% off" }] },
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

  it("returns discount codes list on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.discountCodes).toEqual([
      { id: "disc-1", code: "SAVE20", description: "20% off" },
    ]);
  });

  it("returns empty array when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/discount-codes": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.discountCodes).toEqual([]);
  });

  it("returns empty array when response has no data array", async () => {
    mockFetch = createMockFetch({
      "/api/discount-codes": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.discountCodes).toEqual([]);
  });
});
