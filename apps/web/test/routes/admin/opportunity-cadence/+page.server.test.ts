import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/admin/opportunity-cadence/+page.server";

describe("admin/opportunity-cadence load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/opportunity-cadence": {
        body: {
          data: [
            { id: "cad-1", cadenceHours: 24, displayText: "1 day" },
            { id: "cad-2", cadenceHours: 72, displayText: "3 days" },
          ],
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

  it("redirects to /dashboard when user is not admin", async () => {
    const event = mockEvent({ user: { id: "u-1", email: "agent@test.com", role: "agent", name: "Agent" } });
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
      expect((e as Redirect).location).toBe("/dashboard");
    }
  });

  it("returns cadence configs on success", async () => {
    const event = mockEvent({ user: { id: "u-1", email: "admin@test.com", role: "admin", name: "Admin" } });
    const result = await load(event as any);
    expect(result.cadenceConfigs).toEqual([
      { id: "cad-1", cadenceHours: 24, displayText: "1 day" },
      { id: "cad-2", cadenceHours: 72, displayText: "3 days" },
    ]);
  });

  it("returns empty cadenceConfigs when API fails", async () => {
    mockFetch = createMockFetch({
      "/api/opportunity-cadence": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: { id: "u-1", email: "admin@test.com", role: "admin", name: "Admin" } });
    const result = await load(event as any);
    expect(result.cadenceConfigs).toEqual([]);
  });

  it("returns empty cadenceConfigs when response has no data array", async () => {
    mockFetch = createMockFetch({
      "/api/opportunity-cadence": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ user: { id: "u-1", email: "admin@test.com", role: "admin", name: "Admin" } });
    const result = await load(event as any);
    expect(result.cadenceConfigs).toEqual([]);
  });
});

describe("admin/opportunity-cadence actions.updateCadence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when cadence config is updated", async () => {
    const mockFetch = createMockFetch({
      "/api/admin/opportunity-cadence/cad-1": { status: 200, body: { data: { id: "cad-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { id: "cad-1", cadenceHours: "48", displayText: "2 days" },
    });
    const result = await actions.updateCadence(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/admin/opportunity-cadence/cad-1": { status: 400, body: { error: "Invalid cadence hours", code: "VALIDATION_ERROR" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { id: "cad-1", cadenceHours: "-1", displayText: "Bad value" },
    });
    const result = await actions.updateCadence(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
      expect(result.data.error).toBe("Invalid cadence hours");
      expect(result.data.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns failure on server error with fallback message", async () => {
    const mockFetch = createMockFetch({
      "/api/admin/opportunity-cadence/cad-2": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { id: "cad-2", cadenceHours: "24", displayText: "1 day" },
    });
    const result = await actions.updateCadence(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(500);
      expect(result.data.error).toBe("Failed to update cadence config");
    }
  });

  it("returns failure on 404 when cadence config not found", async () => {
    const mockFetch = createMockFetch({
      "/api/admin/opportunity-cadence/cad-99": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { id: "cad-99", cadenceHours: "24", displayText: "1 day" },
    });
    const result = await actions.updateCadence(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(404);
    }
  });
});
