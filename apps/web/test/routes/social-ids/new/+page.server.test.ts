import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/social-ids/new/+page.server";

describe("social-ids/new load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane" }] } },
      "/api/admin/account-config/social-id-platforms": {
        body: { data: [{ id: "plat-1", name: "Instagram" }] },
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

  it("returns allHumans and platformConfigs on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([{ id: "h-1", firstName: "Jane" }]);
    expect(result.platformConfigs).toEqual([{ id: "plat-1", name: "Instagram" }]);
  });

  it("returns empty allHumans when humans API fails", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { status: 500, body: {} },
      "/api/admin/account-config/social-id-platforms": {
        body: { data: [{ id: "plat-1", name: "Instagram" }] },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
    expect(result.platformConfigs).toEqual([{ id: "plat-1", name: "Instagram" }]);
  });

  it("returns empty platformConfigs when platforms API fails", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane" }] } },
      "/api/admin/account-config/social-id-platforms": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([{ id: "h-1", firstName: "Jane" }]);
    expect(result.platformConfigs).toEqual([]);
  });

  it("returns empty arrays when both APIs fail", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { status: 500, body: {} },
      "/api/admin/account-config/social-id-platforms": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
    expect(result.platformConfigs).toEqual([]);
  });

  it("returns empty arrays when APIs return non-list responses", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { message: "unexpected" } },
      "/api/admin/account-config/social-id-platforms": { body: { message: "unexpected" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
    expect(result.platformConfigs).toEqual([]);
  });

  it("passes session token in cookie headers", async () => {
    const event = mockEvent({ sessionToken: "sess-xyz" });
    await load(event as any);
    for (const call of mockFetch.mock.calls) {
      expect((call[1] as RequestInit).headers).toEqual(
        expect.objectContaining({ Cookie: "humans_session=sess-xyz" }),
      );
    }
  });
});

describe("social-ids/new create action", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/social-ids": { body: { data: { id: "sid-new-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to new social-id on successful create", async () => {
    const event = mockEvent({
      formData: { handle: "@janetravel", platformId: "plat-1", humanId: "h-1" },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/social-ids/sid-new-1");
    }
  });

  it("returns failure when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/social-ids": { status: 422, body: { error: "Handle required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { handle: "", platformId: "plat-1", humanId: "h-1" },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(422);
      expect(result.data.error).toBe("Handle required");
    }
  });

  it("returns failure when API returns unexpected response shape", async () => {
    mockFetch = createMockFetch({
      "/api/social-ids": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { handle: "@jane", platformId: "plat-1", humanId: "h-1" },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(500);
    }
  });

  it("sends platformId as undefined when not provided", async () => {
    const event = mockEvent({
      formData: { handle: "@jane", humanId: "h-1" },
    });
    try {
      await actions.create(event as any);
    } catch {
      // redirect expected
    }
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall as any)[1].body);
    expect(body.platformId).toBeUndefined();
  });

  it("sends humanId as undefined when not provided", async () => {
    const event = mockEvent({
      formData: { handle: "@jane", platformId: "plat-1" },
    });
    try {
      await actions.create(event as any);
    } catch {
      // redirect expected
    }
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall as any)[1].body);
    expect(body.humanId).toBeUndefined();
  });

  it("returns failure on 400 API error", async () => {
    mockFetch = createMockFetch({
      "/api/social-ids": { status: 400, body: { error: { message: "Bad request" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({ formData: { handle: "@jane" } });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(400);
    }
  });
});
