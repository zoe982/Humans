import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load } from "../../../../../src/routes/accounts/[id]/activities/+page.server";

const sampleAccount = {
  id: "acc-1",
  displayId: "ACC-AAA-001",
  name: "Acme Corp",
  status: "active",
};

const sampleActivities = [
  { id: "act-1", type: "call", subject: "Account review" },
  { id: "act-2", type: "email", subject: "Renewal reminder" },
];

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "acc-1" };
  return event;
}

describe("accounts/[id]/activities load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/accounts/acc-1": { body: { data: sampleAccount } },
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

  it("returns account and activities on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);

    expect(result.account).toEqual(sampleAccount);
    expect(result.activities).toEqual(sampleActivities);
  });

  it("activities query includes accountId and linkedEntities param", async () => {
    const event = makeEvent();
    await load(event as any);

    const activitiesCall = (mockFetch.mock.calls as [string][]).find(
      ([url]) => typeof url === "string" && url.includes("/api/activities"),
    );
    expect(activitiesCall).toBeDefined();
    expect(activitiesCall?.[0]).toContain("accountId=acc-1");
    expect(activitiesCall?.[0]).toContain("include=linkedEntities");
  });

  it("redirects to /accounts when account API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/accounts/acc-1": { status: 404, body: { error: "Not found" } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/accounts");
    }
  });

  it("redirects to /accounts when account response has no data", async () => {
    mockFetch = createMockFetch({
      "/api/accounts/acc-1": { body: { unexpected: true } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/accounts");
    }
  });

  it("returns empty activities array when activities API fails", async () => {
    mockFetch = createMockFetch({
      "/api/accounts/acc-1": { body: { data: sampleAccount } },
      "/api/activities": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.activities).toEqual([]);
  });

  it("returns empty activities array when activities response has no data list", async () => {
    mockFetch = createMockFetch({
      "/api/accounts/acc-1": { body: { data: sampleAccount } },
      "/api/activities": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.activities).toEqual([]);
  });
});
