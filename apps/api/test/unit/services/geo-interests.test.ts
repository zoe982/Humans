import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { getTestDb } from "../setup";
import {
  listGeoInterests,
  searchGeoInterests,
  getGeoInterestDetail,
  createGeoInterest,
  deleteGeoInterest,
  listExpressions,
  createExpression,
  getGeoInterestExpressionDetail,
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

  it("throws notFound when no geoInterestId and no city/country provided", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    // Pass neither geoInterestId nor city+country — geoInterestId remains null after resolution
    await expect(
      createExpression(db, { humanId: "h-1" }),
    ).rejects.toThrowError("Geo-interest could not be resolved");
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
// getGeoInterestExpressionDetail
// ---------------------------------------------------------------------------

describe("getGeoInterestExpressionDetail", () => {
  it("throws notFound for missing expression", async () => {
    const db = getTestDb();
    await expect(
      getGeoInterestExpressionDetail(db, "nonexistent"),
    ).rejects.toThrowError("Geo-interest expression not found");
  });

  it("returns expression with human, geo-interest, and activity details", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-1", displayId: nextDisplayId("GEO"), city: "Rome", country: "Italy", createdAt: ts,
    });
    await seedHuman(db, "h-1", "Marco", "Rossi");
    await seedColleague(db);

    await db.insert(schema.activities).values({
      id: "act-1", displayId: nextDisplayId("ACT"), type: "email", subject: "Rome trip inquiry",
      activityDate: ts, colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GEX"), humanId: "h-1", geoInterestId: "gi-1",
      activityId: "act-1", notes: "Very interested", createdAt: ts,
    });

    const result = await getGeoInterestExpressionDetail(db, "expr-1");
    expect(result.id).toBe("expr-1");
    expect(result.humanName).toBe("Marco Rossi");
    expect(result.humanDisplayId).toMatch(/^HUM-/);
    expect(result.city).toBe("Rome");
    expect(result.country).toBe("Italy");
    expect(result.geoDisplayId).toMatch(/^GEO-/);
    expect(result.activitySubject).toBe("Rome trip inquiry");
  });

  it("returns null fields when human and activity are absent", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-1", displayId: nextDisplayId("GEO"), city: "Oslo", country: "Norway", createdAt: ts,
    });
    await seedHuman(db, "h-1");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GEX"), humanId: "h-1", geoInterestId: "gi-1",
      activityId: null, createdAt: ts,
    });

    const result = await getGeoInterestExpressionDetail(db, "expr-1");
    expect(result.activitySubject).toBeNull();
    // activityId was null so no activity fetch happens
    expect(result.city).toBe("Oslo");
  });

  it("resolves correctly when no activityId is set", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-1", displayId: nextDisplayId("GEO"), city: "Vienna", country: "Austria", createdAt: ts,
    });
    await seedHuman(db, "h-1", "Anna", "Bauer");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GEX"), humanId: "h-1", geoInterestId: "gi-1",
      activityId: null, createdAt: ts,
    });

    const result = await getGeoInterestExpressionDetail(db, "expr-1");
    expect(result.humanName).toBe("Anna Bauer");
    expect(result.activitySubject).toBeNull();
    expect(result.country).toBe("Austria");
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
// getGeoInterestDetail — null activityId branch
// ---------------------------------------------------------------------------

describe("getGeoInterestDetail — null activityId on expression", () => {
  it("handles expression with null activityId (does not fetch activities)", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-null-act", displayId: nextDisplayId("GEO"), city: "Dublin", country: "Ireland", createdAt: ts,
    });
    await seedHuman(db, "h-null-act", "Paddy", "Murphy");

    // Expression with activityId = null — exercises the activityId != null false branch
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-null-act", displayId: nextDisplayId("GIE"),
      humanId: "h-null-act", geoInterestId: "gi-null-act",
      activityId: null, notes: null, createdAt: ts,
    });

    const result = await getGeoInterestDetail(db, "gi-null-act");
    expect(result.expressions).toHaveLength(1);
    expect(result.expressions[0]!.humanName).toBe("Paddy Murphy");
    expect(result.expressions[0]!.activitySubject).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listExpressions — null activityId branch
// ---------------------------------------------------------------------------

describe("listExpressions — null activityId", () => {
  it("returns null activitySubject for expression with null activityId", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-no-act", displayId: nextDisplayId("GEO"), city: "Valletta", country: "Malta", createdAt: ts,
    });
    await seedHuman(db, "h-no-act", "Maria", "Borg");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-no-act", displayId: nextDisplayId("GIE"),
      humanId: "h-no-act", geoInterestId: "gi-no-act",
      activityId: null, createdAt: ts,
    });

    const result = await listExpressions(db, {});
    expect(result).toHaveLength(1);
    // The activityId == null branch returns null from allActivities.find()
    expect(result[0]!.activitySubject).toBeNull();
    expect(result[0]!.city).toBe("Valletta");
    expect(result[0]!.country).toBe("Malta");
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

