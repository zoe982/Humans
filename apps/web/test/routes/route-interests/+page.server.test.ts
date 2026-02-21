import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, Redirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../helpers";
import { load, actions } from "../../../src/routes/route-interests/+page.server";

describe("route-interests +page.server load", () => {
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

  it("returns routeInterests and expressions from API", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interests": { body: { data: [{ id: "ri1", originCity: "London" }] } },
      "/api/route-interest-expressions": { body: { data: [{ id: "rie1" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.routeInterests).toHaveLength(1);
    expect(result.expressions).toHaveLength(1);
  });

  it("returns empty arrays when both APIs fail", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interests": { status: 500, body: { error: "fail" } },
      "/api/route-interest-expressions": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.routeInterests).toEqual([]);
    expect(result.expressions).toEqual([]);
  });

  it("returns empty routeInterests when only route-interests fails", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interests": { status: 500, body: { error: "fail" } },
      "/api/route-interest-expressions": { body: { data: [{ id: "rie1" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.routeInterests).toEqual([]);
    expect(result.expressions).toHaveLength(1);
  });

  it("returns userRole from locals", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interests": { body: { data: [] } },
      "/api/route-interest-expressions": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ user: { id: "u1", email: "a@b.com", role: "admin", name: "Admin" } });
    const result = await load(event as any);
    expect(result.userRole).toBe("admin");
  });
});

describe("route-interests +page.server actions.create", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid create", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interests": { body: { data: { id: "ri-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({
      formData: {
        originCity: "London",
        originCountry: "UK",
        destinationCity: "Paris",
        destinationCountry: "France",
      },
    });
    const result = await actions.create(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns fail when origin city is missing", async () => {
    const event = mockEvent({
      formData: {
        originCity: "",
        originCountry: "UK",
        destinationCity: "Paris",
        destinationCountry: "France",
      },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toContain("required");
    }
  });

  it("returns fail when destination city is missing", async () => {
    const event = mockEvent({
      formData: {
        originCity: "London",
        originCountry: "UK",
        destinationCity: "",
        destinationCountry: "France",
      },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("returns fail when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interests": { status: 409, body: { error: "Already exists" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({
      formData: {
        originCity: "London",
        originCountry: "UK",
        destinationCity: "Paris",
        destinationCountry: "France",
      },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Already exists");
    }
  });
});

describe("route-interests +page.server actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interests/ri1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ formData: { id: "ri1" } });
    const result = await actions.delete(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/route-interests/ri1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interests/ri1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = mockEvent({ formData: { id: "ri1" } });
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});
