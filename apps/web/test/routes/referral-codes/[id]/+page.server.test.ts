import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load } from "../../../../src/routes/referral-codes/[id]/+page.server";

const sampleReferralCode = {
  id: "ref-1",
  code: "SUMMER10",
  description: "Summer discount",
  humanId: null,
  accountId: null,
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "ref-1" };
  return event;
}

describe("referral-codes/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/referral-codes/ref-1": { body: { data: sampleReferralCode } },
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

  it("returns referral code and supporting data on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.referralCode).toEqual(sampleReferralCode);
    expect(result.allHumans).toEqual([{ id: "h-1", firstName: "Jane", lastName: "Doe" }]);
    expect(result.allAccounts).toEqual([{ id: "acc-1", name: "Acme Corp" }]);
  });

  it("redirects to /referral-codes when referral code API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/referral-codes/ref-1": { status: 404, body: { error: "Not found" } },
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

  it("redirects to /referral-codes when referral code data is missing from response", async () => {
    mockFetch = createMockFetch({
      "/api/referral-codes/ref-1": { body: { unexpected: true } },
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
      "/api/referral-codes/ref-1": { body: { data: sampleReferralCode } },
      "/api/humans": { status: 500, body: {} },
      "/api/accounts": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.referralCode).toEqual(sampleReferralCode);
    expect(result.allHumans).toEqual([]);
    expect(result.allAccounts).toEqual([]);
  });
});
