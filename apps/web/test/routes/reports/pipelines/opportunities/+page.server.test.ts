import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load } from "../../../../../src/routes/reports/pipelines/opportunities/+page.server";

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const activeOpportunity = {
  id: "opp-1",
  displayId: "OPP-AAA-001",
  stage: "open",
  primaryHumanName: "Alice Smith",
  primaryHuman: { id: "hum-1", name: "Alice Smith" },
  linkedHumanCount: 1,
  linkedPetCount: 2,
  nextActionDescription: "Send quote",
  nextActionType: "email",
  nextActionDueDate: "2026-04-01T00:00:00.000Z",
  isOverdue: false,
  lastActivityDate: "2026-03-01T00:00:00.000Z",
};

const qualifiedOpportunity = {
  id: "opp-3",
  displayId: "OPP-AAA-003",
  stage: "qualified",
  primaryHumanName: "Bob Jones",
  primaryHuman: { id: "hum-3", name: "Bob Jones" },
  linkedHumanCount: 2,
  linkedPetCount: 1,
  nextActionDescription: "Follow up",
  nextActionType: "phone_call",
  nextActionDueDate: "2026-03-10T00:00:00.000Z",
  isOverdue: true,
  lastActivityDate: "2026-02-28T00:00:00.000Z",
};

const closedFlownOpportunity = {
  id: "opp-2",
  displayId: "OPP-AAA-002",
  stage: "closed_flown",
  primaryHumanName: "Carol White",
  primaryHuman: { id: "hum-2", name: "Carol White" },
  linkedHumanCount: 1,
  linkedPetCount: 1,
  nextActionDescription: null,
  nextActionType: null,
  nextActionDueDate: null,
  isOverdue: false,
  lastActivityDate: "2026-01-15T00:00:00.000Z",
};

const closedLostOpportunity = {
  id: "opp-4",
  displayId: "OPP-AAA-004",
  stage: "closed_lost",
  primaryHumanName: "Dave Brown",
  primaryHuman: { id: "hum-4", name: "Dave Brown" },
  linkedHumanCount: 1,
  linkedPetCount: 0,
  nextActionDescription: null,
  nextActionType: null,
  nextActionDueDate: null,
  isOverdue: false,
  lastActivityDate: "2026-01-10T00:00:00.000Z",
};

const allOpportunities = [
  activeOpportunity,
  closedFlownOpportunity,
  qualifiedOpportunity,
  closedLostOpportunity,
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reports/pipelines/opportunities load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/opportunities": {
        body: { data: allOpportunities, meta: { page: 1, limit: 10000, total: 4 } },
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

  it("returns only active (non-terminal) opportunities", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.opportunities).toHaveLength(2);
    expect(result.opportunities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "opp-1", stage: "open" }),
        expect.objectContaining({ id: "opp-3", stage: "qualified" }),
      ]),
    );
  });

  it("excludes closed_flown opportunities from results", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    const stages = result.opportunities.map((o) => (o as { stage: string }).stage);
    expect(stages).not.toContain("closed_flown");
  });

  it("excludes closed_lost opportunities from results", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    const stages = result.opportunities.map((o) => (o as { stage: string }).stage);
    expect(stages).not.toContain("closed_lost");
  });

  it("returns the authenticated user in the result", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.user).toMatchObject({ id: "user-1", email: "test@example.com" });
  });

  it("returns empty array on API error", async () => {
    vi.unstubAllGlobals();
    mockFetch = createMockFetch({
      "/api/opportunities": { status: 500, body: { error: "Internal server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.opportunities).toEqual([]);
  });

  it("returns empty array when API response is malformed", async () => {
    vi.unstubAllGlobals();
    mockFetch = createMockFetch({
      "/api/opportunities": { status: 200, body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.opportunities).toEqual([]);
  });

  it("passes the session cookie to the API", async () => {
    const event = mockEvent({ sessionToken: "my-session-abc" });
    await load(event as any);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/opportunities"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "humans_session=my-session-abc",
        }),
      }),
    );
  });

  it("requests a high limit to fetch all opportunities", async () => {
    const event = mockEvent();
    await load(event as any);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("limit=10000"),
      expect.any(Object),
    );
  });

  it("returns empty array when all opportunities are terminal stages", async () => {
    vi.unstubAllGlobals();
    mockFetch = createMockFetch({
      "/api/opportunities": {
        body: {
          data: [closedFlownOpportunity, closedLostOpportunity],
          meta: { page: 1, limit: 10000, total: 2 },
        },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.opportunities).toEqual([]);
  });

  it("returns all opportunities when none are terminal stages", async () => {
    vi.unstubAllGlobals();
    mockFetch = createMockFetch({
      "/api/opportunities": {
        body: {
          data: [activeOpportunity, qualifiedOpportunity],
          meta: { page: 1, limit: 10000, total: 2 },
        },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.opportunities).toHaveLength(2);
  });
});
