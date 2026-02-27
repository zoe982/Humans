import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, Redirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load, actions } from "../../../../../src/routes/leads/website-booking-requests/[id]/+page.server";

const sampleBooking = { id: "b1", status: "new", petName: "Buddy" };
const sampleLinkedHumans = [
  { id: "link-1", humanId: "h1", humanDisplayId: "HUM-AAA-001", humanFirstName: "Alice", humanLastName: "Smith", linkedAt: "2026-01-01T00:00:00.000Z" },
];

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "b1" };
  return event;
}

describe("website-booking-requests/[id] +page.server load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/linked-humans": { body: { data: sampleLinkedHumans } },
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
      "/api/activities": { body: { data: [{ id: "a1", type: "email" }] } },
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

  it("returns booking, activities, linkedHumans, marketingAttribution, and user on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.booking).toEqual(sampleBooking);
    expect(result.activities).toHaveLength(1);
    expect(result.linkedHumans).toEqual(sampleLinkedHumans);
    expect(result.marketingAttribution).toBeNull();
    expect(result.user).toBeDefined();
  });

  it("fetches marketing attribution when booking has marketing_attribution_id", async () => {
    const bookingWithAttr = { ...sampleBooking, marketing_attribution_id: "mat-1" };
    const sampleAttr = { id: "mat-1", crmDisplayId: "MAT-AAA-001" };
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/linked-humans": { body: { data: sampleLinkedHumans } },
      "/api/website-booking-requests/b1": { body: { data: bookingWithAttr } },
      "/api/activities": { body: { data: [] } },
      "/api/marketing-attributions/mat-1": { body: { data: sampleAttr } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.marketingAttribution).toEqual(sampleAttr);
  });

  it("returns leadScore when lead-scores API returns data", async () => {
    const sampleScore = { id: "sco-1", scoreTotal: 80, scoreFit: 35, scoreIntent: 50, scoreEngagement: 0, scoreNegative: 5 };
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/linked-humans": { body: { data: sampleLinkedHumans } },
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
      "/api/activities": { body: { data: [] } },
      "/api/lead-scores/by-parent/website_booking_request/b1": { body: { data: sampleScore } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.leadScore).toEqual(sampleScore);
  });

  it("returns null leadScore when lead-scores API returns null data", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/linked-humans": { body: { data: sampleLinkedHumans } },
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
      "/api/activities": { body: { data: [] } },
      "/api/lead-scores/by-parent/website_booking_request/b1": { body: { data: null } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.leadScore).toBeNull();
  });

  it("returns empty linkedHumans when linked-humans API fails", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/linked-humans": { status: 500, body: { error: "fail" } },
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.linkedHumans).toEqual([]);
  });

  it("redirects to /leads/website-booking-requests when booking API returns 404", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/leads/website-booking-requests");
    }
  });

  it("redirects to /leads/website-booking-requests when API returns non-object data", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/leads/website-booking-requests");
    }
  });

  it("returns empty activities when activities API fails", async () => {
    mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
      "/api/activities": { status: 500, body: { error: "fail" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.activities).toEqual([]);
  });

  it("queries activities with websiteBookingRequestId filter", async () => {
    const event = makeEvent();
    await load(event as any);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("websiteBookingRequestId=b1"),
      expect.any(Object),
    );
  });
});

describe("website-booking-requests/[id] actions.updateStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid status update", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { status: "contacted" } });
    const result = await actions.updateStatus(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/website-booking-requests/b1"),
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { status: 422, body: { error: "Invalid status" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { status: "bad" } });
    const result = await actions.updateStatus(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Invalid status");
    }
  });
});

describe("website-booking-requests/[id] actions.updateNote", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid note update", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { crm_note: "Follow up next week" } });
    const result = await actions.updateNote(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { crm_note: "Some note" } });
    const result = await actions.updateNote(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.delete", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to list after successful delete", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    try {
      await actions.delete(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
      expect((e as Redirect).location).toBe("/leads/website-booking-requests");
    }
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/website-booking-requests/b1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await actions.delete(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.addActivity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid activity creation", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({
      formData: { type: "email", subject: "Follow up", activityDate: "2026-01-15" },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/activities"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { type: "email", subject: "" } });
    const result = await actions.addActivity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("includes websiteBookingRequestId in activity payload", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { type: "call", subject: "Discussion" } });
    await actions.addActivity(event as any);
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    const body = JSON.parse((postCall as unknown[])[1]
      ? ((postCall as unknown[])[1] as RequestInit).body as string
      : "{}");
    expect(body.websiteBookingRequestId).toBe("b1");
  });
});

describe("website-booking-requests/[id] actions.linkHuman", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid convert", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/link-human": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { humanId: "h1" } });
    const result = await actions.linkHuman(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/website-booking-requests/b1/link-human"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/link-human": { status: 404, body: { error: "Human not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { humanId: "h1" } });
    const result = await actions.linkHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Human not found");
    }
  });

  it("passes humanId in body", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/link-human": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { humanId: "h1" } });
    await actions.linkHuman(event as any);
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    const body = JSON.parse((postCall as unknown[])[1]
      ? ((postCall as unknown[])[1] as RequestInit).body as string
      : "{}");
    expect(body.humanId).toBe("h1");
  });
});

