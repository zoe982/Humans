import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/websites/new/+page.server";

describe("websites/new load", () => {
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

  it("returns empty accounts when accounts API returns unexpected shape", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane", lastName: "Doe" }] } },
      "/api/accounts": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([{ id: "h-1", firstName: "Jane", lastName: "Doe" }]);
    expect(result.allAccounts).toEqual([]);
  });
});

describe("websites/new create action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to new website on successful create", async () => {
    const mockFetch = createMockFetch({
      "/api/websites": { body: { data: { id: "web-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { url: "https://newsite.com" },
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
      "/api/websites": { status: 422, body: { error: "URL is required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { url: "" } });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("URL is required");
    }
  });

  it("returns failure when API returns unexpected response shape", async () => {
    const mockFetch = createMockFetch({
      "/api/websites": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { url: "https://example.com" } });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("sends optional humanId and accountId when provided", async () => {
    const mockFetch = createMockFetch({
      "/api/websites": { body: { data: { id: "web-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { url: "https://partner.com", humanId: "h-1", accountId: "acc-1" },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });
});
