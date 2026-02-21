import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/pets/new/+page.server";

describe("pets/new load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane" }] } },
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

  it("returns allHumans on success", async () => {
    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([{ id: "h-1", firstName: "Jane" }]);
  });

  it("returns empty allHumans when API fails", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
  });

  it("returns empty allHumans when API returns non-list response", async () => {
    mockFetch = createMockFetch({
      "/api/humans": { body: { message: "unexpected" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
  });

  it("passes session token in cookie header", async () => {
    const event = mockEvent({ sessionToken: "sess-abc" });
    await load(event as any);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/humans"),
      expect.objectContaining({
        headers: { Cookie: "humans_session=sess-abc" },
      }),
    );
  });
});

describe("pets/new create action", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/pets": { body: { data: { id: "pet-new-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to new pet on successful create", async () => {
    const event = mockEvent({
      formData: { humanId: "h-1", name: "Rex", type: "dog" },
    });
    try {
      await actions.create(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/pets/pet-new-1");
    }
  });

  it("returns failure when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/pets": { status: 422, body: { error: "Validation failed" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { humanId: "h-1", name: "", type: "dog" },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(422);
      expect(result.data.error).toBe("Validation failed");
    }
  });

  it("returns failure when API returns unexpected response shape", async () => {
    mockFetch = createMockFetch({
      "/api/pets": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent({
      formData: { humanId: "h-1", name: "Max", type: "cat" },
    });
    const result = await actions.create(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.status).toBe(500);
    }
  });

  it("sends breed as null when not provided", async () => {
    const event = mockEvent({
      formData: { humanId: "h-1", name: "Buddy", type: "dog" },
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
    expect(body.breed).toBeNull();
  });

  it("sends weight as null when not provided", async () => {
    const event = mockEvent({
      formData: { humanId: "h-1", name: "Buddy", type: "dog" },
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
    expect(body.weight).toBeNull();
  });

  it("sends parsed weight when weight is provided", async () => {
    const event = mockEvent({
      formData: { humanId: "h-1", name: "Buddy", type: "dog", weight: "12.5" },
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
    expect(body.weight).toBe(12.5);
  });

  it("defaults type to 'dog' when not provided", async () => {
    const event = mockEvent({
      formData: { humanId: "h-1", name: "Buddy" },
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
    expect(body.type).toBe("dog");
  });
});
