import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listRouteInterests,
  getRouteInterestDetail,
  createRouteInterest,
  deleteRouteInterest,
  listRouteInterestExpressions,
  createRouteInterestExpression,
  getRouteInterestExpressionDetail,
  updateRouteInterestExpression,
  deleteRouteInterestExpression,
  listCities,
} from "../../../src/services/route-interests";
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

async function seedHuman(
  db: ReturnType<typeof getTestDb>,
  id = "h-1",
  first = "John",
  last = "Doe",
) {
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

async function seedRouteInterest(
  db: ReturnType<typeof getTestDb>,
  id: string,
  originCity: string,
  originCountry: string,
  destCity: string,
  destCountry: string,
) {
  const ts = now();
  await db.insert(schema.routeInterests).values({
    id,
    displayId: nextDisplayId("ROI"),
    originCity,
    originCountry,
    destinationCity: destCity,
    destinationCountry: destCountry,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedActivity(db: ReturnType<typeof getTestDb>, id = "act-1", subject = "Test Activity") {
  const ts = now();
  await seedColleague(db, "col-seed");
  await db.insert(schema.activities).values({
    id,
    displayId: nextDisplayId("ACT"),
    type: "email",
    subject,
    activityDate: ts,
    colleagueId: "col-seed",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

// ---------------------------------------------------------------------------
// listRouteInterests
// ---------------------------------------------------------------------------

describe("listRouteInterests", () => {
  it("returns empty list when no route interests exist", async () => {
    const db = getTestDb();
    const result = await listRouteInterests(db);
    expect(result).toHaveLength(0);
  });

  it("returns route interests with zero counts when no expressions", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "London", "UK", "Paris", "France");

    const result = await listRouteInterests(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.originCity).toBe("London");
    expect(result[0]!.destinationCity).toBe("Paris");
    expect(result[0]!.humanCount).toBe(0);
    expect(result[0]!.expressionCount).toBe(0);
  });

  it("counts unique humans and total expressions per route interest", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "London", "UK", "Paris", "France");
    await seedRouteInterest(db, "ri-2", "NYC", "US", "Rome", "Italy");
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    const ts = now();

    // Two humans on ri-1
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      createdAt: ts,
    });
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-2",
      displayId: nextDisplayId("REX"),
      humanId: "h-2",
      routeInterestId: "ri-1",
      frequency: "one_time",
      createdAt: ts,
    });
    // Same human twice on ri-1 — should only count once in humanCount
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-3",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "repeat",
      createdAt: ts,
    });

    const result = await listRouteInterests(db);
    expect(result).toHaveLength(2);

    const ri1 = result.find((r) => r.id === "ri-1");
    expect(ri1!.humanCount).toBe(2);
    expect(ri1!.expressionCount).toBe(3);

    const ri2 = result.find((r) => r.id === "ri-2");
    expect(ri2!.humanCount).toBe(0);
    expect(ri2!.expressionCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getRouteInterestDetail
// ---------------------------------------------------------------------------

describe("getRouteInterestDetail", () => {
  it("throws notFound for missing route interest", async () => {
    const db = getTestDb();
    await expect(getRouteInterestDetail(db, "nonexistent")).rejects.toThrowError(
      "Route interest not found",
    );
  });

  it("returns route interest with empty expressions list", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "Berlin", "Germany", "Vienna", "Austria");

    const result = await getRouteInterestDetail(db, "ri-1");
    expect(result.originCity).toBe("Berlin");
    expect(result.destinationCity).toBe("Vienna");
    expect(result.expressions).toHaveLength(0);
  });

  it("returns enriched expressions with human names and activity subjects", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "NYC", "US", "London", "UK");
    await seedHuman(db, "h-1", "Sarah", "Connor");
    await seedColleague(db, "col-1");
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-1",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Flight inquiry",
      activityDate: ts,
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      activityId: "act-1",
      frequency: "one_time",
      notes: "Urgent flight",
      createdAt: ts,
    });

    const result = await getRouteInterestDetail(db, "ri-1");
    expect(result.expressions).toHaveLength(1);
    expect(result.expressions[0]!.humanName).toBe("Sarah Connor");
    expect(result.expressions[0]!.activitySubject).toBe("Flight inquiry");
  });

  it("returns null activitySubject when expression has no activity", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "Madrid", "Spain", "Lisbon", "Portugal");
    await seedHuman(db, "h-1", "Pedro", "Alves");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "repeat",
      createdAt: ts,
    });

    const result = await getRouteInterestDetail(db, "ri-1");
    expect(result.expressions[0]!.activitySubject).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createRouteInterest
