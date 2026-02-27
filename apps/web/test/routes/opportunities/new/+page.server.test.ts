import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect, type ActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/opportunities/new/+page.server";

describe("opportunities/new +page.server load", () => {
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

  it("returns allHumans, allPets, and apiUrl for authenticated user", async () => {
    const mockFetch = createMockFetch({
      "/api/humans": { status: 200, body: { data: [{ id: "h-1", name: "Alice" }] } },
      "/api/pets": { status: 200, body: { data: [{ id: "p-1", name: "Fluffy" }] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.allHumans).toEqual([{ id: "h-1", name: "Alice" }]);
    expect(result.allPets).toEqual([{ id: "p-1", name: "Fluffy" }]);
    expect(result.apiUrl).toBe("http://localhost:8787");
    expect(result.preselectedHumanId).toBe("");
    expect(result.preselectedPetId).toBe("");
  });

  it("reads preselected humanId and petId from query params", async () => {
    const mockFetch = createMockFetch({
      "/api/humans": { status: 200, body: { data: [] } },
      "/api/pets": { status: 200, body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ url: "http://localhost/opportunities/new?humanId=h-42&petId=p-99" });
    const result = await load(event as any);

    expect(result.preselectedHumanId).toBe("h-42");
    expect(result.preselectedPetId).toBe("p-99");
  });

  it("returns empty arrays when API calls fail", async () => {
    const mockFetch = createMockFetch({
      "/api/humans": { status: 500, body: { error: "Internal Server Error" } },
      "/api/pets": { status: 500, body: { error: "Internal Server Error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);

    expect(result.allHumans).toEqual([]);
    expect(result.allPets).toEqual([]);
    expect(result.apiUrl).toBe("http://localhost:8787");
  });
});

describe("opportunities/new actions.create", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates opportunity and redirects to detail page", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { status: 201, body: { data: { id: "opp-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { passengerSeats: "2" } });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/opportunities/opp-new");
    }
  });

  it("redirects with status 302 on success", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { status: 201, body: { data: { id: "opp-abc" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { passengerSeats: "1" } });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).status).toBe(302);
    }
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { status: 403, body: { error: "Forbidden", code: "AUTH_INSUFFICIENT_PERMS" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { passengerSeats: "1" } });
    const result = await actions.create(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string; code?: string; requestId?: string }>;
    expect(failure.status).toBe(403);
    expect(failure.data.error).toBe("Forbidden");
    expect(failure.data.code).toBe("AUTH_INSUFFICIENT_PERMS");
  });

  it("returns failure when API returns unexpected response shape", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { status: 201, body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { passengerSeats: "1" } });
    const result = await actions.create(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string; code?: string; requestId?: string }>;
    expect(failure.status).toBe(500);
    expect(failure.data.error).toBe("Unexpected response");
  });

  it("defaults passengerSeats to 1 and petSeats to 0 when form values are absent", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { status: 201, body: { data: { id: "opp-default" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: {} });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(((postCall as unknown[])[1] as RequestInit).body as string);
    expect(body.passengerSeats).toBe(1);
    expect(body.petSeats).toBe(0);
  });

  it("links primary human when humanId is provided", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp-h/humans": { status: 200, body: { data: {} } },
      "/api/opportunities": { status: 201, body: { data: { id: "opp-h" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { passengerSeats: "1", humanId: "h-1" } });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/opportunities/opp-h");
    }
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("/api/opportunities/opp-h/humans"))).toBe(true);
  });

  it("links pets when petIds are provided", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp-p/pets": { status: 200, body: { data: {} } },
      "/api/opportunities/opp-p/humans": { status: 200, body: { data: {} } },
      "/api/opportunities": { status: 201, body: { data: { id: "opp-p" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { passengerSeats: "2", petIds: ["pet-1", "pet-2"] } });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("/api/opportunities/opp-p/pets"))).toBe(true);
  });
});
