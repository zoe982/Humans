import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load } from "../../../../../src/routes/reports/pipelines/leads/+page.server";

// ---------------------------------------------------------------------------
// Sample data — unified lead shapes as returned by GET /api/leads/all
// ---------------------------------------------------------------------------

const openGeneralLead = {
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
  nextAction: { type: "email", description: "Send intro", dueDate: "2026-04-01", ownerName: "Agent A" },
  isOverdue: false,
  lastActivityDate: "2026-03-01",
  createdAt: "2026-01-15T00:00:00.000Z",
};

const qualifiedRouteSignup = {
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

const qualifiedEvacuationLead = {
  id: "evacuation_lead:el-1",
  displayId: "EVA-AAA-001",
  leadType: "evacuation_lead",
  status: "qualified",
  firstName: "Eve",
  middleName: null,
  lastName: "Black",
  channel: "whatsapp",
  source: null,
  scoreTotal: 60,
  nextAction: null,
  isOverdue: false,
  lastActivityDate: "2026-03-05",
  createdAt: "2026-02-20T00:00:00.000Z",
};

const qualifiedBookingRequest = {
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

const closedLostLead = {
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

const closedConvertedLead = {
  id: "route_signup:rs-2",
  displayId: "ROI-AAA-002",
  leadType: "route_signup",
  status: "closed_converted",
  firstName: "Frank",
  middleName: null,
  lastName: "Green",
  channel: null,
  source: null,
  scoreTotal: null,
  nextAction: null,
  isOverdue: false,
  lastActivityDate: null,
  createdAt: "2026-01-02T00:00:00.000Z",
};

const pendingResponseLead = {
  id: "general_lead:gl-3",
  displayId: "LEA-AAA-003",
  leadType: "general_lead",
  status: "pending_response",
  firstName: "Grace",
  middleName: null,
  lastName: "Hill",
  channel: "email",
  source: null,
  scoreTotal: 30,
  nextAction: { type: "phone_call", description: "Follow up call", dueDate: "2026-03-08", ownerName: null },
  isOverdue: true,
  lastActivityDate: "2026-03-07",
  createdAt: "2026-02-01T00:00:00.000Z",
};

const allLeads = [
  openGeneralLead,
  qualifiedRouteSignup,
  qualifiedEvacuationLead,
  qualifiedBookingRequest,
  closedLostLead,
  closedConvertedLead,
  pendingResponseLead,
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reports/pipelines/leads load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/leads/all": { body: { data: allLeads } },
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

  it("returns only active leads (non-terminal statuses)", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    // open general lead, qualified route signup, qualified evacuation lead, pending_response lead
    // Excludes: closed_lost, closed_converted, qualified BOR
    expect(result.leads).toHaveLength(4);
    expect(result.leads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "general_lead:gl-1", status: "open" }),
        expect.objectContaining({ id: "route_signup:rs-1", status: "qualified" }),
        expect.objectContaining({ id: "evacuation_lead:el-1", status: "qualified" }),
        expect.objectContaining({ id: "general_lead:gl-3", status: "pending_response" }),
      ]),
    );
  });

  it("excludes closed_lost leads across all types", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    const statuses = result.leads.map((l: Record<string, unknown>) => l["status"]);
    expect(statuses).not.toContain("closed_lost");
  });

  it("excludes closed_converted leads across all types", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    const statuses = result.leads.map((l: Record<string, unknown>) => l["status"]);
    expect(statuses).not.toContain("closed_converted");
  });

  it("excludes BORs with qualified status (terminal for BORs)", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    const ids = result.leads.map((l: Record<string, unknown>) => l["id"]);
    expect(ids).not.toContain("website_booking_request:br-1");
  });

  it("includes qualified general leads, route signups, and evacuation leads", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    const ids = result.leads.map((l: Record<string, unknown>) => l["id"]);
    expect(ids).toContain("route_signup:rs-1");
    expect(ids).toContain("evacuation_lead:el-1");
  });

  it("returns empty array on API error (non-ok response)", async () => {
    vi.unstubAllGlobals();
    mockFetch = createMockFetch({
      "/api/leads/all": { status: 500, body: { error: "Internal server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.leads).toEqual([]);
  });

  it("returns empty array on malformed response", async () => {
    vi.unstubAllGlobals();
    mockFetch = createMockFetch({
      "/api/leads/all": { status: 200, body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.leads).toEqual([]);
  });

  it("passes session cookie to the API", async () => {
    const event = mockEvent({ sessionToken: "my-session-abc" });
    await load(event as any);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/leads/all"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "humans_session=my-session-abc",
        }),
      }),
    );
  });
});
