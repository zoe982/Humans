import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../test/helpers";
import { load } from "./+page.server";

describe("accounts list load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/accounts": {
        body: { data: [{ id: "acc-1", name: "Acme Corp" }] },
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

  it("returns accounts list on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.accounts).toEqual([{ id: "acc-1", name: "Acme Corp" }]);
  });

  it("returns empty accounts when API fails", async () => {
    mockFetch = createMockFetch({
      "/api/accounts": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.accounts).toEqual([]);
  });

  it("returns empty accounts when response has no data array", async () => {
    mockFetch = createMockFetch({
      "/api/accounts": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.accounts).toEqual([]);
  });
});
