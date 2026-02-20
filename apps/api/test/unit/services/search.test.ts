import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import { searchD1 } from "../../../src/services/search";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

async function seedColleague(db: ReturnType<typeof getTestDb>, id = "col-1") {
  const ts = now();
  await db.insert(schema.colleagues).values({
    id, email: `${id}@test.com`, firstName: "Test", lastName: "User",
    name: "Test User", role: "admin", isActive: true, createdAt: ts, updatedAt: ts,
  });
}

async function seedHuman(db: ReturnType<typeof getTestDb>, id = "h-1", first = "John", last = "Doe") {
  const ts = now();
  await db.insert(schema.humans).values({
    id, firstName: first, lastName: last, status: "open", createdAt: ts, updatedAt: ts,
  });
}

describe("searchD1", () => {
  it("returns empty results when no data matches", async () => {
    const db = getTestDb();
    const result = await searchD1(db, "nonexistent");
    expect(result.matchedHumans).toHaveLength(0);
    expect(result.activityResults).toHaveLength(0);
    expect(result.geoInterestsWithCounts).toHaveLength(0);
    expect(result.matchedAccounts).toHaveLength(0);
  });

  it("matches humans by firstName", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    const result = await searchD1(db, "Alice");
    expect(result.matchedHumans).toHaveLength(1);
    expect(result.matchedHumans[0]!.firstName).toBe("Alice");
  });

  it("matches humans by lastName", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smithson");

    const result = await searchD1(db, "Smithson");
    expect(result.matchedHumans).toHaveLength(1);
  });

  it("matches humans by email", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    const ts = now();
    await db.insert(schema.humanEmails).values({
      id: "e-1", humanId: "h-1", email: "alice@example.com", isPrimary: true, createdAt: ts,
    });

    const result = await searchD1(db, "alice@example");
    expect(result.matchedHumans).toHaveLength(1);
    expect(result.matchedHumans[0]!.emails).toHaveLength(1);
  });

  it("matches humans by phone number", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    const ts = now();
    await db.insert(schema.humanPhoneNumbers).values({
      id: "p-1", humanId: "h-1", phoneNumber: "+15551234567", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    const result = await searchD1(db, "5551234");
    expect(result.matchedHumans).toHaveLength(1);
  });

  it("matches activities by subject", async () => {
    const db = getTestDb();
    await seedColleague(db);
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-1", type: "email", subject: "Meeting about Paris trip",
      activityDate: ts, createdByColleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    const result = await searchD1(db, "Paris");
    expect(result.activityResults).toHaveLength(1);
    expect(result.activityResults[0]!.subject).toContain("Paris");
  });

  it("matches geo-interests by city with expression counts", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    const ts = now();
    await db.insert(schema.geoInterests).values({
      id: "gi-1", city: "Paris", country: "France", createdAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", humanId: "h-1", geoInterestId: "gi-1", createdAt: ts,
    });

    const result = await searchD1(db, "Paris");
    expect(result.geoInterestsWithCounts).toHaveLength(1);
    expect(result.geoInterestsWithCounts[0]!.expressionCount).toBe(1);
    expect(result.geoInterestsWithCounts[0]!.humanCount).toBe(1);
    // Also returns the human linked via geo-interest expression
    expect(result.matchedHumans).toHaveLength(1);
  });

  it("matches accounts by name with types", async () => {
    const db = getTestDb();
    const ts = now();
    await db.insert(schema.accounts).values({
      id: "acc-1", name: "Acme Corporation", status: "open", createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.accountTypesConfig).values({
      id: "atc-1", name: "Airline", createdAt: ts,
    });
    await db.insert(schema.accountTypes).values({
      id: "at-1", accountId: "acc-1", typeId: "atc-1", createdAt: ts,
    });

    const result = await searchD1(db, "Acme");
    expect(result.matchedAccounts).toHaveLength(1);
    expect(result.matchedAccounts[0]!.name).toBe("Acme Corporation");
    expect(result.matchedAccounts[0]!.types).toHaveLength(1);
    expect(result.matchedAccounts[0]!.types[0]!.name).toBe("Airline");
  });

  it("matches accounts by email", async () => {
    const db = getTestDb();
    const ts = now();
    await db.insert(schema.accounts).values({
      id: "acc-1", name: "Acme Corp", status: "open", createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.accountEmails).values({
      id: "ae-1", accountId: "acc-1", email: "info@acme.com", isPrimary: true, createdAt: ts,
    });

    const result = await searchD1(db, "acme.com");
    expect(result.matchedAccounts).toHaveLength(1);
  });

  it("deduplicates humans matched by multiple criteria", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    const ts = now();
    await db.insert(schema.humanEmails).values({
      id: "e-1", humanId: "h-1", email: "alice@smith.com", isPrimary: true, createdAt: ts,
    });

    // "Alice" matches firstName and "alice" matches email
    const result = await searchD1(db, "alice");
    expect(result.matchedHumans).toHaveLength(1);
  });
});
