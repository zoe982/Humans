import { describe, it, expect } from "vitest";
import {
  opportunityListItemSchema,
  opportunityDetailSchema,
  type OpportunityListItem,
  type OpportunityDetail,
} from "./opportunities";

describe("opportunityListItemSchema", () => {
  const validListItem = {
    id: "opp-1",
    displayId: "OPP-AAA-001",
    stage: "open",
    seatsRequested: 2,
    passengerSeats: 2,
    petSeats: 1,
    notes: null,
    lossReason: null,
    ownerId: null,
    nextActionOwnerId: null,
    nextActionDescription: null,
    nextActionType: null,
    nextActionStartDate: null,
    nextActionDueDate: null,
    nextActionCompletedAt: null,
    nextActionCadenceNote: null,
    flightId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    primaryHuman: null,
    primaryHumanName: null,
    nextActionOwnerName: null,
    ownerName: null,
    ownerDisplayId: null,
    isOverdue: false,
  };

  it("accepts valid opportunity list item", () => {
    const result: OpportunityListItem = opportunityListItemSchema.parse(validListItem);
    expect(result.stage).toBe("open");
    expect(result.isOverdue).toBe(false);
  });

  it("accepts opportunity with primary human", () => {
    const result: OpportunityListItem = opportunityListItemSchema.parse({
      ...validListItem,
      primaryHuman: { id: "h-1", displayId: "HUM-AAA-001", firstName: "Alice", lastName: "Smith" },
      primaryHumanName: "Alice Smith",
    });
    expect(result.primaryHuman).toStrictEqual({ id: "h-1", displayId: "HUM-AAA-001", firstName: "Alice", lastName: "Smith" });
  });

  it("rejects missing required fields", () => {
    expect(() => opportunityListItemSchema.parse({ id: "opp-1" })).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result: OpportunityListItem = opportunityListItemSchema.parse({ ...validListItem, futureField: true });
    expect(result["futureField"]).toBe(true);
  });
});

describe("opportunityDetailSchema", () => {
  const validDetail = {
    id: "opp-1",
    displayId: "OPP-AAA-001",
    stage: "open",
    seatsRequested: 2,
    passengerSeats: 2,
    petSeats: 1,
    notes: null,
    lossReason: null,
    ownerId: null,
    nextActionOwnerId: null,
    nextActionDescription: null,
    nextActionType: null,
    nextActionStartDate: null,
    nextActionDueDate: null,
    nextActionCompletedAt: null,
    nextActionCadenceNote: null,
    flightId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    linkedHumans: [],
    linkedPets: [],
    linkedBookingRequests: [],
    activities: [],
    nextActionOwnerName: null,
    ownerName: null,
    ownerDisplayId: null,
    isOverdue: false,
  };

  it("accepts valid opportunity detail", () => {
    const result: OpportunityDetail = opportunityDetailSchema.parse(validDetail);
    expect(result.linkedHumans).toStrictEqual([]);
    expect(result.linkedPets).toStrictEqual([]);
  });

  it("rejects missing nested arrays", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { linkedHumans: _, ...noLinked } = validDetail;
    expect(() => opportunityDetailSchema.parse(noLinked)).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result: OpportunityDetail = opportunityDetailSchema.parse({ ...validDetail, futureField: true });
    expect(result["futureField"]).toBe(true);
  });
});
