import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../test/helpers";
import { load, actions } from "./+page.server";

describe("accounts/new load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/admin/account-config/account-types": {
        body: { data: [{ id: "t-1", name: "Vendor" }] },
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

  it("returns account types on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.accountTypes).toEqual([{ id: "t-1", name: "Vendor" }]);
  });

  it("returns empty account types when API fails", async () => {
    mockFetch = createMockFetch({
      "/api/admin/account-config/account-types": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.accountTypes).toEqual([]);
  });
});

describe("accounts/new create action", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/accounts": { body: { data: { id: "acc-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to new account on successful create", async () => {
    const event = mockEvent({
      formData: { name: "Acme Corp", typeIds: ["t-1"] },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns failure when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/accounts": { status: 422, body: { error: "Name required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { name: "" } });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Name required");
    }
  });

  it("returns failure when API returns unexpected response shape", async () => {
    mockFetch = createMockFetch({
      "/api/accounts": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { name: "Test Corp" } });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});
