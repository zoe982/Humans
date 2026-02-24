import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load } from "../../../src/routes/websites/+page.server";

describe("websites list load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/websites": {
        body: { data: [{ id: "web-1", url: "https://example.com" }] },
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

  it("returns websites list on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.websites).toEqual([{ id: "web-1", url: "https://example.com" }]);
  });

  it("returns empty array when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/websites": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.websites).toEqual([]);
  });

  it("returns empty array when response has no data array", async () => {
    mockFetch = createMockFetch({
      "/api/websites": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.websites).toEqual([]);
  });
});
