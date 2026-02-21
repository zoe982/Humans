import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/admin/front-sync/+page.server";

const adminUser = { id: "u-admin", email: "admin@example.com", role: "admin", name: "Admin User" };
const agentUser = { id: "u-agent", email: "agent@example.com", role: "agent", name: "Agent User" };

const syncRunFixture = {
  id: "run-1",
  displayId: "SR-001",
  status: "completed",
  startedAt: "2026-01-01T00:00:00Z",
  completedAt: "2026-01-01T00:05:00Z",
  totalMessages: 100,
  imported: 80,
  skipped: 15,
  unmatched: 5,
  errorCount: 0,
  linkedToHumans: 70,
  linkedToAccounts: 10,
  linkedToRouteSignups: 5,
  linkedToBookings: 3,
  linkedToColleagues: 2,
};

describe("admin/front-sync load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/admin/front/sync-runs": { body: { data: [syncRunFixture] } },
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

  it("redirects to /dashboard when user is not admin", async () => {
    const event = mockEvent({ user: agentUser });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/dashboard");
    }
  });

  it("returns syncRuns on success for admin user", async () => {
    const event = mockEvent({ user: adminUser });
    const result = await load(event as any);
    expect(result.syncRuns).toHaveLength(1);
    expect(result.syncRuns[0].id).toBe("run-1");
    expect(result.syncRuns[0].displayId).toBe("SR-001");
    expect(result.syncRuns[0].imported).toBe(80);
  });

  it("returns empty syncRuns when API fails", async () => {
    mockFetch = createMockFetch({
      "/api/admin/front/sync-runs": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: adminUser });
    const result = await load(event as any);
    expect(result.syncRuns).toEqual([]);
  });

  it("returns empty syncRuns when API returns non-list response", async () => {
    mockFetch = createMockFetch({
      "/api/admin/front/sync-runs": { body: { message: "unexpected" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: adminUser });
    const result = await load(event as any);
    expect(result.syncRuns).toEqual([]);
  });

  it("passes session token in cookie header", async () => {
    const event = mockEvent({ user: adminUser, sessionToken: "sess-admin-tok" });
    await load(event as any);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/front/sync-runs"),
      expect.objectContaining({
        headers: { Cookie: "humans_session=sess-admin-tok" },
      }),
    );
  });
});

describe("admin/front-sync actions.sync", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/admin/front/sync": {
        body: {
          data: {
            total: 20,
            imported: 15,
            skipped: 3,
            unmatched: 2,
            errors: [],
            nextCursor: null,
            syncRunId: "run-2",
          },
        },
      },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when user is null", async () => {
    const event = mockEvent({ user: null, formData: {} });
    try {
      await actions.sync(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("redirects to /dashboard when user is not admin", async () => {
    const event = mockEvent({ user: agentUser, formData: {} });
    try {
      await actions.sync(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/dashboard");
    }
  });

  it("returns sync result on success", async () => {
    const event = mockEvent({ user: adminUser, formData: {} });
    const result = await actions.sync(event as any);
    expect(result).toEqual({
      result: {
        total: 20,
        imported: 15,
        skipped: 3,
        unmatched: 2,
        errors: [],
        nextCursor: null,
        syncRunId: "run-2",
      },
    });
  });

  it("includes cursor in request when provided", async () => {
    const event = mockEvent({ user: adminUser, formData: { cursor: "cursor-abc" } });
    await actions.sync(event as any);
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    expect(String(postCall![0])).toContain("cursor=cursor-abc");
  });

  it("always includes limit=20 in request", async () => {
    const event = mockEvent({ user: adminUser, formData: {} });
    await actions.sync(event as any);
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    expect(String(postCall![0])).toContain("limit=20");
  });

  it("returns error when API call fails with structured error body", async () => {
    mockFetch = createMockFetch({
      "/api/admin/front/sync": { status: 500, body: { error: "Sync service unavailable" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: adminUser, formData: {} });
    const result = await actions.sync(event as any);
    expect(result).toEqual({ error: "Sync service unavailable" });
  });

  it("returns generic error message when API fails with no body", async () => {
    mockFetch = vi.fn(async () => new Response("", { status: 503 }));
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: adminUser, formData: {} });
    const result = await actions.sync(event as any);
    expect((result as { error: string }).error).toContain("503");
  });
});

describe("admin/front-sync actions.revert", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/admin/front/sync-runs": {
        body: { data: { deleted: 10, skipped: 2 } },
      },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when user is null", async () => {
    const event = mockEvent({ user: null, formData: { syncRunId: "run-1" } });
    try {
      await actions.revert(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/login");
    }
  });

  it("redirects to /dashboard when user is not admin", async () => {
    const event = mockEvent({ user: agentUser, formData: { syncRunId: "run-1" } });
    try {
      await actions.revert(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/dashboard");
    }
  });

  it("returns revertResult on success", async () => {
    const event = mockEvent({ user: adminUser, formData: { syncRunId: "run-1" } });
    const result = await actions.revert(event as any);
    expect(result).toEqual({ revertResult: { deleted: 10, skipped: 2 } });
  });

  it("calls the correct revert endpoint with syncRunId", async () => {
    const event = mockEvent({ user: adminUser, formData: { syncRunId: "run-42" } });
    await actions.revert(event as any);
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    expect(String(postCall![0])).toContain("sync-runs/run-42/revert");
  });

  it("returns revertError when API call fails with structured error body", async () => {
    mockFetch = createMockFetch({
      "/api/admin/front/sync-runs": { status: 500, body: { error: "Cannot revert completed run" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: adminUser, formData: { syncRunId: "run-1" } });
    const result = await actions.revert(event as any);
    expect(result).toEqual({ revertError: "Cannot revert completed run" });
  });

  it("returns generic revertError message when API fails with no body", async () => {
    mockFetch = vi.fn(async () => new Response("", { status: 404 }));
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: adminUser, formData: { syncRunId: "run-1" } });
    const result = await actions.revert(event as any);
    expect((result as { revertError: string }).revertError).toContain("404");
  });
});