// ---------------------------------------------------------------------------
// getGeoInterestDetail — orphaned human (humanName null branch)
// ---------------------------------------------------------------------------

describe("getGeoInterestDetail — orphaned human FK", () => {
  it("sets humanName to null when the human row no longer exists", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-orphan-h", displayId: nextDisplayId("GEO"), city: "Athens", country: "Greece", createdAt: ts,
    });
    await seedHuman(db, "h-real");

    // Insert an expression with a valid human so FK passes, then orphan it via replica mode
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-orphan-h", displayId: nextDisplayId("GIE"),
      humanId: "h-real", geoInterestId: "gi-orphan-h", createdAt: ts,
    });

    // Bypass FK constraints and point humanId at a non-existent human
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(sql`UPDATE geo_interest_expressions SET human_id = 'ghost-human' WHERE id = 'expr-orphan-h'`);
    await db.execute(sql`SET session_replication_role = 'origin'`);

    // Delete the real human so inArray lookup also finds nothing
    await db.delete(schema.humans).where(sql`id = 'h-real'`);

    const result = await getGeoInterestDetail(db, "gi-orphan-h");
    expect(result.expressions).toHaveLength(1);
    // human not found → humanName: null  (exercises L73 cond-expr false branch)
    expect(result.expressions[0]!.humanName).toBeNull();
    // geo-interest data still comes from the parent record
    expect(result.city).toBe("Athens");
  });

  it("skips the allHumans fetch when there are no expressions (humanIds empty)", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-no-expr", displayId: nextDisplayId("GEO"), city: "Lisbon", country: "Portugal", createdAt: ts,
    });

    // No expressions → humanIds.length === 0 → allHumans = []  (exercises L61 cond-expr false branch)
    const result = await getGeoInterestDetail(db, "gi-no-expr");
    expect(result.expressions).toHaveLength(0);
    expect(result.city).toBe("Lisbon");
  });
});

// ---------------------------------------------------------------------------
// listExpressions — filter by activityId (L133 if[0] true branch)
// ---------------------------------------------------------------------------

describe("listExpressions — filter by activityId", () => {
  it("filters expressions by activityId", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-act-filter", displayId: nextDisplayId("GEO"), city: "Madrid", country: "Spain", createdAt: ts,
    });
    await seedHuman(db, "h-act-filter", "Carlos", "Lopez");
    await seedColleague(db, "col-act-filter");

    await db.insert(schema.activities).values({
      id: "act-filter-1", displayId: nextDisplayId("ACT"), type: "email", subject: "Madrid visit",
      activityDate: ts, colleagueId: "col-act-filter", createdAt: ts, updatedAt: ts,
    });

    // Expression with activity
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-with-act", displayId: nextDisplayId("GIE"),
      humanId: "h-act-filter", geoInterestId: "gi-act-filter",
      activityId: "act-filter-1", createdAt: ts,
    });
    // Expression without activity
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-no-act", displayId: nextDisplayId("GIE"),
      humanId: "h-act-filter", geoInterestId: "gi-act-filter",
      activityId: null, createdAt: ts,
    });

    // Filter by activityId — exercises L133 if[0] true branch
    const result = await listExpressions(db, { activityId: "act-filter-1" });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("expr-with-act");
    expect(result[0]!.activitySubject).toBe("Madrid visit");
  });
});

// ---------------------------------------------------------------------------
// listExpressions — orphaned human (L149 humanName null branch)
// ---------------------------------------------------------------------------

describe("listExpressions — orphaned human FK", () => {
  it("sets humanName to null when the referenced human no longer exists", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-list-orphan-h", displayId: nextDisplayId("GEO"), city: "Prague", country: "Czech Republic", createdAt: ts,
    });
    await seedHuman(db, "h-list-orphan");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-list-orphan-h", displayId: nextDisplayId("GIE"),
      humanId: "h-list-orphan", geoInterestId: "gi-list-orphan-h", createdAt: ts,
    });

    // Orphan the human reference
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(sql`UPDATE geo_interest_expressions SET human_id = 'ghost-human-list' WHERE id = 'expr-list-orphan-h'`);
    await db.execute(sql`SET session_replication_role = 'origin'`);

    await db.delete(schema.humans).where(sql`id = 'h-list-orphan'`);

    // L149 cond-expr false branch: human not found → humanName: null
    const result = await listExpressions(db, {});
    expect(result).toHaveLength(1);
    expect(result[0]!.humanName).toBeNull();
    // city/country still resolve from the existing geo interest
    expect(result[0]!.city).toBe("Prague");
    expect(result[0]!.country).toBe("Czech Republic");
  });
});

