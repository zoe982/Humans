import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load, actions } from "../../../../../src/routes/leads/general-leads/[id]/+page.server";

const sampleLead = {
  id: "lea-1",
  firstName: "Jane",
  middleName: null,
  lastName: "Smith",
  status: "open",
  notes: "Some notes",
  emails: [],
  phoneNumbers: [],
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

  it("returns leadScore when lead-scores API returns data", async () => {
    const sampleScore = { id: "sco-1", scoreTotal: 65, scoreFit: 30, scoreIntent: 25, scoreEngagement: 15, scoreNegative: 5 };
    mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { body: { data: sampleLead } },
      "/api/humans": { body: { data: [] } },
      "/api/lead-scores/by-parent/general_lead/lea-1": { body: { data: sampleScore } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.leadScore).toEqual(sampleScore);
  });

  it("returns null leadScore when lead-scores API returns null data", async () => {
    mockFetch = createMockFetch({
      "/api/general-leads/lea-1": { body: { data: sampleLead } },
      "/api/humans": { body: { data: [] } },
      "/api/lead-scores/by-parent/general_lead/lea-1": { body: { data: null } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.leadScore).toBeNull();
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

describe("general-leads/[id] addEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when email is added", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1/emails": { status: 200, body: { data: { id: "eml-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "new@example.com" } });
    const result = await actions.addEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1/emails": { status: 422, body: { error: "Invalid email" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "not-an-email" } });
    const result = await actions.addEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Invalid email");
    }
  });
});

describe("general-leads/[id] deleteEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when email is deleted", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1/emails/eml-1": { status: 200, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { emailId: "eml-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1/emails/eml-missing": { status: 404, body: { error: "Email not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { emailId: "eml-missing" } });
    const result = await actions.deleteEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Email not found");
    }
  });
});

describe("general-leads/[id] addPhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when phone number is added", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1/phone-numbers": { status: 200, body: { data: { id: "fon-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumber: "+15551234567" } });
    const result = await actions.addPhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1/phone-numbers": { status: 422, body: { error: "Invalid phone number" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumber: "bad" } });
    const result = await actions.addPhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Invalid phone number");
    }
  });
});

describe("general-leads/[id] deletePhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when phone number is deleted", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1/phone-numbers/fon-1": { status: 200, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumberId: "fon-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/general-leads/lea-1/phone-numbers/fon-missing": { status: 404, body: { error: "Phone not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumberId: "fon-missing" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Phone not found");
    }
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
