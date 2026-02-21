import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load } from "../../../../src/routes/social-ids/[id]/+page.server";

const sampleSocialId = { id: "s1", handle: "@janedoe", platformId: "plat1" };

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "s1" };
  return event;
}

describe("social-ids/[id] +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/social-ids/s1": { body: { data: sampleSocialId } },
      "/api/admin/account-config/social-id-platforms": { body: { data: [{ id: "plat1", name: "Instagram" }] } },
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

  it("returns socialId, platformConfigs, allHumans, and allAccounts on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.socialId).toEqual(sampleSocialId);
    expect(result.platformConfigs).toHaveLength(1);
    expect(result.allHumans).toHaveLength(1);
    expect(result.allAccounts).toHaveLength(1);
  });

  it("redirects to /social-ids when social ID API returns 404", async () => {
    mockFetch = createMockFetch({
      "/api/social-ids/s1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/social-ids");
    }
  });

  it("redirects to /social-ids when API returns non-object data", async () => {
    mockFetch = createMockFetch({
      "/api/social-ids/s1": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/social-ids");
    }
  });

  it("returns empty arrays when secondary APIs fail", async () => {
    mockFetch = createMockFetch({
      "/api/social-ids/s1": { body: { data: sampleSocialId } },
      "/api/admin/account-config/social-id-platforms": { status: 500, body: { error: "fail" } },
      "/api/humans": { status: 500, body: { error: "fail" } },
      "/api/accounts": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.platformConfigs).toEqual([]);
    expect(result.allHumans).toEqual([]);
    expect(result.allAccounts).toEqual([]);
  });
});
