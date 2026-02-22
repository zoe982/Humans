import { describe, it, expect, vi, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/opportunities/new/+page.server";

describe("opportunities/new +page.server load", () => {
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

  it("returns empty object for authenticated user", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result).toEqual({});
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

    const event = mockEvent({ formData: { seatsRequested: "2" } });
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

    const event = mockEvent({ formData: { seatsRequested: "1" } });
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

    const event = mockEvent({ formData: { seatsRequested: "1" } });
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

    const event = mockEvent({ formData: { seatsRequested: "1" } });
    const result = await actions.create(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(500);
    expect((result as any).data.error).toBe("Unexpected response");
  });

  it("defaults seatsRequested to 1 when form value is absent", async () => {
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
    expect(body.seatsRequested).toBe(1);
  });
});
