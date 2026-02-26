import { describe, it, expect } from "vitest";
import {
  generalLeadListItemSchema,
  generalLeadDetailSchema,
  type GeneralLeadListItem,
  type GeneralLeadDetail,
} from "./general-leads";

describe("generalLeadListItemSchema", () => {
  const validListItem = {
    id: "gl-1",
    displayId: "LEA-AAA-001",
    status: "open",
    firstName: "Bob",
    middleName: null,
    lastName: "Jones",
    notes: null,
    rejectReason: null,
    convertedHumanId: null,
    ownerId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ownerName: null,
    convertedHumanDisplayId: null,
    convertedHumanName: null,
  };

  it("accepts valid general lead list item", () => {
    const result: GeneralLeadListItem = generalLeadListItemSchema.parse(validListItem);
    expect(result.firstName).toBe("Bob");
    expect(result.status).toBe("open");
  });

  it("accepts lead with converted human info", () => {
    const result: GeneralLeadListItem = generalLeadListItemSchema.parse({
      ...validListItem,
      status: "closed_converted",
      convertedHumanId: "h-1",
      convertedHumanDisplayId: "HUM-AAA-001",
      convertedHumanName: "Bob Jones",
    });
    expect(result.convertedHumanName).toBe("Bob Jones");
  });

  it("rejects missing required fields", () => {
    expect(() => generalLeadListItemSchema.parse({ id: "gl-1" })).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result: GeneralLeadListItem = generalLeadListItemSchema.parse({ ...validListItem, futureField: true });
    expect(result["futureField"]).toBe(true);
  });
});

describe("generalLeadDetailSchema", () => {
  const validDetail = {
    id: "gl-1",
    displayId: "LEA-AAA-001",
    status: "open",
    firstName: "Bob",
    middleName: null,
    lastName: "Jones",
    notes: null,
    rejectReason: null,
    convertedHumanId: null,
    ownerId: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ownerName: null,
    convertedHumanDisplayId: null,
    convertedHumanName: null,
    activities: [],
    emails: [],
    phoneNumbers: [],
  };

  it("accepts valid general lead detail", () => {
    const result: GeneralLeadDetail = generalLeadDetailSchema.parse(validDetail);
    expect(result.activities).toStrictEqual([]);
    expect(result.emails).toStrictEqual([]);
  });

  it("rejects missing nested arrays", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { emails: _, ...noEmails } = validDetail;
    expect(() => generalLeadDetailSchema.parse(noEmails)).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result: GeneralLeadDetail = generalLeadDetailSchema.parse({ ...validDetail, futureField: true });
    expect(result["futureField"]).toBe(true);
  });
});
