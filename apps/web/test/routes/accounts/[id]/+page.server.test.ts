import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/accounts/[id]/+page.server";

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "acc-1" };
  return event;
}

describe("accounts/[id] load", () => {
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

  it("returns accountId from params", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.accountId).toBe("acc-1");
  });
});

describe("accounts/[id] addEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when email is added", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/emails": { body: { data: { id: "em-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "info@acme.com", labelId: "el-1" } });
    const result = await actions.addEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/emails": { status: 422, body: { error: "Invalid" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "bad" } });
    const result = await actions.addEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] deleteEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/emails/em-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "em-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/emails/em-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "em-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] addPhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when phone number is added", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/phone-numbers": { body: { data: { id: "ph-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { phoneNumber: "+1234567890", labelId: "pl-1" },
    });
    const result = await actions.addPhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/phone-numbers": { status: 422, body: { error: "Invalid phone" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumber: "bad" } });
    const result = await actions.addPhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] deletePhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/phone-numbers/ph-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "ph-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });
});

describe("accounts/[id] linkHuman action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when human is linked", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/humans": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { humanId: "h-1", labelId: "hl-1" } });
    const result = await actions.linkHuman(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/humans": { status: 409, body: { error: "Already linked" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { humanId: "h-1" } });
    const result = await actions.linkHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] unlinkHuman action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on unlink", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/humans/link-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "link-1" } });
    const result = await actions.unlinkHuman(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/humans/link-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "link-1" } });
    const result = await actions.unlinkHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] updateHumanLabel action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on label update", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/humans/link-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link-1", labelId: "hl-2" } });
    const result = await actions.updateHumanLabel(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/humans/link-1": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link-1", labelId: "bad" } });
    const result = await actions.updateHumanLabel(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] createAndLinkHuman action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates human and links to account on success", async () => {
    const mockFetch = createMockFetch({
      "/api/humans": { body: { data: { id: "h-new" } } },
      "/api/accounts/acc-1/humans": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { firstName: "John", lastName: "Smith", labelId: "hl-1" },
    });
    const result = await actions.createAndLinkHuman(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when human creation fails", async () => {
    const mockFetch = createMockFetch({
      "/api/humans": { status: 422, body: { error: "Name required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { firstName: "", lastName: "" } });
    const result = await actions.createAndLinkHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("returns failure when human is created but linking fails", async () => {
    const mockFetch = createMockFetch({
      "/api/humans": { body: { data: { id: "h-new" } } },
      "/api/accounts/acc-1/humans": { status: 500, body: { error: "Link failed" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { firstName: "John", lastName: "Smith" },
    });
    const result = await actions.createAndLinkHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] deletePhoneNumber error path", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/phone-numbers/ph-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "ph-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] addSocialId action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when social ID is added", async () => {
    const mockFetch = createMockFetch({
      "/api/social-ids": { body: { data: { id: "sid-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { handle: "@acmecorp", platformId: "plat-1" },
    });
    const result = await actions.addSocialId(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/social-ids": { status: 422, body: { error: "Handle required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { handle: "" } });
    const result = await actions.addSocialId(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] deleteSocialId action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/social-ids/sid-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "sid-1" } });
    const result = await actions.deleteSocialId(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/social-ids/sid-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "sid-1" } });
    const result = await actions.deleteSocialId(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] createAndLinkHuman missing ID path", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns failure when created human has no ID in response", async () => {
    const mockFetch = createMockFetch({
      "/api/humans": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { firstName: "John", lastName: "Smith" },
    });
    const result = await actions.createAndLinkHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toContain("Failed to get created human ID");
    }
  });
});

describe("accounts/[id] addWebsite action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when website is added", async () => {
    const mockFetch = createMockFetch({
      "/api/websites": { body: { data: { id: "web-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { url: "https://acme.com" } });
    const result = await actions.addWebsite(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/websites": { status: 422, body: { error: "Invalid URL" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { url: "not-a-url" } });
    const result = await actions.addWebsite(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] deleteWebsite action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/websites/web-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "web-1" } });
    const result = await actions.deleteWebsite(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/websites/web-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "web-1" } });
    const result = await actions.deleteWebsite(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] addReferralCode action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when referral code is added", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes": { body: { data: { id: "ref-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { code: "ACME10", description: "10% off" } });
    const result = await actions.addReferralCode(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes": { status: 409, body: { error: "Code already exists" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { code: "DUPLICATE" } });
    const result = await actions.addReferralCode(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] deleteReferralCode action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes/ref-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "ref-1" } });
    const result = await actions.deleteReferralCode(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes/ref-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "ref-1" } });
    const result = await actions.deleteReferralCode(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] linkDiscountCode action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when discount code is linked", async () => {
    const mockFetch = createMockFetch({
      "/api/discount-codes/dc-1": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { discountCodeId: "dc-1" } });
    const result = await actions.linkDiscountCode(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/discount-codes/dc-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { discountCodeId: "dc-1" } });
    const result = await actions.linkDiscountCode(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] unlinkDiscountCode action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when discount code is unlinked", async () => {
    const mockFetch = createMockFetch({
      "/api/discount-codes/dc-1": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "dc-1" } });
    const result = await actions.unlinkDiscountCode(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/discount-codes/dc-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "dc-1" } });
    const result = await actions.unlinkDiscountCode(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("accounts/[id] addActivity action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on activity creation", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: {
        type: "call",
        subject: "Check in",
        activityDate: "2025-01-15",
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns success with default type when type omitted", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-2" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    // No activityDate so default date branch is exercised
    const event = makeEvent({
      formData: { subject: "No date" },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { type: "email", subject: "Test" },
    });
    const result = await actions.addActivity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});
