import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load } from "../../../../src/routes/reports/lead-scores/+page.server";

const sampleScore = {
  id: "sco-1",
  displayId: "SCO-AAA-001",
  scoreTotal: 85,
  scoreFit: 30,
  scoreIntent: 50,
  scoreEngagement: 15,
  scoreNegative: 10,
  band: "hot",
  parentType: "general_lead",
  parentId: "gl-1",
  createdAt: "2026-01-15T10:00:00.000Z",
};

describe("lead-scores list load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/lead-scores": {
        body: { data: [sampleScore], meta: { page: 1, limit: 25, total: 1 } },
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

  it("returns lead scores list on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.scores).toEqual([sampleScore]);
    expect(result.meta).toEqual({ page: 1, limit: 25, total: 1 });
  });

  it("returns empty array when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/lead-scores": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.scores).toEqual([]);
  });

  it("passes query params through to API", async () => {
    const event = mockEvent({ url: "http://localhost/reports/lead-scores?band=hot&parentType=general_lead&page=2" });
    await load(event as any);

    const callUrl = String(mockFetch.mock.calls[0][0]);
    expect(callUrl).toContain("band=hot");
    expect(callUrl).toContain("parentType=general_lead");
    expect(callUrl).toContain("page=2");
  });
});
