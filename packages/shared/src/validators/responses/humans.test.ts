import { describe, it, expect } from "vitest";
import {
  humanListItemSchema,
  humanDetailSchema,
  emailResponseSchema,
  type EmailResponse,
  type HumanListItem,
  type HumanDetail,
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
    const result: EmailResponse = emailResponseSchema.parse(validEmail);
    expect(result.email).toBe("test@example.com");
    expect(result.isPrimary).toBe(true);
  });

  it("rejects missing email field", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { email: _, ...noEmail } = validEmail;
    expect(() => emailResponseSchema.parse(noEmail)).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result: EmailResponse = emailResponseSchema.parse({ ...validEmail, labelName: "Work" });
    expect(result["labelName"]).toBe("Work");
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
    const result: HumanListItem = humanListItemSchema.parse(validListItem);
    expect(result.firstName).toBe("Alice");
    expect(result.emails).toStrictEqual([]);
    expect(result.types).toStrictEqual([]);
  });

  it("accepts list item with emails and types", () => {
    const result: HumanListItem = humanListItemSchema.parse({
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
      types: [{ id: "ht_client", name: "Client" }, { id: "ht_partner", name: "Partner" }],
    });
    expect(result.emails).toHaveLength(1);
    const firstEmail = result.emails[0];
    expect(firstEmail).toBeDefined();
    expect(firstEmail?.email).toBe("test@example.com");
    expect(result.types).toStrictEqual([{ id: "ht_client", name: "Client" }, { id: "ht_partner", name: "Partner" }]);
  });

  it("rejects missing required fields", () => {
    expect(() => humanListItemSchema.parse({ id: "h-1" })).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result: HumanListItem = humanListItemSchema.parse({ ...validListItem, futureField: "ok" });
    expect(result["futureField"]).toBe("ok");
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
    const result: HumanDetail = humanDetailSchema.parse(validDetail);
    expect(result.firstName).toBe("Alice");
    expect(result.phoneNumbers).toStrictEqual([]);
  });

  it("rejects missing nested arrays", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { phoneNumbers: _, ...noPhones } = validDetail;
    expect(() => humanDetailSchema.parse(noPhones)).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result: HumanDetail = humanDetailSchema.parse({ ...validDetail, futureField: "ok" });
    expect(result["futureField"]).toBe("ok");
  });
});