// ---------------------------------------------------------------------------

describe("createRouteInterest", () => {
  it("creates a new route interest", async () => {
    const db = getTestDb();
    const result = await createRouteInterest(db, {
      originCity: "Amsterdam",
      originCountry: "Netherlands",
      destinationCity: "Barcelona",
      destinationCountry: "Spain",
    });

    expect(result.created).toBe(true);
    expect(result.data.originCity).toBe("Amsterdam");
    expect(result.data.destinationCity).toBe("Barcelona");
    expect(result.data.id).toBeDefined();
    expect(result.data.displayId).toMatch(/^ROI-/);

    const rows = await db.select().from(schema.routeInterests);
    expect(rows).toHaveLength(1);
  });

  it("returns existing route interest when same origin+destination already exists (idempotent)", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-existing", "Tokyo", "Japan", "Seoul", "Korea");

    const result = await createRouteInterest(db, {
      originCity: "Tokyo",
      originCountry: "Japan",
      destinationCity: "Seoul",
      destinationCountry: "Korea",
    });

    expect(result.created).toBe(false);
    expect(result.data.id).toBe("ri-existing");

    const rows = await db.select().from(schema.routeInterests);
    expect(rows).toHaveLength(1);
  });

  it("creates distinct route interests for different routes", async () => {
    const db = getTestDb();

    await createRouteInterest(db, {
      originCity: "Paris",
      originCountry: "France",
      destinationCity: "Berlin",
      destinationCountry: "Germany",
    });
    await createRouteInterest(db, {
      originCity: "Berlin",
      originCountry: "Germany",
      destinationCity: "Paris",
      destinationCountry: "France",
    });

    const rows = await db.select().from(schema.routeInterests);
    expect(rows).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// deleteRouteInterest
// ---------------------------------------------------------------------------

describe("deleteRouteInterest", () => {
  it("throws notFound for missing route interest", async () => {
    const db = getTestDb();
    await expect(deleteRouteInterest(db, "nonexistent")).rejects.toThrowError(
      "Route interest not found",
    );
  });

  it("deletes route interest and cascades expressions", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "Dubai", "UAE", "Singapore", "Singapore");
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      createdAt: ts,
    });
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-2",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "repeat",
      createdAt: ts,
    });

    await deleteRouteInterest(db, "ri-1");

    expect(await db.select().from(schema.routeInterests)).toHaveLength(0);
    expect(await db.select().from(schema.routeInterestExpressions)).toHaveLength(0);
  });

  it("only deletes targeted route interest's expressions", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedRouteInterest(db, "ri-2", "C", "CC", "D", "DD");
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      createdAt: ts,
    });
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-2",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-2",
      frequency: "one_time",
      createdAt: ts,
    });

    await deleteRouteInterest(db, "ri-1");

    const riRows = await db.select().from(schema.routeInterests);
    expect(riRows).toHaveLength(1);
    expect(riRows[0]!.id).toBe("ri-2");

    const exprRows = await db.select().from(schema.routeInterestExpressions);
    expect(exprRows).toHaveLength(1);
    expect(exprRows[0]!.id).toBe("rex-2");
  });
});

// ---------------------------------------------------------------------------
// listRouteInterestExpressions
// ---------------------------------------------------------------------------

