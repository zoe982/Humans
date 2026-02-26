import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load } from "../../../src/routes/agreements/+page.server";

describe("agreements +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/agreements": {
        status: 200,
        body: {
          data: [
            { id: "agr-1", title: "Service Agreement", status: "active" },
            { id: "agr-2", title: "NDA", status: "draft" },
          ],
          meta: { page: 1, limit: 50, total: 2 },
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
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("returns agreements and meta on success", async () => {
    const event = mockEvent({ url: "http://localhost/agreements" });
    const result = await load(event as any);

    expect(result.agreements).toHaveLength(2);
    expect(result.agreements[0]).toMatchObject({ id: "agr-1", title: "Service Agreement" });
    expect(result.agreements[1]).toMatchObject({ id: "agr-2", title: "NDA" });
    expect(result.meta).toEqual({ page: 1, limit: 50, total: 2 });
  });

  it("returns empty agreements and default meta when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/agreements": { status: 500, body: { error: "Internal server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ url: "http://localhost/agreements" });
    const result = await load(event as any);

    expect(result.agreements).toEqual([]);
    expect(result.meta).toEqual({ page: 1, limit: 50, total: 0 });
  });

  it("returns empty agreements and default meta when response is not paginated data", async () => {
    mockFetch = createMockFetch({
      "/api/agreements": { status: 200, body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ url: "http://localhost/agreements" });
    const result = await load(event as any);

    expect(result.agreements).toEqual([]);
    expect(result.meta).toEqual({ page: 1, limit: 50, total: 0 });
  });

  it("forwards page and limit query params to the API", async () => {
    const event = mockEvent({ url: "http://localhost/agreements?page=3&limit=25" });
    await load(event as any);

    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("page=3");
    expect(calledUrl).toContain("limit=25");
  });

  it("uses default page=1 and limit=50 when query params are absent", async () => {
    const event = mockEvent({ url: "http://localhost/agreements" });
    await load(event as any);

    const calledUrl = String(mockFetch.mock.calls[0][0]);
    expect(calledUrl).toContain("page=1");
    expect(calledUrl).toContain("limit=50");
  });

  it("sends session cookie in the API request", async () => {
    const event = mockEvent({ sessionToken: "my-session-abc", url: "http://localhost/agreements" });
    await load(event as any);

    const calledOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect((calledOptions.headers as Record<string, string>)["Cookie"]).toBe(
      "humans_session=my-session-abc",
    );
  });
});
