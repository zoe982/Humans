import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load, actions } from "../../../../../src/routes/leads/general-leads/[id]/+page.server";

const sampleLead = {
  id: "lea-1",
  source: "web",
  status: "new",
  email: "lead@example.com",
  phone: "+15551234567",
  notes: "Some notes",
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "lea-1" };
  return event;
}

describe("general-leads/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { body: { data: sampleLead } },
      "/api/humans": { body: { data: [{ id: "h-1", firstName: "Jane", lastName: "Smith" }] } },
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
    }
  });

  it("returns lead and humans on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.lead).toEqual(sampleLead);
    expect(result.allHumans).toEqual([{ id: "h-1", firstName: "Jane", lastName: "Smith" }]);
  });

  it("returns the authenticated user", async () => {
    const event = makeEvent({ user: { id: "u-1", email: "agent@test.com", role: "agent", name: "Test Agent" } });
    const result = await load(event as any);
    expect(result.user).toMatchObject({ id: "u-1", role: "agent" });
  });

  it("redirects to /leads/general-leads when lead API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("redirects to /leads/general-leads when lead response has no data", async () => {
    mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { body: { unexpected: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns empty allHumans when humans API fails", async () => {
    mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { body: { data: sampleLead } },
      "/api/humans": { status: 500, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.allHumans).toEqual([]);
  });
});

describe("general-leads/[id] updateNotes action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when notes are updated", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { status: 200, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { notes: "Updated notes" } });
    const result = await actions.updateNotes(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { status: 400, body: { error: "Invalid notes" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { notes: "" } });
    const result = await actions.updateNotes(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Invalid notes");
    }
  });
});

describe("general-leads/[id] updateContact action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when contact is updated", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { status: 200, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "new@example.com", phone: "+15559876543" } });
    const result = await actions.updateContact(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { status: 422, body: { error: "Invalid email" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "not-an-email", phone: "" } });
    const result = await actions.updateContact(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("general-leads/[id] updateStatus action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when status is updated", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1/status": { status: 200, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { status: "qualified" } });
    const result = await actions.updateStatus(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns success with rejectReason when rejecting", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1/status": { status: 200, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { status: "rejected", rejectReason: "Not a fit" } });
    const result = await actions.updateStatus(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1/status": { status: 400, body: { error: "Invalid status" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { status: "unknown-status" } });
    const result = await actions.updateStatus(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Invalid status");
    }
  });
});

describe("general-leads/[id] addActivity action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when activity is created", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "act-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { type: "call", subject: "Follow up", activityDate: "2025-06-01" },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("defaults type to email when type is omitted", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "act-2" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { subject: "No type provided" } });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("defaults activityDate when not provided", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "act-3" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { type: "email", subject: "No date" } });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { status: 422, body: { error: "Subject required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { type: "call", subject: "" } });
    const result = await actions.addActivity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("general-leads/[id] delete action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /leads/general-leads on successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { status: 200, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    try {
      await actions.delete(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { status: 404, body: { error: "Lead not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Lead not found");
    }
  });
});
