import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load } from "../../../src/routes/marketing-attributions/+page.server";

const sampleAttribution = {
  id: "mat-1",
  crmDisplayId: "MAT-AAA-001",
  createdAt: "2026-01-15T10:00:00.000Z",
  ftUtmSource: "google",
  ltUtmSource: "facebook",
  linkedLead: { leadType: "route_signup", leadId: "rs-1", leadDisplayId: "SIG-001", leadName: "Jane Doe" },
};

describe("marketing-attributions list load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/marketing-attributions": {
        body: { data: [sampleAttribution] },
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

  it("returns marketing attributions list on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.attributions).toEqual([sampleAttribution]);
  });

  it("returns empty array when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/marketing-attributions": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.attributions).toEqual([]);
  });

  it("returns empty array when response has no data array", async () => {
    mockFetch = createMockFetch({
      "/api/marketing-attributions": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.attributions).toEqual([]);
  });
});
