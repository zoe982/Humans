import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load } from "../../../../src/routes/pets/[id]/+page.server";

const samplePet = { id: "p1", name: "Buddy", type: "dog", breed: "Labrador" };

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "p1" };
  return event;
}

describe("pets/[id] +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/pets/p1": { body: { data: samplePet } },
      "/api/humans": { body: { data: [{ id: "h1", firstName: "Jane" }] } },
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

  it("returns pet and allHumans on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.pet).toEqual(samplePet);
    expect(result.allHumans).toEqual([expect.objectContaining({ id: "h1", firstName: "Jane" })]);
  });

  it("redirects to /pets when pet API returns 404", async () => {
    mockFetch = createMockFetch({
      "/api/pets/p1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/pets");
    }
  });

  it("redirects to /pets when pet API returns non-object data", async () => {
    mockFetch = createMockFetch({
      "/api/pets/p1": { body: { weird: true } },
      "/api/humans": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/pets");
    }
  });

  it("returns empty allHumans when humans API fails", async () => {
    mockFetch = createMockFetch({
      "/api/pets/p1": { body: { data: samplePet } },
      "/api/humans": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
  });
});
