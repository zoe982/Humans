import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure, Redirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../helpers";
import { load, actions } from "../../../../src/routes/opportunities/[id]/+page.server";

const mockOpportunity = {
  id: "opp1",
  displayId: "OPP-alpha-001",
  stage: "open",
  seatsRequested: 2,
  lossReason: null,
  linkedHumans: [],
  linkedPets: [],
  activities: [],
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "opp1" };
  return event;
}

describe("opportunities/[id] +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Order matters: specific patterns before general ones (createMockFetch uses includes())
    mockFetch = createMockFetch({
      "/api/opportunities/opp1": { body: { data: mockOpportunity } },
      "/api/admin/account-config/opportunity-human-roles": { body: { data: [{ id: "r1", name: "primary", createdAt: "2025-01-01" }] } },
      "/api/colleagues": { body: { data: [{ id: "col1", name: "Agent A" }] } },
      "/api/humans": { body: { data: [{ id: "h1", firstName: "Jane", lastName: "Doe" }] } },
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

  it("redirects to /opportunities when opportunity not found", async () => {
    mockFetch = createMockFetch({
      "/api/opportunities/opp1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/opportunities");
    }
  });

  it("returns opportunity with related data", async () => {
    const event = makeEvent();
    const result = await load(event as any);

    expect(result.opportunity).toEqual(mockOpportunity);
    expect(result.colleagues).toHaveLength(1);
    expect(result.colleagues[0]).toEqual({ id: "col1", name: "Agent A" });
    expect(result.allHumans).toHaveLength(1);
    expect(result.allHumans[0]).toEqual({ id: "h1", firstName: "Jane", lastName: "Doe" });
    expect(result.roleConfigs).toHaveLength(1);
    expect(result.roleConfigs[0]).toEqual({ id: "r1", name: "primary", createdAt: "2025-01-01" });
  });

  it("returns empty colleagues and allHumans when those APIs fail", async () => {
    mockFetch = createMockFetch({
      "/api/opportunities/opp1": { body: { data: mockOpportunity } },
      "/api/admin/account-config/opportunity-human-roles": { status: 500, body: { error: "Server error" } },
      "/api/colleagues": { status: 500, body: { error: "Server error" } },
      "/api/humans": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);

    expect(result.colleagues).toEqual([]);
    expect(result.allHumans).toEqual([]);
    expect(result.roleConfigs).toEqual([]);
  });

  it("exposes userRole from locals", async () => {
    const event = makeEvent({ user: { id: "u1", email: "a@b.com", role: "admin", name: "Admin" } });
    const result = await load(event as any);

    expect(result.userRole).toBe("admin");
  });
});

describe("opportunities/[id] actions.linkHuman", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends POST to API and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1/humans": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { humanId: "h1", roleId: "r1" } });
    const result = await actions.linkHuman(event as any);

    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1/humans": { status: 400, body: { error: "Human already linked", code: "DUPLICATE" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { humanId: "h1", roleId: "r1" } });
    const result = await actions.linkHuman(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(400);
    expect((result as any).data.error).toBe("Human already linked");
    expect((result as any).data.code).toBe("DUPLICATE");
  });

  it("sends roleId in payload when provided", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1/humans": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { humanId: "h1", roleId: "r1" } });
    await actions.linkHuman(event as any);

    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(((postCall as unknown[])[1] as RequestInit).body as string);
    expect(body.humanId).toBe("h1");
    expect(body.roleId).toBe("r1");
  });
});

describe("opportunities/[id] actions.unlinkHuman", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends DELETE to API and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1/humans/link1": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link1" } });
    const result = await actions.unlinkHuman(event as any);

    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1/humans/link1": { status: 404, body: { error: "Link not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link1" } });
    const result = await actions.unlinkHuman(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(404);
    expect((result as any).data.error).toBe("Link not found");
  });
});

describe("opportunities/[id] actions.linkPet", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends POST to API and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1/pets": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { petId: "p1" } });
    const result = await actions.linkPet(event as any);

    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1/pets": { status: 400, body: { error: "Pet already linked", code: "DUPLICATE" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { petId: "p1" } });
    const result = await actions.linkPet(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(400);
    expect((result as any).data.error).toBe("Pet already linked");
  });
});

describe("opportunities/[id] actions.unlinkPet", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends DELETE to API and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1/pets/link1": { status: 200, body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link1" } });
    const result = await actions.unlinkPet(event as any);

    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp1/pets/link1": { status: 404, body: { error: "Link not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link1" } });
    const result = await actions.unlinkPet(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(404);
    expect((result as any).data.error).toBe("Link not found");
  });
});

describe("opportunities/[id] actions.addActivity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends POST to activities API and returns success", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { status: 201, body: { data: { id: "act1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { type: "email", subject: "Follow up", notes: "", activityDate: "" } });
    const result = await actions.addActivity(event as any);

    expect(result).toEqual({ success: true });
  });

  it("includes opportunityId in the POST payload", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { status: 201, body: { data: { id: "act1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { type: "call", subject: "Check-in", activityDate: "2025-06-01" } });
    await actions.addActivity(event as any);

    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(((postCall as unknown[])[1] as RequestInit).body as string);
    expect(body.opportunityId).toBe("opp1");
    expect(body.type).toBe("call");
    expect(body.subject).toBe("Check-in");
  });

  it("defaults type to email when absent", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { status: 201, body: { data: { id: "act2" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { subject: "No type given" } });
    await actions.addActivity(event as any);

    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(((postCall as unknown[])[1] as RequestInit).body as string);
    expect(body.type).toBe("email");
  });

  it("returns failure when activities API errors", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { type: "email", subject: "Test" } });
    const result = await actions.addActivity(event as any);

    expect(isActionFailure(result)).toBe(true);
    expect((result as any).status).toBe(400);
    expect((result as any).data.error).toBe("Bad request");
  });
});
