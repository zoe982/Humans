import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load } from "../../../../src/routes/phone-numbers/[id]/+page.server";

const samplePhone = { id: "ph1", phoneNumber: "+1234567890", labelId: "plbl1" };

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "ph1" };
  return event;
}

describe("phone-numbers/[id] +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/phone-numbers/ph1": { body: { data: samplePhone } },
      "/api/admin/account-config/human-phone-labels": { body: { data: [{ id: "plbl1", label: "Mobile" }] } },
      "/api/admin/account-config/account-phone-labels": { body: { data: [{ id: "aplbl1", label: "Office" }] } },
      "/api/humans": { body: { data: [{ id: "h1", firstName: "Jane" }] } },
      "/api/accounts": { body: { data: [{ id: "acc1", name: "Acme" }] } },
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
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("returns phone, label configs, humans, and accounts on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.phone).toEqual(samplePhone);
    expect(result.humanPhoneLabelConfigs).toHaveLength(1);
    expect(result.accountPhoneLabelConfigs).toHaveLength(1);
    expect(result.allHumans).toHaveLength(1);
    expect(result.allAccounts).toHaveLength(1);
  });

  it("redirects to /phone-numbers when phone API returns 404", async () => {
    mockFetch = createMockFetch({
      "/api/phone-numbers/ph1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/phone-numbers");
    }
  });

  it("redirects to /phone-numbers when API returns non-object data", async () => {
    mockFetch = createMockFetch({
      "/api/phone-numbers/ph1": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/phone-numbers");
    }
  });

  it("returns empty arrays when secondary APIs fail", async () => {
    mockFetch = createMockFetch({
      "/api/phone-numbers/ph1": { body: { data: samplePhone } },
      "/api/admin/account-config/human-phone-labels": { status: 500, body: { error: "fail" } },
      "/api/admin/account-config/account-phone-labels": { status: 500, body: { error: "fail" } },
      "/api/humans": { status: 500, body: { error: "fail" } },
      "/api/accounts": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.humanPhoneLabelConfigs).toEqual([]);
    expect(result.accountPhoneLabelConfigs).toEqual([]);
    expect(result.allHumans).toEqual([]);
    expect(result.allAccounts).toEqual([]);
  });
});
