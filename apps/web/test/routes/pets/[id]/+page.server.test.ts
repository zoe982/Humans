import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect, type ActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/pets/[id]/+page.server";

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
      "/api/pets/p1/opportunities": { body: { data: [] } },
      "/api/pets/p1": { body: { data: samplePet } },
      "/api/humans": { body: { data: [{ id: "h1", firstName: "Jane" }] } },
      "/api/opportunities": { body: { data: [] } },
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
    expect(result.petOpportunities).toEqual([]);
    expect(result.allOpportunities).toEqual([]);
  });

  it("redirects to /pets when pet API returns 404", async () => {
    mockFetch = createMockFetch({
      "/api/pets/p1/opportunities": { body: { data: [] } },
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
      "/api/pets/p1/opportunities": { body: { data: [] } },
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
      "/api/pets/p1/opportunities": { body: { data: [] } },
      "/api/pets/p1": { body: { data: samplePet } },
      "/api/humans": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
  });
});

describe("pets/[id] actions.linkOpportunity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns error when opportunityId is empty", async () => {
    const mockFetch = createMockFetch({});
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { opportunityId: "", petHumanId: "h1" } });
    const result = await actions.linkOpportunity(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string }>;
    expect(failure.status).toBe(400);
    expect(failure.data.error).toBe("Please select an opportunity");
  });

  it("links pet to opportunity without auto-linking owner when owner already linked", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1/pets": { status: 201, body: { data: { id: "link1" } } },
      "/api/opportunities/opp1": { body: { data: { id: "opp1", linkedHumans: [{ humanId: "h1" }] } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { opportunityId: "opp1", petHumanId: "h1" } });
    const result = await actions.linkOpportunity(event as any);

    expect(result).toEqual({ success: true });
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("/api/opportunities/opp1/pets"))).toBe(true);
    expect(calls.some((u: string) => u.includes("/api/opportunities/opp1/humans"))).toBe(false);
  });

  it("auto-links owner when not already linked to opportunity", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp2/humans": { status: 201, body: { data: { id: "link-h" } } },
      "/api/opportunities/opp2/pets": { status: 201, body: { data: { id: "link-p" } } },
      "/api/opportunities/opp2": { body: { data: { id: "opp2", linkedHumans: [{ humanId: "h-other" }] } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { opportunityId: "opp2", petHumanId: "h1" } });
    const result = await actions.linkOpportunity(event as any);

    expect(result).toEqual({ success: true });
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("/api/opportunities/opp2/humans"))).toBe(true);
    expect(calls.some((u: string) => u.includes("/api/opportunities/opp2/pets"))).toBe(true);
  });

  it("skips owner auto-link when petHumanId is empty", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp3/pets": { status: 201, body: { data: { id: "link-p" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { opportunityId: "opp3", petHumanId: "" } });
    const result = await actions.linkOpportunity(event as any);

    expect(result).toEqual({ success: true });
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("/api/opportunities/opp3/humans"))).toBe(false);
  });

  it("returns failure when pet link API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp4/pets": { status: 409, body: { error: "Already linked", code: "DUPLICATE" } },
      "/api/opportunities/opp4": { body: { data: { id: "opp4", linkedHumans: [] } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { opportunityId: "opp4", petHumanId: "h1" } });
    const result = await actions.linkOpportunity(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string }>;
    expect(failure.status).toBe(409);
  });

  it("returns failure when auto-link of owner to opportunity fails", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp5/humans": { status: 500, body: { error: "Internal error", code: "INTERNAL" } },
      "/api/opportunities/opp5": { body: { data: { id: "opp5", linkedHumans: [] } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { opportunityId: "opp5", petHumanId: "h1" } });
    const result = await actions.linkOpportunity(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string }>;
    expect(failure.status).toBe(500);
  });
});

describe("pets/[id] actions.unlinkOpportunity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unlinks pet from opportunity successfully", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1/pets/link1": { body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { opportunityId: "opp1", linkId: "link1" } });
    const result = await actions.unlinkOpportunity(event as any);

    expect(result).toEqual({ success: true });
    const calls = mockFetch.mock.calls;
    const deleteCall = calls.find((c: unknown[]) => {
      const opts = c[1] as RequestInit | undefined;
      return opts?.method === "DELETE";
    });
    expect(deleteCall).toBeDefined();
    expect(String(deleteCall![0])).toContain("/api/opportunities/opp1/pets/link1");
  });

  it("returns failure when unlink API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp2/pets/link2": { status: 404, body: { error: "Not found", code: "LINK_NOT_FOUND" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { opportunityId: "opp2", linkId: "link2" } });
    const result = await actions.unlinkOpportunity(event as any);

    expect(isActionFailure(result)).toBe(true);
    const failure = result as ActionFailure<{ error: string }>;
    expect(failure.status).toBe(404);
  });
});
