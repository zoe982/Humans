import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load } from "../../../../../src/routes/reports/marketing/leads-attributions/+page.server";

// ---------------------------------------------------------------------------
// Sample leads (same shape as GET /api/leads/all)
// ---------------------------------------------------------------------------

const generalLead = {
  id: "general_lead:gl-1",
  displayId: "LEA-AAA-001",
  leadType: "general_lead",
  status: "open",
  firstName: "Alice",
  middleName: null,
  lastName: "Smith",
  channel: "email",
  source: "direct_referral",
  scoreTotal: 42,
  nextAction: null,
  isOverdue: false,
  lastActivityDate: null,
  createdAt: "2026-01-15T00:00:00.000Z",
};

const routeSignup = {
  id: "route_signup:rs-1",
  displayId: "ROI-AAA-001",
  leadType: "route_signup",
  status: "qualified",
  firstName: "Bob",
  middleName: null,
  lastName: "Jones",
  channel: null,
  source: null,
  scoreTotal: 80,
  nextAction: null,
  isOverdue: false,
  lastActivityDate: null,
  createdAt: "2026-02-10T00:00:00.000Z",
};

const bookingRequest = {
  id: "website_booking_request:br-1",
  displayId: "BOR-AAA-001",
  leadType: "website_booking_request",
  status: "qualified",
  firstName: "Carol",
  middleName: null,
  lastName: "White",
  channel: null,
  source: null,
  scoreTotal: 90,
  nextAction: null,
  isOverdue: false,
  lastActivityDate: null,
  createdAt: "2026-01-20T00:00:00.000Z",
};

const evacuationLead = {
  id: "evacuation_lead:el-1",
  displayId: "EVA-AAA-001",
  leadType: "evacuation_lead",
  status: "open",
  firstName: "Eve",
  middleName: null,
  lastName: "Black",
  channel: "whatsapp",
  source: null,
  scoreTotal: 60,
  nextAction: null,
  isOverdue: false,
  lastActivityDate: null,
  createdAt: "2026-02-20T00:00:00.000Z",
};

const closedLead = {
  id: "general_lead:gl-2",
  displayId: "LEA-AAA-002",
  leadType: "general_lead",
  status: "closed_lost",
  firstName: "Dave",
  middleName: null,
  lastName: "Brown",
  channel: null,
  source: null,
  scoreTotal: null,
  nextAction: null,
  isOverdue: false,
  lastActivityDate: null,
  createdAt: "2026-01-05T00:00:00.000Z",
};

const allLeads = [generalLead, routeSignup, bookingRequest, evacuationLead, closedLead];

// ---------------------------------------------------------------------------
// Sample marketing attributions (same shape as GET /api/marketing-attributions)
// ---------------------------------------------------------------------------

const attributionForRouteSignup = {
  id: "ma-1",
  crmDisplayId: "MAT-AAA-001",
  createdAt: "2026-02-10T00:00:00.000Z",
  ftGclid: "ft-gclid-abc",
  ltGclid: "lt-gclid-xyz",
  ftFbclid: null,
  ltFbclid: "lt-fbclid-def",
  ftUtmSource: "google",
  ltUtmSource: "google",
  linkedLead: {
    leadType: "route_signup",
    leadId: "rs-1",
    leadDisplayId: "ROI-AAA-001",
    leadName: "Bob Jones",
  },
};

const attributionForBooking = {
  id: "ma-2",
  crmDisplayId: "MAT-AAA-002",
  createdAt: "2026-01-20T00:00:00.000Z",
  ftGclid: "ft-gclid-only",
  ltGclid: null,
  ftFbclid: "ft-fbclid-only",
  ltFbclid: null,
  ftUtmSource: "facebook",
  ltUtmSource: null,
  linkedLead: {
    leadType: "website_booking_request",
    leadId: "br-1",
    leadDisplayId: "BOR-AAA-001",
    leadName: "Carol White",
  },
};

