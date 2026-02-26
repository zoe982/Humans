import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch, mockConfigItem, mockBatchConfigResponse } from "../../../helpers";
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
      "account-config/batch": mockBatchConfigResponse({
        "human-phone-labels": [mockConfigItem({ id: "plbl1", name: "Mobile" })],
        "account-phone-labels": [mockConfigItem({ id: "aplbl1", name: "Office" })],
      }),
      "/api/phone-numbers/ph1": { body: { data: samplePhone } },
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

  it("returns phone and label configs on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.phone).toEqual(samplePhone);
    expect(result.humanPhoneLabelConfigs).toEqual([expect.objectContaining({ id: "plbl1", name: "Mobile" })]);
    expect(result.accountPhoneLabelConfigs).toEqual([expect.objectContaining({ id: "aplbl1", name: "Office" })]);
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

  it("returns empty arrays when config API fails", async () => {
    mockFetch = createMockFetch({
      "account-config/batch": { status: 500, body: { error: "fail" } },
      "/api/phone-numbers/ph1": { body: { data: samplePhone } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.humanPhoneLabelConfigs).toEqual([]);
    expect(result.accountPhoneLabelConfigs).toEqual([]);
  });
});
