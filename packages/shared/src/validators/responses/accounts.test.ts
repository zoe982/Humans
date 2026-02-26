import { describe, it, expect } from "vitest";
import {
  accountListItemSchema,
  accountDetailSchema,
  type AccountListItem,
  type AccountDetail,
} from "./accounts";

describe("accountListItemSchema", () => {
  const validListItem = {
    id: "acc-1",
    displayId: "ACC-AAA-001",
    name: "Acme Corp",
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    types: [],
  };

  it("accepts valid account list item", () => {
    const result: AccountListItem = accountListItemSchema.parse(validListItem);
    expect(result.name).toBe("Acme Corp");
    expect(result.types).toStrictEqual([]);
  });

  it("accepts account with types", () => {
    const result: AccountListItem = accountListItemSchema.parse({
      ...validListItem,
      types: [{ id: "t-1", name: "Partner" }],
    });
    expect(result.types).toHaveLength(1);
    const firstType = result.types[0];
    expect(firstType).toBeDefined();
    expect(firstType?.name).toBe("Partner");
  });

  it("rejects missing required fields", () => {
    expect(() => accountListItemSchema.parse({ id: "acc-1" })).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result: AccountListItem = accountListItemSchema.parse({ ...validListItem, futureField: 42 });
    expect(result["futureField"]).toBe(42);
  });
});

describe("accountDetailSchema", () => {
  const validDetail = {
    id: "acc-1",
    displayId: "ACC-AAA-001",
    name: "Acme Corp",
    status: "active",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    types: [],
    linkedHumans: [],
    emails: [],
    phoneNumbers: [],
    activities: [],
    socialIds: [],
    websites: [],
    referralCodes: [],
    discountCodes: [],
  };

  it("accepts valid account detail", () => {
    const result: AccountDetail = accountDetailSchema.parse(validDetail);
    expect(result.linkedHumans).toStrictEqual([]);
    expect(result.emails).toStrictEqual([]);
  });

  it("rejects missing nested arrays", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { linkedHumans: _, ...noLinked } = validDetail;
    expect(() => accountDetailSchema.parse(noLinked)).toThrowError();
  });

  it("allows extra fields via passthrough", () => {
    const result: AccountDetail = accountDetailSchema.parse({ ...validDetail, futureField: true });
    expect(result["futureField"]).toBe(true);
  });
});