describe("listRouteInterestExpressions", () => {
  it("returns empty list when no expressions", async () => {
    const db = getTestDb();
    const result = await listRouteInterestExpressions(db, {});
    expect(result).toHaveLength(0);
  });

  it("returns all expressions with no filters", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "X", "XX", "Y", "YY");
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values([
      { id: "rex-1", displayId: nextDisplayId("REX"), humanId: "h-1", routeInterestId: "ri-1", frequency: "one_time", createdAt: ts },
      { id: "rex-2", displayId: nextDisplayId("REX"), humanId: "h-1", routeInterestId: "ri-1", frequency: "repeat", createdAt: ts },
    ]);

    const result = await listRouteInterestExpressions(db, {});
    expect(result).toHaveLength(2);
  });

  it("filters by humanId", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "X", "XX", "Y", "YY");
    await seedHuman(db, "h-1", "Alice", "A");
    await seedHuman(db, "h-2", "Bob", "B");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values([
      { id: "rex-1", displayId: nextDisplayId("REX"), humanId: "h-1", routeInterestId: "ri-1", frequency: "one_time", createdAt: ts },
      { id: "rex-2", displayId: nextDisplayId("REX"), humanId: "h-2", routeInterestId: "ri-1", frequency: "one_time", createdAt: ts },
    ]);

    const result = await listRouteInterestExpressions(db, { humanId: "h-1" });
    expect(result).toHaveLength(1);
    expect(result[0]!.humanId).toBe("h-1");
  });

  it("filters by routeInterestId", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedRouteInterest(db, "ri-2", "C", "CC", "D", "DD");
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values([
      { id: "rex-1", displayId: nextDisplayId("REX"), humanId: "h-1", routeInterestId: "ri-1", frequency: "one_time", createdAt: ts },
      { id: "rex-2", displayId: nextDisplayId("REX"), humanId: "h-1", routeInterestId: "ri-2", frequency: "one_time", createdAt: ts },
    ]);

    const result = await listRouteInterestExpressions(db, { routeInterestId: "ri-2" });
    expect(result).toHaveLength(1);
    expect(result[0]!.routeInterestId).toBe("ri-2");
  });

  it("filters by activityId", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");
    await seedColleague(db, "col-1");
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-1",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Trip planning",
      activityDate: ts,
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });

    await db.insert(schema.routeInterestExpressions).values([
      { id: "rex-1", displayId: nextDisplayId("REX"), humanId: "h-1", routeInterestId: "ri-1", activityId: "act-1", frequency: "one_time", createdAt: ts },
      { id: "rex-2", displayId: nextDisplayId("REX"), humanId: "h-1", routeInterestId: "ri-1", frequency: "one_time", createdAt: ts },
    ]);

    const result = await listRouteInterestExpressions(db, { activityId: "act-1" });
    expect(result).toHaveLength(1);
    expect(result[0]!.activityId).toBe("act-1");
  });

  it("enriches expressions with human name, route data, and activity subject", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "London", "UK", "Paris", "France");
    await seedHuman(db, "h-1", "Emma", "Watson");
    await seedColleague(db, "col-1");
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-1",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Paris bookings",
      activityDate: ts,
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      activityId: "act-1",
      frequency: "one_time",
      createdAt: ts,
    });

    const result = await listRouteInterestExpressions(db, {});
    expect(result[0]!.humanName).toBe("Emma Watson");
    expect(result[0]!.originCity).toBe("London");
    expect(result[0]!.originCountry).toBe("UK");
    expect(result[0]!.destinationCity).toBe("Paris");
    expect(result[0]!.destinationCountry).toBe("France");
    expect(result[0]!.activitySubject).toBe("Paris bookings");
  });

  it("returns null activitySubject when expression has no activity", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1", "No", "Activity");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      createdAt: ts,
    });

    const result = await listRouteInterestExpressions(db, {});
    expect(result[0]!.activitySubject).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createRouteInterestExpression
// ---------------------------------------------------------------------------