describe("website-booking-requests/[id] actions.unlinkHuman", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls DELETE on correct URL", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/link-human": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await actions.unlinkHuman(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/website-booking-requests/b1/link-human"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/link-human": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await actions.unlinkHuman(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.addEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when email is added", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/emails": { body: { data: { id: "eml-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "new@example.com" } });
    const result = await actions.addEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/emails": { status: 422, body: { error: "Invalid email" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "bad" } });
    const result = await actions.addEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.deleteEmail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when email is deleted", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/emails/eml-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { emailId: "eml-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/emails/eml-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { emailId: "eml-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.addPhoneNumber", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when phone number is added", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/phone-numbers": { body: { data: { id: "fon-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumber: "+15551234567" } });
    const result = await actions.addPhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/phone-numbers": { status: 422, body: { error: "Invalid phone" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumber: "bad" } });
    const result = await actions.addPhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.deletePhoneNumber", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when phone number is deleted", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/phone-numbers/fon-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumberId: "fon-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/phone-numbers/fon-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumberId: "fon-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.addSocialId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when social ID is added", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/social-ids": { body: { data: { id: "soc-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { handle: "@user", platformId: "plat-1" } });
    const result = await actions.addSocialId(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/social-ids": { status: 422, body: { error: "Handle required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { handle: "", platformId: "plat-1" } });
    const result = await actions.addSocialId(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.deleteSocialId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when social ID is deleted", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/social-ids/soc-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { socialIdId: "soc-1" } });
    const result = await actions.deleteSocialId(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/social-ids/soc-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { socialIdId: "soc-1" } });
    const result = await actions.deleteSocialId(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.updateSourceChannel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when source/channel are updated", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { source: "Referral", channel: "Phone" } });
    const result = await actions.updateSourceChannel(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/website-booking-requests/b1"),
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("sends null for empty source/channel", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { source: "", channel: "" } });
    const result = await actions.updateSourceChannel(event as any);
    expect(result).toEqual({ success: true });

    const patchCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "PATCH",
    );
    const body = JSON.parse((patchCall as unknown[])[1]
      ? ((patchCall as unknown[])[1] as RequestInit).body as string
      : "{}") as Record<string, unknown>;
    expect(body["crm_source"]).toBeNull();
    expect(body["crm_channel"]).toBeNull();
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1": { status: 422, body: { error: "Invalid source" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { source: "Unknown", channel: "Fax" } });
    const result = await actions.updateSourceChannel(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] load returns leadSources and leadChannels", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns leadSources and leadChannels from config", async () => {
    const mockFetch = createMockFetch({
      "account-config/batch": {
        body: {
          data: {
            "lead-sources": [{ id: "ls-1", name: "Referral", createdAt: "2026-01-01T00:00:00.000Z" }],
            "lead-channels": [{ id: "lc-1", name: "Phone", createdAt: "2026-01-01T00:00:00.000Z" }],
            "social-id-platforms": [],
          },
        },
      },
      "/api/website-booking-requests/b1/linked-humans": { body: { data: sampleLinkedHumans } },
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.leadSources).toEqual([
      { id: "ls-1", name: "Referral", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(result.leadChannels).toEqual([
      { id: "lc-1", name: "Phone", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });
});

describe("website-booking-requests/[id] load returns opportunities", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns opportunities list from API", async () => {
    const sampleOpps = [{ id: "opp-1", displayId: "OPP-AAA-001", stage: "open" }];
    const mockFetch = createMockFetch({
      "/api/opportunities?limit=200": { body: { data: sampleOpps } },
      "/api/website-booking-requests/b1/linked-humans": { body: { data: sampleLinkedHumans } },
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.opportunities).toEqual(sampleOpps);
  });

  it("returns empty opportunities when API fails", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities?limit=200": { status: 500, body: { error: "fail" } },
      "/api/website-booking-requests/b1/linked-humans": { body: { data: sampleLinkedHumans } },
      "/api/website-booking-requests/b1": { body: { data: sampleBooking } },
      "/api/activities": { body: { data: [] } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    const result = await load(event as any);
    expect(result.opportunities).toEqual([]);
  });
});

describe("website-booking-requests/[id] actions.linkOpportunity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid link", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/link-opportunity": { body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { opportunityId: "opp-1" } });
    const result = await actions.linkOpportunity(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/website-booking-requests/b1/link-opportunity"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("sends opportunityId in body", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/link-opportunity": { body: { success: true } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { opportunityId: "opp-1" } });
    await actions.linkOpportunity(event as any);
    const postCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[1] === "object" && (c[1] as RequestInit).method === "POST",
    );
    const body = JSON.parse((postCall as unknown[])[1]
      ? ((postCall as unknown[])[1] as RequestInit).body as string
      : "{}");
    expect(body.opportunityId).toBe("opp-1");
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/link-opportunity": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent({ formData: { opportunityId: "opp-1" } });
    const result = await actions.linkOpportunity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("website-booking-requests/[id] actions.unlinkOpportunity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls DELETE on correct URL", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/link-opportunity": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await actions.unlinkOpportunity(event as any);
    expect(result).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/website-booking-requests/b1/link-opportunity"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("returns action failure when API returns error", async () => {
    const mockFetch = createMockFetch({
      "/api/website-booking-requests/b1/link-opportunity": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);
    const event = makeEvent();
    const result = await actions.unlinkOpportunity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});
