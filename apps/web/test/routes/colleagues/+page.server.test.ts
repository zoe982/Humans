import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load } from "../../../src/routes/colleagues/+page.server";

describe("colleagues list load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/colleagues": {
        body: {
          data: [
            { id: "col-1", name: "Alice Smith", email: "alice@example.com", role: "admin" },
          ],
        },
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

  it("returns colleagues list on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.colleagues).toEqual([
      { id: "col-1", name: "Alice Smith", email: "alice@example.com", role: "admin" },
    ]);
  });

  it("returns empty array when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/colleagues": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.colleagues).toEqual([]);
  });

  it("returns empty array when response has no data array", async () => {
    mockFetch = createMockFetch({
      "/api/colleagues": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.colleagues).toEqual([]);
  });
});
