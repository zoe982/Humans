import { describe, it, expect } from "vitest";
import {
  activityListItemSchema,
  activityDetailSchema,
  type ActivityListItem,
  type ActivityDetail,
} from "./activities";

const validActivityBase = {
  id: "act-1",
  displayId: "ACT-AAA-001",
  type: "email",
  subject: "Follow up",
  body: null,
  notes: null,
  activityDate: "2024-01-15T10:00:00.000Z",
  humanId: "h-1",
  accountId: null,
  routeSignupId: null,
  websiteBookingRequestId: null,
  opportunityId: null,
  generalLeadId: null,
  gmailId: null,
  frontId: null,
  frontConversationId: null,
  frontContactHandle: null,
  direction: null,
  syncRunId: null,
  senderName: null,
  colleagueId: null,
  createdAt: "2024-01-15T10:00:00.000Z",
  updatedAt: "2024-01-15T10:00:00.000Z",
  humanName: "Alice Smith",
  humanDisplayId: "HUM-AAA-001",
  accountName: null,
  ownerId: null,
  ownerName: null,
  ownerDisplayId: null,
};

describe("activityListItemSchema", () => {
  it("accepts valid activity list item", () => {
    const result: ActivityListItem = activityListItemSchema.parse(validActivityBase);
    expect(result.type).toBe("email");
    expect(result.humanName).toBe("Alice Smith");
  });

  it("accepts activity with linked entities", () => {
    const result: ActivityListItem = activityListItemSchema.parse({
      ...validActivityBase,
      geoInterestExpressions: [{ id: "gex-1", activityId: "act-1", humanId: null, geoInterestId: "geo-1", createdAt: "2024-01-01T00:00:00.000Z", city: "London", country: "UK" }],
      routeInterestExpressions: [],
      linkedOpportunities: [],
    });
    expect(result.geoInterestExpressions).toHaveLength(1);
    const firstGeoExpr = result.geoInterestExpressions?.[0];
    expect(firstGeoExpr).toBeDefined();
    expect(firstGeoExpr?.city).toBe("London");
  });

  it("rejects missing required fields", () => {
    expect(() => activityListItemSchema.parse({ id: "act-1" })).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result: ActivityListItem = activityListItemSchema.parse({ ...validActivityBase, futureField: true });
    expect(result["futureField"]).toBe(true);
  });
});

describe("activityDetailSchema", () => {
  const validDetail = {
    ...validActivityBase,
    geoInterestExpressions: [],
    routeInterestExpressions: [],
    linkedOpportunities: [],
  };

  it("accepts valid activity detail", () => {
    const result: ActivityDetail = activityDetailSchema.parse(validDetail);
    expect(result.geoInterestExpressions).toStrictEqual([]);
    expect(result.linkedOpportunities).toStrictEqual([]);
  });

  it("rejects missing geoInterestExpressions", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { geoInterestExpressions: _, ...noGeo } = validDetail;
    expect(() => activityDetailSchema.parse(noGeo)).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result: ActivityDetail = activityDetailSchema.parse({ ...validDetail, futureField: true });
    expect(result["futureField"]).toBe(true);
  });
});