describe("createRouteInterestExpression", () => {
  it("throws notFound when human does not exist", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");

    await expect(
      createRouteInterestExpression(db, { humanId: "nonexistent", routeInterestId: "ri-1" }),
    ).rejects.toThrowError("Human not found");
  });

  it("creates expression with existing routeInterestId", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "Tokyo", "Japan", "Osaka", "Japan");
    await seedHuman(db, "h-1");

    const result = await createRouteInterestExpression(db, {
      humanId: "h-1",
      routeInterestId: "ri-1",
    });

    expect(result.humanId).toBe("h-1");
    expect(result.routeInterestId).toBe("ri-1");
    expect(result.id).toBeDefined();
    expect(result.displayId).toMatch(/^REX-/);
    expect(result.frequency).toBe("one_time");
    expect(result.activityId).toBeNull();
    expect(result.notes).toBeNull();

    const rows = await db.select().from(schema.routeInterestExpressions);
    expect(rows).toHaveLength(1);
  });

  it("creates a new route interest when city+country provided and not found", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createRouteInterestExpression(db, {
      humanId: "h-1",
      originCity: "Milan",
      originCountry: "Italy",
      destinationCity: "Munich",
      destinationCountry: "Germany",
    });

    expect(result.routeInterestId).toBeDefined();

    const riRows = await db.select().from(schema.routeInterests);
    expect(riRows).toHaveLength(1);
    expect(riRows[0]!.originCity).toBe("Milan");
    expect(riRows[0]!.destinationCity).toBe("Munich");
  });

  it("reuses existing route interest when city+country match", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-existing", "Milan", "Italy", "Munich", "Germany");
    await seedHuman(db, "h-1");

    const result = await createRouteInterestExpression(db, {
      humanId: "h-1",
      originCity: "Milan",
      originCountry: "Italy",
      destinationCity: "Munich",
      destinationCountry: "Germany",
    });

    expect(result.routeInterestId).toBe("ri-existing");

    const riRows = await db.select().from(schema.routeInterests);
    expect(riRows).toHaveLength(1);
  });

  it("throws notFound when activityId references nonexistent activity", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");

    await expect(
      createRouteInterestExpression(db, {
        humanId: "h-1",
        routeInterestId: "ri-1",
        activityId: "nonexistent",
      }),
    ).rejects.toThrowError("Activity not found");
  });

  it("creates expression with valid activityId", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");
    await seedColleague(db, "col-1");
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-1",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Booking enquiry",
      activityDate: ts,
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await createRouteInterestExpression(db, {
      humanId: "h-1",
      routeInterestId: "ri-1",
      activityId: "act-1",
      frequency: "repeat",
      travelYear: 2025,
      travelMonth: 6,
      travelDay: 15,
      notes: "Annual summer trip",
    });

    expect(result.activityId).toBe("act-1");
    expect(result.frequency).toBe("repeat");
    expect(result.travelYear).toBe(2025);
    expect(result.travelMonth).toBe(6);
    expect(result.travelDay).toBe(15);
    expect(result.notes).toBe("Annual summer trip");
  });

  it("defaults frequency to one_time when not provided", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");

    const result = await createRouteInterestExpression(db, {
      humanId: "h-1",
      routeInterestId: "ri-1",
    });

    expect(result.frequency).toBe("one_time");
  });
});

// ---------------------------------------------------------------------------
// getRouteInterestExpressionDetail
// ---------------------------------------------------------------------------

describe("getRouteInterestExpressionDetail", () => {
  it("throws notFound for missing expression", async () => {
    const db = getTestDb();
    await expect(
      getRouteInterestExpressionDetail(db, "nonexistent"),
    ).rejects.toThrowError("Route interest expression not found");
  });

  it("returns expression with enriched route, human, and null activity data", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "Cairo", "Egypt", "Istanbul", "Turkey");
    await seedHuman(db, "h-1", "Mona", "El-Said");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      createdAt: ts,
    });

    const result = await getRouteInterestExpressionDetail(db, "rex-1");
    expect(result.humanName).toBe("Mona El-Said");
    expect(result.humanDisplayId).toMatch(/^HUM-/);
    expect(result.originCity).toBe("Cairo");
    expect(result.originCountry).toBe("Egypt");
    expect(result.destinationCity).toBe("Istanbul");
    expect(result.destinationCountry).toBe("Turkey");
    expect(result.routeDisplayId).toMatch(/^ROI-/);
    expect(result.activitySubject).toBeNull();
  });

  it("returns expression with enriched activity data when activityId is set", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1", "Jack", "Smith");
    await seedColleague(db, "col-1");
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-1",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Flight options",
      activityDate: ts,
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      activityId: "act-1",
      frequency: "one_time",
      createdAt: ts,
    });

    const result = await getRouteInterestExpressionDetail(db, "rex-1");
    expect(result.activitySubject).toBe("Flight options");
  });
});

