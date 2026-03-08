import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../../helpers";
import { load } from "../../../../../../src/routes/leads/evacuation-leads/[id]/activities/+page.server";

const sampleLead = {
  id: "eva-1",
  displayId: "EVA-AAA-001",
  status: "open",
  createdAt: "2025-01-15T00:00:00.000Z",
};

const sampleActivities = [
  { id: "act-1", type: "call", subject: "Evacuation enquiry call" },
  { id: "act-2", type: "email", subject: "Confirmation sent" },
];

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "eva-1" };
  return event;
}

describe("leads/evacuation-leads/[id]/activities load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: sampleLead } },
      "/api/activities": { body: { data: sampleActivities } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when user is null", async () => {
    const event = makeEvent({ user: null });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("returns lead and activities on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);

    expect(result.lead).toEqual(sampleLead);
    expect(result.activities).toEqual(sampleActivities);
  });

  it("activities query includes evacuationLeadId and linkedEntities param", async () => {
    const event = makeEvent();
    await load(event as any);

    const activitiesCall = (mockFetch.mock.calls as [string][]).find(
      ([url]) => typeof url === "string" && url.includes("/api/activities"),
    );
    expect(activitiesCall).toBeDefined();
    expect(activitiesCall?.[0]).toContain("evacuationLeadId=eva-1");
    expect(activitiesCall?.[0]).toContain("include=linkedEntities");
  });

  it("redirects to /leads/evacuation-leads when lead API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/evacuation-leads/eva-1": { status: 404, body: { error: "Not found" } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/leads/evacuation-leads");
    }
  });

  it("redirects to /leads/evacuation-leads when lead response has no data", async () => {
    mockFetch = createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { unexpected: true } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/leads/evacuation-leads");
    }
  });

  it("returns empty activities array when activities API fails", async () => {
    mockFetch = createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: sampleLead } },
      "/api/activities": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.activities).toEqual([]);
  });

  it("returns empty activities array when activities response has no data list", async () => {
    mockFetch = createMockFetch({
      "/api/evacuation-leads/eva-1": { body: { data: sampleLead } },
      "/api/activities": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.activities).toEqual([]);
  });
});
