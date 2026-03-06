import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load } from "../../../../src/routes/reports/next-actions/+page.server";

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleNextAction = {
  entityType: "general_lead",
  entityId: "gl-1",
  entityDisplayId: "LEA-AAA-001",
  entityLabel: "Alice Smith",
  entityStatus: "open",
  description: "Follow up call",
  type: "phone_call",
  dueDate: "2026-04-01T00:00:00.000Z",
  isOverdue: false,
  ownerName: "Jane Doe",
  ownerId: "col-1",
};

const overdueNextAction = {
  entityType: "opportunity",
  entityId: "opp-1",
  entityDisplayId: "OPP-AAA-001",
  entityLabel: "Bob Jones",
  entityStatus: "qualified",
  description: "Send quote",
  type: "email",
  dueDate: "2020-01-01T00:00:00.000Z",
  isOverdue: true,
  ownerName: "Jane Doe",
  ownerId: "col-1",
};

const sampleColleague = {
  id: "col-1",
  name: "Jane Doe",
  firstName: "Jane",
  lastName: "Doe",
  role: "agent",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("next-actions +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/reports/next-actions": {
        body: { data: [sampleNextAction, overdueNextAction] },
      },
      "/api/colleagues": {
        body: { data: [sampleColleague] },
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

  it("returns next actions and colleagues on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.nextActions).toHaveLength(2);
    expect(result.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ entityType: "general_lead", entityId: "gl-1" }),
        expect.objectContaining({ entityType: "opportunity", entityId: "opp-1" }),
      ]),
    );
    expect(result.colleagues).toHaveLength(1);
    expect(result.colleagues).toEqual([expect.objectContaining({ id: "col-1", name: "Jane Doe" })]);
  });

  it("returns the authenticated user in the result", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.user).toMatchObject({ id: "user-1", email: "test@example.com" });
  });

  it("returns empty arrays when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/reports/next-actions": { status: 500, body: {} },
      "/api/colleagues": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.nextActions).toEqual([]);
    expect(result.colleagues).toEqual([]);
  });

  it("returns empty arrays when API response is malformed", async () => {
    mockFetch = createMockFetch({
      "/api/reports/next-actions": { status: 200, body: { unexpected: true } },
      "/api/colleagues": { status: 200, body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.nextActions).toEqual([]);
    expect(result.colleagues).toEqual([]);
  });

  it("passes the session cookie to the API", async () => {
    const event = mockEvent({ sessionToken: "my-session-abc" });
    await load(event as any);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/reports/next-actions"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: "humans_session=my-session-abc",
        }),
      }),
    );
  });

  it("passes colleagueId query param to API when set in URL", async () => {
    const event = mockEvent({ url: "http://localhost/reports/next-actions?colleagueId=col-1" });
    await load(event as any);
    const callUrl = String(mockFetch.mock.calls[0][0]);
    expect(callUrl).toContain("colleagueId=col-1");
  });

  it("returns selectedColleagueId from URL params", async () => {
    const event = mockEvent({ url: "http://localhost/reports/next-actions?colleagueId=col-1" });
    const result = await load(event as any);
    expect(result.selectedColleagueId).toBe("col-1");
  });

  it("returns null selectedColleagueId when not in URL", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.selectedColleagueId).toBeNull();
  });

  it("does not include colleagueId param when not set", async () => {
    const event = mockEvent();
    await load(event as any);
    const callUrl = String(mockFetch.mock.calls[0][0]);
    expect(callUrl).not.toContain("colleagueId");
  });
});