// ---------------------------------------------------------------------------
// listExpressions — orphaned geoInterest (L165-167 city/country null branches)
// ---------------------------------------------------------------------------

describe("listExpressions — orphaned geoInterest FK", () => {
  it("sets city and country to null when the referenced geo-interest no longer exists", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-list-orphan-gi", displayId: nextDisplayId("GEO"), city: "Warsaw", country: "Poland", createdAt: ts,
    });
    await seedHuman(db, "h-list-orphan-gi", "Anna", "Kowalski");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-list-orphan-gi", displayId: nextDisplayId("GIE"),
      humanId: "h-list-orphan-gi", geoInterestId: "gi-list-orphan-gi", createdAt: ts,
    });

    // Orphan the geoInterest reference — bypass FK to point at a non-existent geo interest
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(sql`UPDATE geo_interest_expressions SET geo_interest_id = 'ghost-gi' WHERE id = 'expr-list-orphan-gi'`);
    await db.execute(sql`SET session_replication_role = 'origin'`);

    // Remove the real geo interest so the inArray lookup finds nothing
    await db.delete(schema.geoInterests).where(sql`id = 'gi-list-orphan-gi'`);

    // L165-167: gi not found → city: null, country: null
    const result = await listExpressions(db, {});
    expect(result).toHaveLength(1);
    expect(result[0]!.humanName).toBe("Anna Kowalski");
    expect(result[0]!.city).toBeNull();
    expect(result[0]!.country).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getGeoInterestExpressionDetail — orphaned human (L261 humanName/humanDisplayId null)
// ---------------------------------------------------------------------------

describe("getGeoInterestExpressionDetail — orphaned human FK", () => {
  it("sets humanName and humanDisplayId to null when human no longer exists", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-det-orphan-h", displayId: nextDisplayId("GEO"), city: "Budapest", country: "Hungary", createdAt: ts,
    });
    await seedHuman(db, "h-det-orphan");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-det-orphan-h", displayId: nextDisplayId("GEX"),
      humanId: "h-det-orphan", geoInterestId: "gi-det-orphan-h", createdAt: ts,
    });

    // Orphan the human reference
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(sql`UPDATE geo_interest_expressions SET human_id = 'ghost-human-det' WHERE id = 'expr-det-orphan-h'`);
    await db.execute(sql`SET session_replication_role = 'origin'`);

    await db.delete(schema.humans).where(sql`id = 'h-det-orphan'`);

    // L261: human != null false branch → humanName: null
    // L262: human?.displayId ?? null → humanDisplayId: null
    const result = await getGeoInterestExpressionDetail(db, "expr-det-orphan-h");
    expect(result.humanName).toBeNull();
    expect(result.humanDisplayId).toBeNull();
    // geo-interest still resolves
    expect(result.city).toBe("Budapest");
    expect(result.country).toBe("Hungary");
    expect(result.geoDisplayId).toMatch(/^GEO-/);
  });
});

// ---------------------------------------------------------------------------
// getGeoInterestExpressionDetail — orphaned geoInterest (L263-265 city/country/geoDisplayId null)
// ---------------------------------------------------------------------------

describe("getGeoInterestExpressionDetail — orphaned geoInterest FK", () => {
  it("sets city, country, and geoDisplayId to null when geo-interest no longer exists", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.geoInterests).values({
      id: "gi-det-orphan-gi", displayId: nextDisplayId("GEO"), city: "Krakow", country: "Poland", createdAt: ts,
    });
    await seedHuman(db, "h-det-orphan-gi", "Piotr", "Nowak");

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-det-orphan-gi", displayId: nextDisplayId("GEX"),
      humanId: "h-det-orphan-gi", geoInterestId: "gi-det-orphan-gi", createdAt: ts,
    });

    // Orphan the geoInterest reference by updating to a non-existent ID
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(sql`UPDATE geo_interest_expressions SET geo_interest_id = 'ghost-gi-det' WHERE id = 'expr-det-orphan-gi'`);
    await db.execute(sql`SET session_replication_role = 'origin'`);

    await db.delete(schema.geoInterests).where(sql`id = 'gi-det-orphan-gi'`);

    // L263: gi?.city ?? null → city: null
    // L264: gi?.country ?? null → country: null
    // L265: gi?.displayId ?? null → geoDisplayId: null
    const result = await getGeoInterestExpressionDetail(db, "expr-det-orphan-gi");
    expect(result.humanName).toBe("Piotr Nowak");
    expect(result.humanDisplayId).toMatch(/^HUM-/);
    expect(result.city).toBeNull();
    expect(result.country).toBeNull();
    expect(result.geoDisplayId).toBeNull();
  });
});
