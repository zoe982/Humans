import { describe, it, expect } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getTestDb } from "../setup";
import { searchD1 } from "../../../src/services/search";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;
function nextDisplayId(prefix: string) {
  seedCounter++;
  return `${prefix}-${String(seedCounter).padStart(6, "0")}`;
}

async function seedColleague(db: ReturnType<typeof getTestDb>, id = "col-1") {
  const ts = now();
  await db.insert(schema.colleagues).values({
    id, displayId: nextDisplayId("COL"), email: `${id}@test.com`, firstName: "Test", lastName: "User",
    name: "Test User", role: "admin", isActive: true, createdAt: ts, updatedAt: ts,
  });
}

async function seedHuman(db: ReturnType<typeof getTestDb>, id = "h-1", first = "John", last = "Doe") {
  const ts = now();
  await db.insert(schema.humans).values({
    id, displayId: nextDisplayId("HUM"), firstName: first, lastName: last, status: "open", createdAt: ts, updatedAt: ts,
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
    await db.insert(schema.emails).values({
      id: "e-1", displayId: nextDisplayId("EML"), ownerType: "human", ownerId: "h-1", email: "alice@example.com", isPrimary: true, createdAt: ts,
    });

    const result = await searchD1(db, "alice@example");
    expect(result.matchedHumans).toHaveLength(1);
    expect(result.matchedHumans[0]!.emails).toHaveLength(1);
  });

  it("matches humans by phone number", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    const ts = now();
    await db.insert(schema.phones).values({
      id: "p-1", displayId: nextDisplayId("FON"), ownerType: "human", ownerId: "h-1", phoneNumber: "+15551234567", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    const result = await searchD1(db, "5551234");
    expect(result.matchedHumans).toHaveLength(1);
  });

  it("matches activities by subject", async () => {
    const db = getTestDb();
    await seedColleague(db);
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-1", displayId: nextDisplayId("ACT"), type: "email", subject: "Meeting about Paris trip",
      activityDate: ts, colleagueId: "col-1", createdAt: ts, updatedAt: ts,
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
      id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GEX"), humanId: "h-1", geoInterestId: "gi-1", createdAt: ts,
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
      id: "acc-1", displayId: nextDisplayId("ACC"), name: "Acme Corporation", status: "open", createdAt: ts, updatedAt: ts,
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
      id: "acc-1", displayId: nextDisplayId("ACC"), name: "Acme Corp", status: "open", createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.emails).values({
      id: "ae-1", displayId: nextDisplayId("EML"), ownerType: "account", ownerId: "acc-1", email: "info@acme.com", isPrimary: true, createdAt: ts,
    });

    const result = await searchD1(db, "acme.com");
    expect(result.matchedAccounts).toHaveLength(1);
  });

  it("deduplicates humans matched by multiple criteria", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    const ts = now();
    await db.insert(schema.emails).values({
      id: "e-1", displayId: nextDisplayId("EML"), ownerType: "human", ownerId: "h-1", email: "alice@smith.com", isPrimary: true, createdAt: ts,
    });

    // "Alice" matches firstName and "alice" matches email
    const result = await searchD1(db, "alice");
    expect(result.matchedHumans).toHaveLength(1);
  });

  it("matches activities by notes", async () => {
    const db = getTestDb();
    await seedColleague(db);
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-1", displayId: nextDisplayId("ACT"), type: "phone_call", subject: "Routine call",
      notes: "Discussed London relocation plans", activityDate: ts, colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    // Query matches notes but not subject
    const result = await searchD1(db, "London relocation");
    expect(result.activityResults).toHaveLength(1);
    expect(result.activityResults[0]!.notes).toContain("London relocation");
  });

  it("matches geo-interests by country", async () => {
    const db = getTestDb();
    const ts = now();
    await db.insert(schema.geoInterests).values({
      id: "gi-1", displayId: nextDisplayId("GEO"), city: "Valletta", country: "Malta", createdAt: ts,
    });

    // Query matches country but not city
    const result = await searchD1(db, "Malta");
    expect(result.geoInterestsWithCounts).toHaveLength(1);
    expect(result.geoInterestsWithCounts[0]!.country).toBe("Malta");
  });

  it("matches accounts by phone number", async () => {
    const db = getTestDb();
    const ts = now();
    await db.insert(schema.accounts).values({
      id: "acc-1", displayId: nextDisplayId("ACC"), name: "Acme Corp", status: "open", createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "p-1", displayId: nextDisplayId("FON"), ownerType: "account", ownerId: "acc-1",
      phoneNumber: "+44207000999", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    // Query matches account phone, not account name
    const result = await searchD1(db, "207000999");
    expect(result.matchedAccounts).toHaveLength(1);
    expect(result.matchedAccounts[0]!.id).toBe("acc-1");
  });

  it("returns geo-interest with zero expression count when no expressions exist", async () => {
    const db = getTestDb();
    const ts = now();
    await db.insert(schema.geoInterests).values({
      id: "gi-1", displayId: nextDisplayId("GEO"), city: "Berlin", country: "Germany", createdAt: ts,
    });

    // geoInterestResults.length > 0, so allExpressions is fetched, but it is empty
    const result = await searchD1(db, "Berlin");
    expect(result.geoInterestsWithCounts).toHaveLength(1);
    expect(result.geoInterestsWithCounts[0]!.expressionCount).toBe(0);
    expect(result.geoInterestsWithCounts[0]!.humanCount).toBe(0);
    // No humans linked via expressions
    expect(result.matchedHumans).toHaveLength(0);
  });

  it("falls back to typeId as name when account type config is missing", async () => {
    const db = getTestDb();
    const ts = now();
    await db.insert(schema.accounts).values({
      id: "acc-1", displayId: nextDisplayId("ACC"), name: "Mystery Corp", status: "open", createdAt: ts, updatedAt: ts,
    });
    // Insert a config row first to satisfy the FK, then delete it to simulate a missing config
    await db.insert(schema.accountTypesConfig).values({
      id: "orphan-type-id", name: "Orphan Type", createdAt: ts,
    });
    await db.insert(schema.accountTypes).values({
      id: "at-1", accountId: "acc-1", typeId: "orphan-type-id", createdAt: ts,
    });
    await db.run(sql`PRAGMA foreign_keys = OFF`);
    await db.delete(schema.accountTypesConfig).where(eq(schema.accountTypesConfig.id, "orphan-type-id"));
    await db.run(sql`PRAGMA foreign_keys = ON`);

    const result = await searchD1(db, "Mystery");
    expect(result.matchedAccounts).toHaveLength(1);
    expect(result.matchedAccounts[0]!.types).toHaveLength(1);
    // config is undefined so name falls back to typeId
    expect(result.matchedAccounts[0]!.types[0]!.name).toBe("orphan-type-id");
  });

  it("counts distinct humans across multiple geo-interest expressions", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "Chen");
    await seedHuman(db, "h-2", "Dave", "Diaz");
    const ts = now();
    await db.insert(schema.geoInterests).values({
      id: "gi-1", displayId: nextDisplayId("GEO"), city: "Tokyo", country: "Japan", createdAt: ts,
    });
    // Two different humans, same geo-interest
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GEX"), humanId: "h-1", geoInterestId: "gi-1", createdAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-2", displayId: nextDisplayId("GEX"), humanId: "h-2", geoInterestId: "gi-1", createdAt: ts,
    });

    const result = await searchD1(db, "Tokyo");
    expect(result.geoInterestsWithCounts).toHaveLength(1);
    expect(result.geoInterestsWithCounts[0]!.expressionCount).toBe(2);
    expect(result.geoInterestsWithCounts[0]!.humanCount).toBe(2);
    // Both humans are returned via the expression linkage
    expect(result.matchedHumans).toHaveLength(2);
  });
});