// ---------------------------------------------------------------------------
// updateRouteInterestExpression
// ---------------------------------------------------------------------------

describe("updateRouteInterestExpression", () => {
  it("throws notFound for missing expression", async () => {
    const db = getTestDb();
    await expect(
      updateRouteInterestExpression(db, "nonexistent", { notes: "hello" }),
    ).rejects.toThrowError("Route interest expression not found");
  });

  it("updates notes on an expression", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      notes: "old notes",
      createdAt: ts,
    });

    const result = await updateRouteInterestExpression(db, "rex-1", { notes: "new notes" });
    expect(result!.notes).toBe("new notes");
  });

  it("updates frequency on an expression", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      createdAt: ts,
    });

    const result = await updateRouteInterestExpression(db, "rex-1", { frequency: "repeat" });
    expect(result!.frequency).toBe("repeat");
  });

  it("updates travel date fields", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      createdAt: ts,
    });

    const result = await updateRouteInterestExpression(db, "rex-1", {
      travelYear: 2026,
      travelMonth: 3,
      travelDay: 20,
    });

    expect(result!.travelYear).toBe(2026);
    expect(result!.travelMonth).toBe(3);
    expect(result!.travelDay).toBe(20);
  });

  it("updates activityId on an expression", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");
    await seedColleague(db, "col-1");
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-1",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "New activity",
      activityDate: ts,
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      createdAt: ts,
    });

    const result = await updateRouteInterestExpression(db, "rex-1", { activityId: "act-1" });
    expect(result!.activityId).toBe("act-1");
  });

  it("allows setting fields to null", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      notes: "some notes",
      travelYear: 2025,
      createdAt: ts,
    });

    const result = await updateRouteInterestExpression(db, "rex-1", {
      notes: null,
      travelYear: null,
    });
    expect(result!.notes).toBeNull();
    expect(result!.travelYear).toBeNull();
  });

  it("persists updated values in the database", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      createdAt: ts,
    });

    await updateRouteInterestExpression(db, "rex-1", { notes: "persisted" });

    const rows = await db.select().from(schema.routeInterestExpressions);
    expect(rows[0]!.notes).toBe("persisted");
  });
});

// ---------------------------------------------------------------------------
// deleteRouteInterestExpression
// ---------------------------------------------------------------------------

describe("deleteRouteInterestExpression", () => {
  it("throws notFound for missing expression", async () => {
    const db = getTestDb();
    await expect(
      deleteRouteInterestExpression(db, "nonexistent"),
    ).rejects.toThrowError("Route interest expression not found");
  });

  it("deletes an existing expression", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1",
      displayId: nextDisplayId("REX"),
      humanId: "h-1",
      routeInterestId: "ri-1",
      frequency: "one_time",
      createdAt: ts,
    });

    await deleteRouteInterestExpression(db, "rex-1");

    expect(await db.select().from(schema.routeInterestExpressions)).toHaveLength(0);
  });

  it("only deletes the targeted expression", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "A", "AA", "B", "BB");
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.routeInterestExpressions).values([
      { id: "rex-1", displayId: nextDisplayId("REX"), humanId: "h-1", routeInterestId: "ri-1", frequency: "one_time", createdAt: ts },
      { id: "rex-2", displayId: nextDisplayId("REX"), humanId: "h-1", routeInterestId: "ri-1", frequency: "repeat", createdAt: ts },
    ]);

    await deleteRouteInterestExpression(db, "rex-1");

    const rows = await db.select().from(schema.routeInterestExpressions);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("rex-2");
  });
});

