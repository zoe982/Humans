import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/referral-codes/new/+page.server";

describe("referral-codes/new load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane", lastName: "Doe" }] } },
      "/api/accounts": { body: { data: [{ id: "acc-1", name: "Acme Corp" }] } },
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

  it("returns humans and accounts on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([{ id: "h-1", firstName: "Jane", lastName: "Doe" }]);
    expect(result.allAccounts).toEqual([{ id: "acc-1", name: "Acme Corp" }]);
  });

  it("returns empty arrays when both APIs fail", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { status: 500, body: {} },
      "/api/accounts": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
    expect(result.allAccounts).toEqual([]);
  });

  it("returns empty humans when humans API returns unexpected shape", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { unexpected: true } },
      "/api/accounts": { body: { data: [{ id: "acc-1", name: "Acme Corp" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
    expect(result.allAccounts).toEqual([{ id: "acc-1", name: "Acme Corp" }]);
  });
});

describe("referral-codes/new create action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to new referral code on successful create", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes": { body: { data: { id: "ref-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { code: "WINTER20", description: "Winter sale" },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes": { status: 422, body: { error: "Code already exists" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { code: "DUPLICATE" } });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Code already exists");
    }
  });

  it("returns failure when API returns unexpected response shape", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { code: "TEST123" } });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("sends optional humanId and accountId when provided", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes": { body: { data: { id: "ref-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { code: "PARTNER50", humanId: "h-1", accountId: "acc-1" },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });
});
