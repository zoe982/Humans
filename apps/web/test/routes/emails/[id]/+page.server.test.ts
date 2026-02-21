import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch, mockConfigItem } from "../../../helpers";
import { load } from "../../../../src/routes/emails/[id]/+page.server";

const sampleEmail = { id: "e1", email: "jane@example.com", labelId: "lbl1" };

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "e1" };
  return event;
}

describe("emails/[id] +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/emails/e1": { body: { data: sampleEmail } },
      "/api/admin/account-config/human-email-labels": { body: { data: [mockConfigItem({ id: "lbl1", name: "Work" })] } },
      "/api/admin/account-config/account-email-labels": { body: { data: [mockConfigItem({ id: "albl1", name: "Billing" })] } },
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

  it("returns email, label configs, humans, and accounts on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.email).toEqual(sampleEmail);
    expect(result.humanEmailLabelConfigs).toEqual([expect.objectContaining({ id: "lbl1", name: "Work" })]);
    expect(result.accountEmailLabelConfigs).toEqual([expect.objectContaining({ id: "albl1", name: "Billing" })]);
    expect(result.allHumans).toHaveLength(1);
    expect(result.allAccounts).toHaveLength(1);
  });

  it("redirects to /emails when email API returns 404", async () => {
    mockFetch = createMockFetch({
      "/api/emails/e1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/emails");
    }
  });

  it("redirects to /emails when API returns non-object data", async () => {
    mockFetch = createMockFetch({
      "/api/emails/e1": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/emails");
    }
  });

  it("returns empty arrays when secondary APIs fail", async () => {
    mockFetch = createMockFetch({
      "/api/emails/e1": { body: { data: sampleEmail } },
      "/api/admin/account-config/human-email-labels": { status: 500, body: { error: "fail" } },
      "/api/admin/account-config/account-email-labels": { status: 500, body: { error: "fail" } },
      "/api/humans": { status: 500, body: { error: "fail" } },
      "/api/accounts": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.humanEmailLabelConfigs).toEqual([]);
    expect(result.accountEmailLabelConfigs).toEqual([]);
    expect(result.allHumans).toEqual([]);
    expect(result.allAccounts).toEqual([]);
  });
});