// ---------------------------------------------------------------------------
// listCities
// ---------------------------------------------------------------------------

describe("listCities", () => {
  it("returns empty array for empty query", async () => {
    const db = getTestDb();
    const result = await listCities(db, "");
    expect(result).toEqual([]);
  });

  it("returns empty array for whitespace-only query", async () => {
    const db = getTestDb();
    const result = await listCities(db, "   ");
    expect(result).toEqual([]);
  });

  it("returns empty array when no data exists", async () => {
    const db = getTestDb();
    const result = await listCities(db, "London");
    expect(result).toEqual([]);
  });

  it("finds cities from route interests as origin", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "London", "UK", "Paris", "France");

    const result = await listCities(db, "Lon");
    expect(result).toHaveLength(1);
    expect(result[0]!.city).toBe("London");
    expect(result[0]!.country).toBe("UK");
  });

  it("finds cities from route interests as destination", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "London", "UK", "Paris", "France");

    const result = await listCities(db, "Par");
    expect(result).toHaveLength(1);
    expect(result[0]!.city).toBe("Paris");
    expect(result[0]!.country).toBe("France");
  });

  it("finds cities from geo interests", async () => {
    const db = getTestDb();
    const ts = now();
    await db.insert(schema.geoInterests).values({
      id: "gi-1",
      displayId: nextDisplayId("GEO"),
      city: "Berlin",
      country: "Germany",
      createdAt: ts,
    });

    const result = await listCities(db, "Ber");
    expect(result).toHaveLength(1);
    expect(result[0]!.city).toBe("Berlin");
    expect(result[0]!.country).toBe("Germany");
  });

  it("deduplicates cities appearing in both route and geo interests", async () => {
    const db = getTestDb();
    const ts = now();

    await seedRouteInterest(db, "ri-1", "Rome", "Italy", "Florence", "Italy");
    await db.insert(schema.geoInterests).values({
      id: "gi-1",
      displayId: nextDisplayId("GEO"),
      city: "Rome",
      country: "Italy",
      createdAt: ts,
    });

    const result = await listCities(db, "Rome");
    expect(result).toHaveLength(1);
    expect(result[0]!.city).toBe("Rome");
  });

  it("returns cities sorted alphabetically", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "Zurich", "Switzerland", "Amsterdam", "Netherlands");
    await seedRouteInterest(db, "ri-2", "Brussels", "Belgium", "Stockholm", "Sweden");

    const result = await listCities(db, "ch");
    // Zurich and Brussels both contain no 'ch', but Amsterdam and Stockholm do not either
    // Use a query that hits multiple cities alphabetically
    const result2 = await listCities(db, "s");
    // Should include Zurich, Brussels, Amsterdam, Stockholm — sorted alphabetically those with 's'
    const names = result2.map((c) => c.city);
    for (let i = 0; i < names.length - 1; i++) {
      expect(names[i]!.localeCompare(names[i + 1]!)).toBeLessThanOrEqual(0);
    }
  });

  it("deduplicates city that appears as both origin and destination", async () => {
    const db = getTestDb();
    // London appears as both origin (ri-1) and destination (ri-2)
    await seedRouteInterest(db, "ri-1", "London", "UK", "Paris", "France");
    await seedRouteInterest(db, "ri-2", "Madrid", "Spain", "London", "UK");

    const result = await listCities(db, "London");
    expect(result).toHaveLength(1);
    expect(result[0]!.city).toBe("London");
  });

  it("is case-insensitive in the query match logic", async () => {
    const db = getTestDb();
    await seedRouteInterest(db, "ri-1", "Copenhagen", "Denmark", "Helsinki", "Finland");

    const result = await listCities(db, "cope");
    expect(result).toHaveLength(1);
    expect(result[0]!.city).toBe("Copenhagen");
  });
});
