import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import { mockEvent, createMockFetch } from "../../../../helpers";
import { load } from "../../../../../src/routes/reports/lead-scores/[id]/+page.server";

const sampleScore = {
  id: "sco-1",
  displayId: "SCO-AAA-001",
  scoreTotal: 85,
  scoreFit: 30,
  scoreIntent: 50,
  scoreEngagement: 15,
  scoreNegative: 10,
  fitMatchesCurrentWebsiteFlight: true,
  fitPriceAcknowledgedOk: false,
  intentDepositPaid: true,
  intentPaymentDetailsSent: false,
  intentRequestedPaymentDetails: false,
  intentBookingSubmitted: false,
  intentBookingStarted: false,
  intentRouteSignupSubmitted: false,
  engagementRespondedFast: true,
  engagementRespondedSlow: false,
  negativeNoContactMethod: false,
  negativeOffNetworkRequest: false,
  negativePriceObjection: true,
  negativeGhostedAfterPaymentSent: false,
  customerHasFlown: false,
  generalLeadId: "gl-1",
  websiteBookingRequestId: null,
  routeSignupId: null,
  createdAt: "2026-01-15T10:00:00.000Z",
  updatedAt: "2026-01-15T10:00:00.000Z",
};

describe("lead-score detail load", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch({
      "/api/lead-scores/sco-1": {
        body: { data: sampleScore },
      },
    });
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when user is null", async () => {
    const event = mockEvent({ user: null });
    event.params = { id: "sco-1" };
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });

  it("returns lead score on success with parent entity", async () => {
    mockFetch = createMockFetch({
      "/api/lead-scores/sco-1": {
        body: { data: sampleScore },
      },
      "/api/general-leads/gl-1": {
        body: { data: { id: "gl-1", firstName: "Jane", lastName: "Doe", status: "qualified", emails: [{ email: "jane@example.com" }], phoneNumbers: [{ phoneNumber: "+1234" }] } },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    event.params = { id: "sco-1" };
    const result = await load(event as any);
    expect(result.score).toEqual(sampleScore);
    expect(result.parentEntity).toMatchObject({
      type: "general_lead",
      firstName: "Jane",
      lastName: "Doe",
      status: "qualified",
    });
  });

  it("fetches parent general lead when generalLeadId is present", async () => {
    mockFetch = createMockFetch({
      "/api/lead-scores/sco-1": {
        body: { data: sampleScore },
      },
      "/api/general-leads/gl-1": {
        body: { data: { id: "gl-1", firstName: "Jane", lastName: "Doe", status: "qualified", emails: [{ email: "jane@example.com" }], phoneNumbers: [{ phoneNumber: "+1234" }] } },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    event.params = { id: "sco-1" };
    const result = await load(event as any);
    expect(result.parentEntity).toMatchObject({
      type: "general_lead",
      firstName: "Jane",
      lastName: "Doe",
    });
  });

  it("fetches parent booking request when websiteBookingRequestId is present", async () => {
    const bookingScore = {
      ...sampleScore,
      generalLeadId: null,
      websiteBookingRequestId: "b1",
      routeSignupId: null,
    };
    mockFetch = createMockFetch({
      "/api/lead-scores/sco-1": {
        body: { data: bookingScore },
      },
      "/api/website-booking-requests/b1": {
        body: { data: { id: "b1", first_name: "John", last_name: "Smith", client_email: "john@example.com", status: "confirmed" } },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    event.params = { id: "sco-1" };
    const result = await load(event as any);
    expect(result.parentEntity).toMatchObject({
      type: "website_booking_request",
      first_name: "John",
      last_name: "Smith",
    });
  });

  it("fetches parent route signup when routeSignupId is present", async () => {
    const signupScore = {
      ...sampleScore,
      generalLeadId: null,
      websiteBookingRequestId: null,
      routeSignupId: "rs-1",
    };
    mockFetch = createMockFetch({
      "/api/lead-scores/sco-1": {
        body: { data: signupScore },
      },
      "/api/route-signups/rs-1": {
        body: { data: { id: "rs-1", first_name: "Alice", last_name: "Jones", email: "alice@example.com", status: "new" } },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    event.params = { id: "sco-1" };
    const result = await load(event as any);
    expect(result.parentEntity).toMatchObject({
      type: "route_signup",
      first_name: "Alice",
      last_name: "Jones",
    });
  });

  it("returns null parentEntity when parent fetch fails", async () => {
    mockFetch = createMockFetch({
      "/api/lead-scores/sco-1": {
        body: { data: sampleScore },
      },
      "/api/general-leads/gl-1": {
        status: 404,
        body: { error: "not found" },
      },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    event.params = { id: "sco-1" };
    const result = await load(event as any);
    expect(result.score).toEqual(sampleScore);
    expect(result.parentEntity).toBeNull();
  });

  it("redirects to list when API returns error", async () => {
    mockFetch = createMockFetch({
      "/api/lead-scores/sco-1": { status: 404, body: {} },
    });
    vi.stubGlobal("fetch", mockFetch);

    const event = mockEvent();
    event.params = { id: "sco-1" };
    try {
      await load(event as any);
      expect.fail("should have redirected");
    } catch (e) {
      expect(isRedirect(e)).toBe(true);
    }
  });
});
