import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listGeoInterests,
  searchGeoInterests,
  getGeoInterestDetail,
  createGeoInterest,
  deleteGeoInterest,
  listExpressions,
  createExpression,
  updateExpression,
  deleteExpression,
} from "../../../src/services/geo-interests";
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
    id,
    displayId: nextDisplayId("COL"),
    email: `${id}@test.com`,
    firstName: "Test",
    lastName: "User",
    name: "Test User",
    role: "admin",
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedHuman(db: ReturnType<typeof getTestDb>, id = "h-1", first = "John", last = "Doe") {
  const ts = now();
  await db.insert(schema.humans).values({
    id,
    displayId: nextDisplayId("HUM"),
    firstName: first,
    lastName: last,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

// ---------------------------------------------------------------------------
// listGeoInterests
// ---------------------------------------------------------------------------

describe("listGeoInterests", () => {
  it("returns empty list when no geo-interests", async () => {
    const db = getTestDb();
    const result = await listGeoInterests(db);
    expect(result).toHaveLength(0);
  });

  it("returns geo-interests with human and expression counts", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await db.insert(schema.geoInterests).values({ id: "gi-2", displayId: nextDisplayId("GEO"), city: "London", country: "UK", createdAt: ts });

    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", createdAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-2", displayId: nextDisplayId("GIE"), humanId: "h-2", geoInterestId: "gi-1", createdAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-3", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", createdAt: ts,
    });

    const result = await listGeoInterests(db);
    expect(result).toHaveLength(2);

    const paris = result.find((gi) => gi.id === "gi-1");
    expect(paris?.humanCount).toBe(2);
    expect(paris?.expressionCount).toBe(3);

    const london = result.find((gi) => gi.id === "gi-2");
    expect(london?.humanCount).toBe(0);
    expect(london?.expressionCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// searchGeoInterests
// ---------------------------------------------------------------------------

describe("searchGeoInterests", () => {
  it("returns empty array for empty query", async () => {
    const db = getTestDb();
    const result = await searchGeoInterests(db, "");
    expect(result).toEqual([]);
  });

  it("returns matching geo-interests by city or country", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await db.insert(schema.geoInterests).values({ id: "gi-2", displayId: nextDisplayId("GEO"), city: "London", country: "UK", createdAt: ts });
    await db.insert(schema.geoInterests).values({ id: "gi-3", displayId: nextDisplayId("GEO"), city: "Lyon", country: "France", createdAt: ts });

    const byCity = await searchGeoInterests(db, "Paris");
    expect(byCity).toHaveLength(1);
    expect(byCity[0]!.id).toBe("gi-1");

    const byCountry = await searchGeoInterests(db, "France");
    expect(byCountry).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getGeoInterestDetail
// ---------------------------------------------------------------------------

describe("getGeoInterestDetail", () => {
  it("throws notFound for missing geo-interest", async () => {
    const db = getTestDb();
    await expect(getGeoInterestDetail(db, "nonexistent")).rejects.toThrowError("Geo-interest not found");
  });

  it("returns geo-interest with enriched expressions", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await seedHuman(db, "h-1", "Jane", "Doe");
    await seedColleague(db);

    await db.insert(schema.activities).values({
      id: "act-1", displayId: nextDisplayId("ACT"), type: "email", subject: "Paris trip", activityDate: ts,
      colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", activityId: "act-1", notes: "Loves Paris", createdAt: ts,
    });

    const result = await getGeoInterestDetail(db, "gi-1");
    expect(result.city).toBe("Paris");
    expect(result.country).toBe("France");
    expect(result.expressions).toHaveLength(1);
    expect(result.expressions[0]!.humanName).toBe("Jane Doe");
    expect(result.expressions[0]!.activitySubject).toBe("Paris trip");
  });
});

// ---------------------------------------------------------------------------
// createGeoInterest
// ---------------------------------------------------------------------------

describe("createGeoInterest", () => {
  it("creates a new geo-interest", async () => {
    const db = getTestDb();
    const result = await createGeoInterest(db, { city: "Berlin", country: "Germany" });

    expect(result.created).toBe(true);
    expect(result.data.city).toBe("Berlin");
    expect(result.data.country).toBe("Germany");
    expect(result.data.id).toBeDefined();

    const all = await db.select().from(schema.geoInterests);
    expect(all).toHaveLength(1);
  });

  it("returns existing geo-interest for same city+country (idempotent)", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Berlin", country: "Germany", createdAt: ts });

    const result = await createGeoInterest(db, { city: "Berlin", country: "Germany" });
    expect(result.created).toBe(false);
    expect(result.data.id).toBe("gi-1");

    const all = await db.select().from(schema.geoInterests);
    expect(all).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// deleteGeoInterest
// ---------------------------------------------------------------------------

describe("deleteGeoInterest", () => {
  it("throws notFound for missing geo-interest", async () => {
    const db = getTestDb();
    await expect(deleteGeoInterest(db, "nonexistent")).rejects.toThrowError("Geo-interest not found");
  });

  it("deletes geo-interest and cascades expressions", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await seedHuman(db, "h-1");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", createdAt: ts,
    });

    await deleteGeoInterest(db, "gi-1");

    expect(await db.select().from(schema.geoInterests)).toHaveLength(0);
    expect(await db.select().from(schema.geoInterestExpressions)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// listExpressions
// ---------------------------------------------------------------------------

describe("listExpressions", () => {
  it("returns all expressions when no filters", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await seedHuman(db, "h-1", "Alice", "Smith");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", createdAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-2", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", createdAt: ts,
    });

    const result = await listExpressions(db, {});
    expect(result).toHaveLength(2);
  });

  it("filters by humanId", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", createdAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-2", displayId: nextDisplayId("GIE"), humanId: "h-2", geoInterestId: "gi-1", createdAt: ts,
    });

    const result = await listExpressions(db, { humanId: "h-1" });
    expect(result).toHaveLength(1);
    expect(result[0]!.humanId).toBe("h-1");
  });

  it("filters by geoInterestId", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await db.insert(schema.geoInterests).values({ id: "gi-2", displayId: nextDisplayId("GEO"), city: "London", country: "UK", createdAt: ts });
    await seedHuman(db, "h-1");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", createdAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-2", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-2", createdAt: ts,
    });

    const result = await listExpressions(db, { geoInterestId: "gi-2" });
    expect(result).toHaveLength(1);
    expect(result[0]!.geoInterestId).toBe("gi-2");
  });

  it("enriches expressions with human, geo-interest, and activity data", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Tokyo", country: "Japan", createdAt: ts });
    await seedHuman(db, "h-1", "Jane", "Doe");
    await seedColleague(db);

    await db.insert(schema.activities).values({
      id: "act-1", displayId: nextDisplayId("ACT"), type: "email", subject: "Tokyo inquiry", activityDate: ts,
      colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", activityId: "act-1", createdAt: ts,
    });

    const result = await listExpressions(db, {});
    expect(result).toHaveLength(1);
    expect(result[0]!.humanName).toBe("Jane Doe");
    expect(result[0]!.city).toBe("Tokyo");
    expect(result[0]!.country).toBe("Japan");
    expect(result[0]!.activitySubject).toBe("Tokyo inquiry");
  });
});

// ---------------------------------------------------------------------------
// createExpression
// ---------------------------------------------------------------------------

describe("createExpression", () => {
  it("creates expression with existing geoInterestId", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await seedHuman(db, "h-1");

    const result = await createExpression(db, { humanId: "h-1", geoInterestId: "gi-1" });
    expect(result.humanId).toBe("h-1");
    expect(result.geoInterestId).toBe("gi-1");
    expect(result.id).toBeDefined();

    const expressions = await db.select().from(schema.geoInterestExpressions);
    expect(expressions).toHaveLength(1);
  });

  it("creates new geo-interest when city+country provided and not found", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createExpression(db, { humanId: "h-1", city: "Berlin", country: "Germany" });
    expect(result.geoInterestId).toBeDefined();

    const gis = await db.select().from(schema.geoInterests);
    expect(gis).toHaveLength(1);
    expect(gis[0]!.city).toBe("Berlin");
    expect(gis[0]!.country).toBe("Germany");
  });

  it("reuses existing geo-interest when city+country match", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Berlin", country: "Germany", createdAt: ts });
    await seedHuman(db, "h-1");

    const result = await createExpression(db, { humanId: "h-1", city: "Berlin", country: "Germany" });
    expect(result.geoInterestId).toBe("gi-1");

    const gis = await db.select().from(schema.geoInterests);
    expect(gis).toHaveLength(1);
  });

  it("throws notFound for missing human", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });

    await expect(
      createExpression(db, { humanId: "nonexistent", geoInterestId: "gi-1" }),
    ).rejects.toThrowError("Human not found");
  });

  it("throws notFound for missing activity", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await seedHuman(db, "h-1");

    await expect(
      createExpression(db, { humanId: "h-1", geoInterestId: "gi-1", activityId: "nonexistent" }),
    ).rejects.toThrowError("Activity not found");
  });

  it("verifies activity if provided and succeeds", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await seedHuman(db, "h-1");
    await seedColleague(db);

    await db.insert(schema.activities).values({
      id: "act-1", displayId: nextDisplayId("ACT"), type: "email", subject: "Test", activityDate: ts,
      colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    const result = await createExpression(db, {
      humanId: "h-1", geoInterestId: "gi-1", activityId: "act-1", notes: "From email",
    });
    expect(result.activityId).toBe("act-1");
    expect(result.notes).toBe("From email");
  });
});

// ---------------------------------------------------------------------------
// updateExpression
// ---------------------------------------------------------------------------

describe("updateExpression", () => {
  it("throws notFound for missing expression", async () => {
    const db = getTestDb();
    await expect(updateExpression(db, "nonexistent", { notes: "x" })).rejects.toThrowError("Expression not found");
  });

  it("updates notes on an expression", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await seedHuman(db, "h-1");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", notes: "old notes", createdAt: ts,
    });

    const result = await updateExpression(db, "expr-1", { notes: "new notes" });
    expect(result!.notes).toBe("new notes");
  });
});

// ---------------------------------------------------------------------------
// deleteExpression
// ---------------------------------------------------------------------------

describe("deleteExpression", () => {
  it("throws notFound for missing expression", async () => {
    const db = getTestDb();
    await expect(deleteExpression(db, "nonexistent")).rejects.toThrowError("Expression not found");
  });

  it("deletes expression successfully", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await seedHuman(db, "h-1");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", createdAt: ts,
    });

    await deleteExpression(db, "expr-1");
    expect(await db.select().from(schema.geoInterestExpressions)).toHaveLength(0);
  });
});
