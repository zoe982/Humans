import { describe, it, expect } from "vitest";
import {
  humanListItemSchema,
  humanDetailSchema,
  emailResponseSchema,
} from "./humans";

describe("emailResponseSchema", () => {
  const validEmail = {
    id: "eml-1",
    displayId: "EML-AAA-001",
    humanId: "h-1",
    accountId: null,
    generalLeadId: null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    email: "test@example.com",
    labelId: null,
    isPrimary: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  it("accepts valid email response", () => {
    const result = emailResponseSchema.parse(validEmail);
    expect(result.email).toBe("test@example.com");
    expect(result.isPrimary).toBe(true);
  });

  it("rejects missing email field", () => {
    const { email: _, ...noEmail } = validEmail;
    expect(() => emailResponseSchema.parse(noEmail)).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result = emailResponseSchema.parse({ ...validEmail, labelName: "Work" });
    expect((result as Record<string, unknown>).labelName).toBe("Work");
  });
});

describe("humanListItemSchema", () => {
  const validListItem = {
    id: "h-1",
    displayId: "HUM-AAA-001",
    firstName: "Alice",
    middleName: null,
    lastName: "Smith",
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    emails: [],
    types: [],
  };

  it("accepts valid human list item", () => {
    const result = humanListItemSchema.parse(validListItem);
    expect(result.firstName).toBe("Alice");
    expect(result.emails).toStrictEqual([]);
    expect(result.types).toStrictEqual([]);
  });

  it("accepts list item with emails and types", () => {
    const result = humanListItemSchema.parse({
      ...validListItem,
      emails: [{
        id: "eml-1",
        displayId: "EML-AAA-001",
        humanId: "h-1",
        accountId: null,
        generalLeadId: null,
        websiteBookingRequestId: null,
        routeSignupId: null,
        email: "test@example.com",
        labelId: null,
        isPrimary: true,
        createdAt: "2024-01-01T00:00:00.000Z",
      }],
      types: ["client", "partner"],
    });
    expect(result.emails).toHaveLength(1);
    expect(result.emails[0].email).toBe("test@example.com");
    expect(result.types).toStrictEqual(["client", "partner"]);
  });

  it("rejects missing required fields", () => {
    expect(() => humanListItemSchema.parse({ id: "h-1" })).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result = humanListItemSchema.parse({ ...validListItem, futureField: "ok" });
    expect((result as Record<string, unknown>).futureField).toBe("ok");
  });
});

describe("humanDetailSchema", () => {
  const validDetail = {
    id: "h-1",
    displayId: "HUM-AAA-001",
    firstName: "Alice",
    middleName: null,
    lastName: "Smith",
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    emails: [],
    types: [],
    phoneNumbers: [],
    pets: [],
    linkedRouteSignups: [],
    linkedWebsiteBookingRequests: [],
    geoInterestExpressions: [],
    routeInterestExpressions: [],
    linkedAccounts: [],
    socialIds: [],
    websites: [],
    referralCodes: [],
    discountCodes: [],
  };

  it("accepts valid human detail", () => {
    const result = humanDetailSchema.parse(validDetail);
    expect(result.firstName).toBe("Alice");
    expect(result.phoneNumbers).toStrictEqual([]);
  });

  it("rejects missing nested arrays", () => {
    const { phoneNumbers: _, ...noPhones } = validDetail;
    expect(() => humanDetailSchema.parse(noPhones)).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result = humanDetailSchema.parse({ ...validDetail, futureField: "ok" });
    expect((result as Record<string, unknown>).futureField).toBe("ok");
  });
});