const allAttributions = [attributionForRouteSignup, attributionForBooking];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reports/marketing/leads-attributions load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/leads/all": { body: { data: allLeads } },
      "/api/marketing-attributions": { body: { data: allAttributions } },
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

  it("fetches both /api/leads/all and /api/marketing-attributions with session cookie", async () => {
    const event = mockEvent({ sessionToken: "my-session" });
    await load(event as any);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/leads/all"),
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: "humans_session=my-session" }),
      }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/marketing-attributions"),
      expect.objectContaining({
        headers: expect.objectContaining({ Cookie: "humans_session=my-session" }),
      }),
    );
  });

  it("returns all leads including closed/terminal statuses", async () => {
    const event = mockEvent();
    const result = await load(event as any);

    expect(result.rows).toHaveLength(5);
    const statuses = result.rows.map((r: Record<string, unknown>) => r["status"]);
    expect(statuses).toContain("closed_lost");
    expect(statuses).toContain("qualified");
    expect(statuses).toContain("open");
  });

  it("joins GCLID using LT-fallback-FT for route_signup with both touches", async () => {
    const event = mockEvent();
    const result = await load(event as any);

    const rsRow = result.rows.find((r: Record<string, unknown>) => r["id"] === "route_signup:rs-1");
    // LT is available, so uses LT
    expect(rsRow).toMatchObject({
      gclid: "lt-gclid-xyz",
      gclidTouch: "LT",
    });
  });

  it("joins GCLID using FT when LT is null", async () => {
    const event = mockEvent();
    const result = await load(event as any);

    const borRow = result.rows.find((r: Record<string, unknown>) => r["id"] === "website_booking_request:br-1");
    // LT is null, falls back to FT
    expect(borRow).toMatchObject({
      gclid: "ft-gclid-only",
      gclidTouch: "FT",
    });
  });

  it("joins FBCLID using LT-fallback-FT", async () => {
    const event = mockEvent();
    const result = await load(event as any);

    const rsRow = result.rows.find((r: Record<string, unknown>) => r["id"] === "route_signup:rs-1");
    // LT fbclid available
    expect(rsRow).toMatchObject({
      fbclid: "lt-fbclid-def",
      fbclidTouch: "LT",
    });

    const borRow = result.rows.find((r: Record<string, unknown>) => r["id"] === "website_booking_request:br-1");
    // Only FT fbclid
    expect(borRow).toMatchObject({
      fbclid: "ft-fbclid-only",
      fbclidTouch: "FT",
    });
  });

  it("includes attributionId for linked leads", async () => {
    const event = mockEvent();
    const result = await load(event as any);

    const rsRow = result.rows.find((r: Record<string, unknown>) => r["id"] === "route_signup:rs-1");
    expect(rsRow).toMatchObject({ attributionId: "ma-1" });

    const borRow = result.rows.find((r: Record<string, unknown>) => r["id"] === "website_booking_request:br-1");
    expect(borRow).toMatchObject({ attributionId: "ma-2" });
  });

  it("general leads and evacuation leads have null attribution fields", async () => {
    const event = mockEvent();
    const result = await load(event as any);

    const glRow = result.rows.find((r: Record<string, unknown>) => r["id"] === "general_lead:gl-1");
    expect(glRow).toMatchObject({
      gclid: null,
      gclidTouch: null,
      fbclid: null,
      fbclidTouch: null,
      attributionId: null,
    });

    const elRow = result.rows.find((r: Record<string, unknown>) => r["id"] === "evacuation_lead:el-1");
    expect(elRow).toMatchObject({
      gclid: null,
      gclidTouch: null,
      fbclid: null,
      fbclidTouch: null,
      attributionId: null,
    });
  });

  it("returns empty rows on leads API failure", async () => {
    vi.unstubAllGlobals();
    mockFetch = createMockFetch({
      "/api/leads/all": { status: 500, body: { error: "Internal server error" } },
      "/api/marketing-attributions": { body: { data: allAttributions } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.rows).toEqual([]);
  });

  it("returns empty rows on malformed leads response (no data array)", async () => {
    vi.unstubAllGlobals();
    mockFetch = createMockFetch({
      "/api/leads/all": { body: { unexpected: true } },
      "/api/marketing-attributions": { body: { data: allAttributions } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.rows).toEqual([]);
  });

  it("skips malformed attributions (null, missing linkedLead, missing leadId)", async () => {
    vi.unstubAllGlobals();
    const malformedAttributions = [
      null,
      { id: "ma-bad-1", linkedLead: null, ftGclid: "x", ltGclid: null, ftFbclid: null, ltFbclid: null },
      { id: "ma-bad-2", linkedLead: { leadType: "route_signup" }, ftGclid: "x", ltGclid: null, ftFbclid: null, ltFbclid: null },
      attributionForRouteSignup,
    ];
    mockFetch = createMockFetch({
      "/api/leads/all": { body: { data: allLeads } },
      "/api/marketing-attributions": { body: { data: malformedAttributions } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    // Only the valid attribution should match
    const rsRow = result.rows.find((r: Record<string, unknown>) => r["id"] === "route_signup:rs-1");
    expect(rsRow).toMatchObject({ attributionId: "ma-1" });

    // General lead should still have null
    const glRow = result.rows.find((r: Record<string, unknown>) => r["id"] === "general_lead:gl-1");
    expect(glRow).toMatchObject({ attributionId: null });
  });

  it("handles attributions with malformed data array gracefully", async () => {
    vi.unstubAllGlobals();
    mockFetch = createMockFetch({
      "/api/leads/all": { body: { data: allLeads } },
      "/api/marketing-attributions": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    // Leads returned but no attributions matched
    expect(result.rows).toHaveLength(5);
    for (const row of result.rows) {
      const r = row as Record<string, unknown>;
      expect(r["attributionId"]).toBeNull();
    }
  });

  it("returns leads with null attribution fields when attributions API fails", async () => {
    vi.unstubAllGlobals();
    mockFetch = createMockFetch({
      "/api/leads/all": { body: { data: allLeads } },
      "/api/marketing-attributions": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.rows).toHaveLength(5);
    // All attribution fields should be null since attributions failed
    for (const row of result.rows) {
      const r = row as Record<string, unknown>;
      expect(r["gclid"]).toBeNull();
      expect(r["attributionId"]).toBeNull();
    }
  });
});
