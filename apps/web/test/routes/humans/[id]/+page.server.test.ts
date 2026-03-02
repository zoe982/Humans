import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect, isActionFailure } from "@sveltejs/kit";
import { mockEvent, createMockFetch, mockConfigItem, mockBatchConfigResponse } from "../../../helpers";
import { load, actions } from "../../../../src/routes/humans/[id]/+page.server";

const sampleHuman = {
  id: "h-1",
  firstName: "Jane",
  lastName: "Doe",
  emails: [],
  phoneNumbers: [],
  pets: [],
  linkedRouteSignups: [],
  linkedWebsiteBookingRequests: [],
};

function makeEvent(overrides: Parameters<typeof mockEvent>[0] = {}) {
  const event = mockEvent(overrides);
  event.params = { id: "h-1" };
  return event;
}

describe("humans/[id] load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [mockConfigItem({ id: "lbl-1", name: "Work" })],
        "human-phone-labels": [mockConfigItem({ id: "plbl-1", name: "Mobile" })],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { body: { data: [] } },
      "/api/website-booking-requests": { body: { data: [] } },
      "/api/humans/h-1/full": { body: { data: {
        human: sampleHuman,
        activities: { data: [{ id: "a-1", type: "email" }], meta: { page: 1, limit: 200, total: 1 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
      "/api/ui/dropdown-data": { body: { data: {
        accounts: [],
        humans: [],
        discountCodes: [],
      } } },
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

  it("returns human, activities, and label configs on success", async () => {
    const event = makeEvent();
    const result = await load(event as any);
    expect(result.human).toMatchObject({ id: "h-1", firstName: "Jane", lastName: "Doe" });
    expect(result.activities).toEqual([{ id: "a-1", type: "email" }]);
    expect(result.emailLabelConfigs).toEqual([expect.objectContaining({ id: "lbl-1", name: "Work" })]);
    expect(result.phoneLabelConfigs).toEqual([expect.objectContaining({ id: "plbl-1", name: "Mobile" })]);
    expect(result.allRouteSignups).toEqual([]);
    expect(result.allBookingRequests).toEqual([]);
    expect(result.allAccounts).toEqual([]);
    expect(result.accountHumanLabelConfigs).toEqual([]);
    expect(result.humanOpportunities).toEqual([]);
    expect(result.generalLeads).toEqual([]);
    expect(result.humanRelationships).toEqual([]);
    expect(result.humanAgreements).toEqual([]);
    expect(result.allHumans).toEqual([]);
    expect(result.allDiscountCodes).toEqual([]);
  });

  it("redirects to /humans when human API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/humans/h-1/full": { status: 404, body: { error: "Not found" } },
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
});

describe("humans/[id] addActivity action", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on valid activity creation", async () => {
    const event = makeEvent({
      formData: {
        type: "email",
        subject: "Follow up",
        activityDate: "2025-01-15",
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API errors", async () => {
    mockFetch = createMockFetch({
      "/api/activities": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { type: "email", subject: "Test" },
    });
    const result = await actions.addActivity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("creates geo-interest expression when geoInterestsJson present", async () => {
    mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: {
        type: "meeting",
        subject: "Discuss trip",
        activityDate: "2025-01-15",
        geoInterestsJson: JSON.stringify([{ city: "Rome", country: "Italy" }]),
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("geo-interest-expressions"))).toBe(true);
  });
});

describe("humans/[id] unlinkSignup action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on unlink", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/route-signups/link-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link-1" } });
    const result = await actions.unlinkSignup(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API errors", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/route-signups/link-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link-1" } });
    const result = await actions.unlinkSignup(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when email is added", async () => {
    const mockFetch = createMockFetch({
      "/api/emails": { body: { data: { id: "em-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { email: "jane@work.com", labelId: "lbl-1" },
    });
    const result = await actions.addEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/emails": { status: 422, body: { error: "Invalid email" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { email: "bad" } });
    const result = await actions.addEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deleteEmail action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/emails/em-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "em-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/emails/em-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "em-1" } });
    const result = await actions.deleteEmail(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addPhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when phone number is added", async () => {
    const mockFetch = createMockFetch({
      "/api/phone-numbers": { body: { data: { id: "ph-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { phoneNumber: "+1234567890", labelId: "plbl-1" },
    });
    const result = await actions.addPhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/phone-numbers": { status: 422, body: { error: "Invalid phone" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneNumber: "bad" } });
    const result = await actions.addPhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deletePhoneNumber action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/phone-numbers/ph-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneId: "ph-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(result).toEqual({ success: true });
  });
});

describe("humans/[id] addGeoInterestExpression action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success with geoInterestId", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { geoInterestId: "gi-1", notes: "Very interested" },
    });
    const result = await actions.addGeoInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns success with city/country when no geoInterestId", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { city: "Rome", country: "Italy" },
    });
    const result = await actions.addGeoInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions": { status: 400, body: { error: "Missing data" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { geoInterestId: "gi-1" } });
    const result = await actions.addGeoInterestExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deleteGeoInterestExpression action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "expr-1" } });
    const result = await actions.deleteGeoInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/geo-interest-expressions/expr-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "expr-1" } });
    const result = await actions.deleteGeoInterestExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addPet action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when pet is added", async () => {
    const mockFetch = createMockFetch({
      "/api/pets": { body: { data: { id: "pet-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { name: "Buddy", breed: "Labrador", weight: "30" },
    });
    const result = await actions.addPet(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns success for non-dog pet type (no breed sent)", async () => {
    const mockFetch = createMockFetch({
      "/api/pets": { body: { data: { id: "pet-2" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { name: "Whiskers", type: "cat", weight: "5" },
    });
    const result = await actions.addPet(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/pets": { status: 422, body: { error: "Name required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { name: "" } });
    const result = await actions.addPet(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deletePet action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/pets/pet-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "pet-1" } });
    const result = await actions.deletePet(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/pets/pet-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "pet-1" } });
    const result = await actions.deletePet(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deletePhoneNumber action error path", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/phone-numbers/ph-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { phoneId: "ph-1" } });
    const result = await actions.deletePhoneNumber(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addRouteInterestExpression action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success with routeInterestId", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { routeInterestId: "ri-1", notes: "Frequent flyer", frequency: "recurring" },
    });
    const result = await actions.addRouteInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns success with origin/destination when no routeInterestId", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: {
        originCity: "London",
        originCountry: "UK",
        destinationCity: "Paris",
        destinationCountry: "France",
        travelYear: "2025",
        travelMonth: "6",
        travelDay: "15",
        frequency: "one_time",
      },
    });
    const result = await actions.addRouteInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions": { status: 400, body: { error: "Missing data" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { routeInterestId: "ri-1" } });
    const result = await actions.addRouteInterestExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deleteRouteInterestExpression action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions/expr-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "expr-1" } });
    const result = await actions.deleteRouteInterestExpression(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/route-interest-expressions/expr-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "expr-1" } });
    const result = await actions.deleteRouteInterestExpression(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addSocialId action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when social ID is added", async () => {
    const mockFetch = createMockFetch({
      "/api/social-ids": { body: { data: { id: "sid-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: { handle: "@janedoe", platformId: "plat-1" },
    });
    const result = await actions.addSocialId(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/social-ids": { status: 422, body: { error: "Handle required" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { handle: "" } });
    const result = await actions.addSocialId(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deleteSocialId action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/social-ids/sid-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "sid-1" } });
    const result = await actions.deleteSocialId(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/social-ids/sid-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "sid-1" } });
    const result = await actions.deleteSocialId(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addActivity with route interests", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates route-interest expression when routeInterestsJson present", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
      "/api/route-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: {
        type: "meeting",
        subject: "Route discussion",
        activityDate: "2025-01-15",
        routeInterestsJson: JSON.stringify([{
          originCity: "NYC",
          originCountry: "USA",
          destinationCity: "London",
          destinationCountry: "UK",
          frequency: "one_time",
          travelYear: 2025,
          travelMonth: 6,
          travelDay: 10,
        }]),
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("route-interest-expressions"))).toBe(true);
  });

  it("creates route-interest expression with routeInterestId from JSON", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
      "/api/route-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: {
        type: "meeting",
        subject: "Route discussion",
        activityDate: "2025-01-15",
        routeInterestsJson: JSON.stringify([{ id: "ri-1", frequency: "recurring" }]),
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("route-interest-expressions"))).toBe(true);
  });

  it("creates geo-interest expression with existing geoInterestId from JSON", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
      "/api/geo-interest-expressions": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: {
        type: "meeting",
        subject: "Geo discussion",
        activityDate: "2025-01-15",
        geoInterestsJson: JSON.stringify([{ id: "gi-1", notes: "Existing interest" }]),
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("geo-interest-expressions"))).toBe(true);
  });

  it("ignores malformed geoInterestsJson gracefully", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: {
        type: "email",
        subject: "Test",
        activityDate: "2025-01-15",
        geoInterestsJson: "not-valid-json",
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("ignores malformed routeInterestsJson gracefully", async () => {
    const mockFetch = createMockFetch({
      "/api/activities": { body: { data: { id: "a-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({
      formData: {
        type: "email",
        subject: "Test",
        activityDate: "2025-01-15",
        routeInterestsJson: "{broken",
      },
    });
    const result = await actions.addActivity(event as any);
    expect(result).toEqual({ success: true });
  });
});

describe("humans/[id] linkRouteSignup action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on link", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/route-signups": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { routeSignupId: "rs-1" } });
    const result = await actions.linkRouteSignup(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API errors", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/route-signups": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { routeSignupId: "rs-1" } });
    const result = await actions.linkRouteSignup(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] linkBookingRequest action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on link", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/website-booking-requests": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { websiteBookingRequestId: "wbr-1" } });
    const result = await actions.linkBookingRequest(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API errors", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/website-booking-requests": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { websiteBookingRequestId: "wbr-1" } });
    const result = await actions.linkBookingRequest(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] unlinkBookingRequest action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on unlink", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/website-booking-requests/link-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link-1" } });
    const result = await actions.unlinkBookingRequest(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API errors", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/website-booking-requests/link-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { linkId: "link-1" } });
    const result = await actions.unlinkBookingRequest(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] linkAccount action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on link", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/humans": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { accountId: "acc-1", labelId: "lbl-1" } });
    const result = await actions.linkAccount(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API errors", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/humans": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { accountId: "acc-1", labelId: "lbl-1" } });
    const result = await actions.linkAccount(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] createAndLinkAccount action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when account is created and linked", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-new/humans": { body: { data: {} } },
      "/api/accounts": { body: { data: { id: "acc-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { accountName: "Acme Corp", labelId: "lbl-1" } });
    const result = await actions.createAndLinkAccount(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when account creation fails", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { accountName: "Acme Corp", labelId: "lbl-1" } });
    const result = await actions.createAndLinkAccount(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] createAndLinkAccount — no ID in response", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns failure when created account has no ID in response", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { accountName: "Missing ID Corp" } });
    const result = await actions.createAndLinkAccount(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toContain("Failed to get new account ID");
    }
  });

  it("returns failure when linking the new account fails", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-new/humans": { status: 500, body: { error: "Link failed" } },
      "/api/accounts": { body: { data: { id: "acc-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { accountName: "Acme Corp" } });
    const result = await actions.createAndLinkAccount(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addOpportunity action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when opportunity is created and human is linked", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp-new/humans": { body: { data: {} } },
      "/api/opportunities": { body: { data: { id: "opp-new" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { passengerSeats: "2", petSeats: "0" } });
    const result = await actions.addOpportunity(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when opportunity creation fails", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { status: 400, body: { error: "Bad request" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { passengerSeats: "0" } });
    const result = await actions.addOpportunity(event as any);
    expect(isActionFailure(result)).toBe(true);
  });

  it("returns failure when opportunity API returns unexpected shape", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities": { body: { weird: true } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { passengerSeats: "1" } });
    const result = await actions.addOpportunity(event as any);
    expect(isActionFailure(result)).toBe(true);
    if (isActionFailure(result)) {
      expect(result.data.error).toBe("Unexpected response");
    }
  });

  it("links pets when petIds are provided", async () => {
    const mockFetch = createMockFetch({
      "/api/opportunities/opp-pets/pets": { body: { data: {} } },
      "/api/opportunities/opp-pets/humans": { body: { data: {} } },
      "/api/opportunities": { body: { data: { id: "opp-pets" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { passengerSeats: "1", petIds: ["pet-1", "pet-2"] } });
    const result = await actions.addOpportunity(event as any);
    expect(result).toEqual({ success: true });
    const calls = mockFetch.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(calls.some((u: string) => u.includes("/api/opportunities/opp-pets/pets"))).toBe(true);
  });
});

describe("humans/[id] addRelationship action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when relationship is added", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/relationships": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { humanId2: "h-2", labelId: "lbl-1" } });
    const result = await actions.addRelationship(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/relationships": { status: 409, body: { error: "Already related" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { humanId2: "h-2" } });
    const result = await actions.addRelationship(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] removeRelationship action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when relationship is removed", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/relationships/rel-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "rel-1" } });
    const result = await actions.removeRelationship(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/humans/h-1/relationships/rel-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "rel-1" } });
    const result = await actions.removeRelationship(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] unlinkAccount action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on unlink", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/humans/link-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { accountId: "acc-1", linkId: "link-1" } });
    const result = await actions.unlinkAccount(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure when API errors", async () => {
    const mockFetch = createMockFetch({
      "/api/accounts/acc-1/humans/link-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { accountId: "acc-1", linkId: "link-1" } });
    const result = await actions.unlinkAccount(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addWebsite action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when website is added", async () => {
    const mockFetch = createMockFetch({
      "/api/websites": { body: { data: { id: "web-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { url: "https://example.com" } });
    const result = await actions.addWebsite(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/websites": { status: 422, body: { error: "Invalid URL" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { url: "not-a-url" } });
    const result = await actions.addWebsite(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deleteWebsite action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/websites/web-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "web-1" } });
    const result = await actions.deleteWebsite(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/websites/web-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "web-1" } });
    const result = await actions.deleteWebsite(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] addReferralCode action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when referral code is added", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes": { body: { data: { id: "ref-1" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { code: "SAVE10", description: "10% off" } });
    const result = await actions.addReferralCode(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns success when description is omitted", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes": { body: { data: { id: "ref-2" } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { code: "NODESC" } });
    const result = await actions.addReferralCode(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes": { status: 409, body: { error: "Code already exists" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { code: "DUPE" } });
    const result = await actions.addReferralCode(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] deleteReferralCode action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success on delete", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes/ref-1": { body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "ref-1" } });
    const result = await actions.deleteReferralCode(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/referral-codes/ref-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "ref-1" } });
    const result = await actions.deleteReferralCode(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] linkDiscountCode action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when discount code is linked", async () => {
    const mockFetch = createMockFetch({
      "/api/discount-codes/dc-1": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { discountCodeId: "dc-1" } });
    const result = await actions.linkDiscountCode(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/discount-codes/dc-1": { status: 404, body: { error: "Not found" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { discountCodeId: "dc-1" } });
    const result = await actions.linkDiscountCode(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] unlinkDiscountCode action", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns success when discount code is unlinked", async () => {
    const mockFetch = createMockFetch({
      "/api/discount-codes/dc-1": { body: { data: {} } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "dc-1" } });
    const result = await actions.unlinkDiscountCode(event as any);
    expect(result).toEqual({ success: true });
  });

  it("returns failure on API error", async () => {
    const mockFetch = createMockFetch({
      "/api/discount-codes/dc-1": { status: 500, body: { error: "Server error" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent({ formData: { id: "dc-1" } });
    const result = await actions.unlinkDiscountCode(event as any);
    expect(isActionFailure(result)).toBe(true);
  });
});

describe("humans/[id] load — additional branches", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /humans when human API returns ok but data is null", async () => {
    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { body: { data: [] } },
      "/api/website-booking-requests": { body: { data: [] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { something: "else" } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("resolves convertedFromLead when generalLeads has items", async () => {
    const humanWithNoLinks = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [],
      linkedWebsiteBookingRequests: [],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { body: { data: [] } },
      "/api/website-booking-requests": { body: { data: [] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithNoLinks,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [{ id: "lead-1", displayId: "LEA-AAA-001" }], meta: { page: 1, limit: 50, total: 1 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    expect(result.convertedFromLead).toEqual({ id: "lead-1", displayId: "LEA-AAA-001" });
  });

  it("enriches linkedRouteSignups with matching signup data", async () => {
    const humanWithLinkedSignup = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [{ id: "link-1", routeSignupId: "rs-1", linkedAt: "2025-01-01" }],
      linkedWebsiteBookingRequests: [],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { body: { data: [{ id: "rs-1", display_id: "ROI-AAA-001", first_name: "Bob", last_name: "Smith", origin: "JFK", destination: "LHR" }] } },
      "/api/website-booking-requests": { body: { data: [] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithLinkedSignup,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    expect(result.human.linkedRouteSignups).toHaveLength(1);
    const enriched = (result.human.linkedRouteSignups as Array<Record<string, unknown>>)[0];
    expect(enriched.displayId).toBe("ROI-AAA-001");
    expect(enriched.passengerName).toBe("Bob Smith");
    expect(enriched.origin).toBe("JFK");
    expect(enriched.destination).toBe("LHR");
  });

  it("enriches linkedRouteSignups with nulls when signup not found in allRouteSignups", async () => {
    const humanWithUnmatchedSignup = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [{ id: "link-1", routeSignupId: "rs-missing", linkedAt: "2025-01-01" }],
      linkedWebsiteBookingRequests: [],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { body: { data: [] } },
      "/api/website-booking-requests": { body: { data: [] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithUnmatchedSignup,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    const enriched = (result.human.linkedRouteSignups as Array<Record<string, unknown>>)[0];
    expect(enriched.displayId).toBeNull();
    expect(enriched.passengerName).toBeNull();
    expect(enriched.origin).toBeNull();
    expect(enriched.destination).toBeNull();
  });

  it("enriches linkedRouteSignups via individual fetch when not in bulk list", async () => {
    const humanWithLinkedSignup = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [{ id: "link-1", routeSignupId: "rs-old", linkedAt: "2025-01-01" }],
      linkedWebsiteBookingRequests: [],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      // Bulk list does NOT contain rs-old (simulates limit=100 missing older signups)
      "/api/route-signups?": { body: { data: [] } },
      // Individual fetch DOES return the signup
      "/api/route-signups/rs-old": { body: { data: { id: "rs-old", display_id: "ROU-AAB-001", first_name: "Alice", last_name: "Wonder", origin: "MLA", destination: "LHR" } } },
      "/api/website-booking-requests?": { body: { data: [] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithLinkedSignup,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    expect(result.human.linkedRouteSignups).toHaveLength(1);
    const enriched = (result.human.linkedRouteSignups as Array<Record<string, unknown>>)[0];
    expect(enriched.displayId).toBe("ROU-AAB-001");
    expect(enriched.passengerName).toBe("Alice Wonder");
    expect(enriched.origin).toBe("MLA");
    expect(enriched.destination).toBe("LHR");
  });

  it("enriches linkedWebsiteBookingRequests via individual fetch when not in bulk list", async () => {
    const humanWithLinkedBooking = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [],
      linkedWebsiteBookingRequests: [{ id: "blink-1", websiteBookingRequestId: "wbr-old", linkedAt: "2025-02-01" }],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups?": { body: { data: [] } },
      // Bulk list does NOT contain wbr-old
      "/api/website-booking-requests?": { body: { data: [] } },
      // Individual fetch DOES return the booking
      "/api/website-booking-requests/wbr-old": { body: { data: { id: "wbr-old", crm_display_id: "BOR-AAB-001", first_name: "Bob", last_name: "Builder", origin_city: "Rome", destination_city: "Malta" } } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithLinkedBooking,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    expect(result.human.linkedWebsiteBookingRequests).toHaveLength(1);
    const enriched = (result.human.linkedWebsiteBookingRequests as Array<Record<string, unknown>>)[0];
    expect(enriched.displayId).toBe("BOR-AAB-001");
    expect(enriched.passengerName).toBe("Bob Builder");
    expect(enriched.originCity).toBe("Rome");
    expect(enriched.destinationCity).toBe("Malta");
  });

  it("enriches linkedWebsiteBookingRequests with matching booking data", async () => {
    const humanWithLinkedBooking = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [],
      linkedWebsiteBookingRequests: [{ id: "blink-1", websiteBookingRequestId: "wbr-1", linkedAt: "2025-01-01" }],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { body: { data: [] } },
      "/api/website-booking-requests": { body: { data: [{ id: "wbr-1", crm_display_id: "BOR-AAA-001", first_name: "Alice", last_name: "Jones", origin_city: "NYC", destination_city: "Paris" }] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithLinkedBooking,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    expect(result.human.linkedWebsiteBookingRequests).toHaveLength(1);
    const enriched = (result.human.linkedWebsiteBookingRequests as Array<Record<string, unknown>>)[0];
    expect(enriched.displayId).toBe("BOR-AAA-001");
    expect(enriched.passengerName).toBe("Alice Jones");
    expect(enriched.originCity).toBe("NYC");
    expect(enriched.destinationCity).toBe("Paris");
  });

  it("enriches linkedWebsiteBookingRequests with nulls when booking not found", async () => {
    const humanWithUnmatchedBooking = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [],
      linkedWebsiteBookingRequests: [{ id: "blink-1", websiteBookingRequestId: "wbr-missing", linkedAt: "2025-01-01" }],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { body: { data: [] } },
      "/api/website-booking-requests": { body: { data: [] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithUnmatchedBooking,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    const enriched = (result.human.linkedWebsiteBookingRequests as Array<Record<string, unknown>>)[0];
    expect(enriched.displayId).toBeNull();
    expect(enriched.passengerName).toBeNull();
    expect(enriched.originCity).toBeNull();
    expect(enriched.destinationCity).toBeNull();
  });

  it("returns empty arrays when fetchConfig endpoints return non-ok status", async () => {
    const humanWithNoLinks = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [],
      linkedWebsiteBookingRequests: [],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": { status: 500, body: { error: "Server error" } },
      "/api/route-signups": { body: { data: [] } },
      "/api/website-booking-requests": { body: { data: [] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithNoLinks,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    expect(result.emailLabelConfigs).toEqual([]);
    expect(result.phoneLabelConfigs).toEqual([]);
    expect(result.socialIdPlatformConfigs).toEqual([]);
    expect(result.accountHumanLabelConfigs).toEqual([]);
    expect(result.humanRelationshipLabelConfigs).toEqual([]);
  });

  it("returns empty arrays when fetchList endpoints return non-ok status", async () => {
    const humanWithNoLinks = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [],
      linkedWebsiteBookingRequests: [],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { status: 500, body: { error: "Server error" } },
      "/api/website-booking-requests": { status: 500, body: { error: "Server error" } },
      "/api/ui/dropdown-data": { status: 500, body: { error: "Server error" } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithNoLinks,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    expect(result.allRouteSignups).toEqual([]);
    expect(result.allBookingRequests).toEqual([]);
    expect(result.allAccounts).toEqual([]);
    expect(result.allDiscountCodes).toEqual([]);
    expect(result.allHumans).toEqual([]);
  });

  it("returns empty arrays when fetchConfig response has no data array", async () => {
    const humanWithNoLinks = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [],
      linkedWebsiteBookingRequests: [],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": { body: { items: [] } },
      "/api/route-signups": { body: { data: [] } },
      "/api/website-booking-requests": { body: { data: [] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithNoLinks,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    expect(result.emailLabelConfigs).toEqual([]);
    expect(result.phoneLabelConfigs).toEqual([]);
    expect(result.socialIdPlatformConfigs).toEqual([]);
  });

  it("returns empty arrays when fetchList response has no data array", async () => {
    const humanWithNoLinks = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [],
      linkedWebsiteBookingRequests: [],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { body: { items: [] } },
      "/api/website-booking-requests": { body: { items: [] } },
      "/api/ui/dropdown-data": { body: { items: [] } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithNoLinks,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    expect(result.allRouteSignups).toEqual([]);
    expect(result.allBookingRequests).toEqual([]);
    expect(result.allAccounts).toEqual([]);
  });

  it("returns socialIdPlatformConfigs from config fetch", async () => {
    const humanWithNoLinks = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [],
      linkedWebsiteBookingRequests: [],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [mockConfigItem({ id: "plat-1", name: "Instagram" })],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { body: { data: [] } },
      "/api/website-booking-requests": { body: { data: [] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithNoLinks,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    expect(result.socialIdPlatformConfigs).toEqual([expect.objectContaining({ id: "plat-1", name: "Instagram" })]);
  });

  it("produces null passengerName for route signup with no first or last name", async () => {
    const humanWithLinkedSignup = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [{ id: "link-1", routeSignupId: "rs-1", linkedAt: "2025-01-01" }],
      linkedWebsiteBookingRequests: [],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { body: { data: [{ id: "rs-1", display_id: null, first_name: null, last_name: null, origin: null, destination: null }] } },
      "/api/website-booking-requests": { body: { data: [] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithLinkedSignup,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    const enriched = (result.human.linkedRouteSignups as Array<Record<string, unknown>>)[0];
    expect(enriched.passengerName).toBeNull();
  });

  it("produces null passengerName for booking with no first or last name", async () => {
    const humanWithLinkedBooking = {
      id: "h-1",
      firstName: "Jane",
      lastName: "Doe",
      emails: [],
      phoneNumbers: [],
      pets: [],
      linkedRouteSignups: [],
      linkedWebsiteBookingRequests: [{ id: "blink-1", websiteBookingRequestId: "wbr-1", linkedAt: "2025-01-01" }],
    };

    const mockFetch = createMockFetch({
      "account-config/batch": mockBatchConfigResponse({
        "human-email-labels": [],
        "human-phone-labels": [],
        "social-id-platforms": [],
        "account-human-labels": [],
        "human-relationship-labels": [],
      }),
      "/api/route-signups": { body: { data: [] } },
      "/api/website-booking-requests": { body: { data: [{ id: "wbr-1", crm_display_id: null, first_name: null, last_name: null, origin_city: null, destination_city: null }] } },
      "/api/ui/dropdown-data": { body: { data: { accounts: [], humans: [], discountCodes: [] } } },
      "/api/humans/h-1/full": { body: { data: {
        human: humanWithLinkedBooking,
        activities: { data: [], meta: { page: 1, limit: 200, total: 0 } },
        opportunities: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        generalLeads: { data: [], meta: { page: 1, limit: 50, total: 0 } },
        relationships: [],
        agreements: { data: [], meta: { page: 1, limit: 50, total: 0 } },
      } } },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = makeEvent();
    event.params = { id: "h-1" };
    const result = await load(event as any);
    const enriched = (result.human.linkedWebsiteBookingRequests as Array<Record<string, unknown>>)[0];
    expect(enriched.passengerName).toBeNull();
  });
});
