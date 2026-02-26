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

  it("returns lead score on success", async () => {
    const event = mockEvent();
    event.params = { id: "sco-1" };
    const result = await load(event as any);
    expect(result.score).toEqual(sampleScore);
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
