import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load } from "../../../../src/routes/websites/[id]/+page.server";

const sampleWebsite = {
  id: "web-1",
  url: "https://example.com",
  humanId: null,
  accountId: null,
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "web-1" };
  return event;
}

describe("websites/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/websites/web-1": { body: { data: sampleWebsite } },
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

  it("returns website and supporting data on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.website).toEqual(sampleWebsite);
    expect(result.allHumans).toEqual([{ id: "h-1", firstName: "Jane", lastName: "Doe" }]);
    expect(result.allAccounts).toEqual([{ id: "acc-1", name: "Acme Corp" }]);
  });

  it("redirects to /websites when website API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/websites/web-1": { status: 404, body: { error: "Not found" } },
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

  it("redirects to /websites when website data is missing from response", async () => {
    mockFetch = createMockFetch({
      "/api/websites/web-1": { body: { unexpected: true } },
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
      "/api/websites/web-1": { body: { data: sampleWebsite } },
      "/api/humans": { status: 500, body: {} },
      "/api/accounts": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.website).toEqual(sampleWebsite);
    expect(result.allHumans).toEqual([]);
    expect(result.allAccounts).toEqual([]);
  });
});
