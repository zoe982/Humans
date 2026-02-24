import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load } from "../../../../src/routes/discount-codes/[id]/+page.server";

const sampleDiscountCode = {
  id: "disc-1",
  code: "SAVE20",
  description: "20% off",
  humanId: null,
  accountId: null,
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "disc-1" };
  return event;
}

describe("discount-codes/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/discount-codes/disc-1": { body: { data: sampleDiscountCode } },
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane", lastName: "Doe" }] } },
      "/api/accounts": { body: { data: [{ id: "acc-1", name: "Acme Corp" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when user is null", async () => {
    const event = makeEvent({ user: null });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns discount code and supporting data on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.discountCode).toEqual(sampleDiscountCode);
    expect(result.allHumans).toEqual([{ id: "h-1", firstName: "Jane", lastName: "Doe" }]);
    expect(result.allAccounts).toEqual([{ id: "acc-1", name: "Acme Corp" }]);
  });

  it("redirects to /discount-codes when discount code API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/discount-codes/disc-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("redirects to /discount-codes when discount code data is missing from response", async () => {
    mockFetch = createMockFetch({
      "/api/discount-codes/disc-1": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns empty arrays when humans and accounts APIs fail", async () => {
    mockFetch = createMockFetch({
      "/api/discount-codes/disc-1": { body: { data: sampleDiscountCode } },
      "/api/humans": { status: 500, body: {} },
      "/api/accounts": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.discountCode).toEqual(sampleDiscountCode);
    expect(result.allHumans).toEqual([]);
    expect(result.allAccounts).toEqual([]);
  });
});
