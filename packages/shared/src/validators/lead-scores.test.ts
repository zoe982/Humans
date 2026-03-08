import { describe, it, expect } from "vitest";
import {
  updateLeadScoreFlagsSchema,
  ensureLeadScoreSchema,
  getLeadScoreBand,
  leadScoreParentTypes,
} from "./lead-scores";

describe("leadScoreParentTypes", () => {
  it("contains all expected parent types", () => {
    expect(leadScoreParentTypes).toContain("general_lead");
    expect(leadScoreParentTypes).toContain("website_booking_request");
    expect(leadScoreParentTypes).toContain("route_signup");
    expect(leadScoreParentTypes).toContain("evacuation_lead");
    expect(leadScoreParentTypes).toHaveLength(4);
  });
});

describe("getLeadScoreBand", () => {
  it("returns 'hot' for scores 75–100", () => {
    expect(getLeadScoreBand(75)).toBe("hot");
    expect(getLeadScoreBand(100)).toBe("hot");
    expect(getLeadScoreBand(90)).toBe("hot");
  });

  it("returns 'warm' for scores 50–74", () => {
    expect(getLeadScoreBand(50)).toBe("warm");
    expect(getLeadScoreBand(74)).toBe("warm");
    expect(getLeadScoreBand(60)).toBe("warm");
  });

  it("returns 'cold' for scores 0–49", () => {
    expect(getLeadScoreBand(0)).toBe("cold");
    expect(getLeadScoreBand(49)).toBe("cold");
    expect(getLeadScoreBand(25)).toBe("cold");
  });

  it("returns 'cold' for edge case 0", () => {
    expect(getLeadScoreBand(0)).toBe("cold");
  });

  it("returns 'hot' for edge case 100", () => {
    expect(getLeadScoreBand(100)).toBe("hot");
  });
});

describe("updateLeadScoreFlagsSchema", () => {
  it("accepts empty object (no flags changed)", () => {
    const result = updateLeadScoreFlagsSchema.parse({});
    expect(result).toStrictEqual({});
  });

  it("accepts a single fit flag", () => {
    const result = updateLeadScoreFlagsSchema.parse({
      fitMatchesCurrentWebsiteFlight: true,
    });
    expect(result.fitMatchesCurrentWebsiteFlight).toBe(true);
  });

  it("accepts all boolean flags", () => {
    const allFlags = {
      fitMatchesCurrentWebsiteFlight: true,
      fitPriceAcknowledgedOk: false,
      intentDepositPaid: true,
      intentPaymentDetailsSent: false,
      intentRequestedPaymentDetails: true,
      intentBookingSubmitted: false,
      intentBookingStarted: true,
      intentRouteSignupSubmitted: false,
      engagementRespondedFast: true,
      engagementRespondedSlow: false,
      negativeNoContactMethod: true,
      negativeOffNetworkRequest: false,
      negativePriceObjection: true,
      negativeGhostedAfterPaymentSent: false,
      customerHasFlown: true,
    };
    const result = updateLeadScoreFlagsSchema.parse(allFlags);
    expect(result).toStrictEqual(allFlags);
  });

  it("rejects non-boolean values for flags", () => {
    expect(() =>
      updateLeadScoreFlagsSchema.parse({ fitMatchesCurrentWebsiteFlight: "yes" })
    ).toThrowError();
  });

  it("rejects unknown keys", () => {
    expect(() =>
      updateLeadScoreFlagsSchema.parse({ unknownFlag: true })
    ).toThrowError();
  });
});

describe("ensureLeadScoreSchema", () => {
  it("accepts valid parentType and parentId", () => {
    const result = ensureLeadScoreSchema.parse({
      parentType: "general_lead",
      parentId: "gl-123",
    });
    expect(result.parentType).toBe("general_lead");
    expect(result.parentId).toBe("gl-123");
  });

  it("accepts all valid parent types", () => {
    for (const parentType of leadScoreParentTypes) {
      const result = ensureLeadScoreSchema.parse({
        parentType,
        parentId: "id-1",
      });
      expect(result.parentType).toBe(parentType);
    }
  });

  it("rejects invalid parentType", () => {
    expect(() =>
      ensureLeadScoreSchema.parse({ parentType: "invalid", parentId: "id-1" })
    ).toThrowError();
  });

  it("rejects missing parentId", () => {
    expect(() =>
      ensureLeadScoreSchema.parse({ parentType: "general_lead" })
    ).toThrowError();
  });

  it("rejects empty parentId", () => {
    expect(() =>
      ensureLeadScoreSchema.parse({ parentType: "general_lead", parentId: "" })
    ).toThrowError();
  });

  it("rejects missing parentType", () => {
    expect(() =>
      ensureLeadScoreSchema.parse({ parentId: "id-1" })
    ).toThrowError();
  });
});
