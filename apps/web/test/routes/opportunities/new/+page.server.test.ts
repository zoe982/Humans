import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
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
    expect((result as any).status).toBe(403);
    expect((result as any).data.error).toBe("Forbidden");
    expect((result as any).data.code).toBe("AUTH_INSUFFICIENT_PERMS");
  });

  it("returns failure when API returns unexpected response shape", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { status: 201, body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { passengerSeats: "1" } });
    const result = await actions.create(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(500);
    expect((result as any).data.error).toBe("Unexpected response");
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
});
