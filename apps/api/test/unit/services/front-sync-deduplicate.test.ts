import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getTestDb } from "../setup";
import { deduplicateActivities } from "../../../src/services/front-sync";
import { activities, activityOpportunities, geoInterestExpressions, routeInterestExpressions, geoInterests, routeInterests, humans, opportunities } from "@humans/db/schema";
import { eq, sql } from "drizzle-orm";
import { createId } from "@humans/db";

function makeActivity(overrides: Partial<typeof activities.$inferInsert> = {}): typeof activities.$inferInsert {
  const id = overrides.id ?? createId();
  return {
    id,
    displayId: overrides.displayId ?? `ACT-AAA-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`,
    type: "email",
    subject: "Test activity",
    activityDate: "2025-01-01T00:00:00Z",
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("deduplicateActivities", () => {
  // Drop the unique index before each test so we can insert duplicate front_ids
  // (simulates pre-migration state when duplicates were created)
  beforeEach(async () => {
    const db = getTestDb();
    await db.run(sql`DROP INDEX IF EXISTS "activities_front_id_unique"`);
  });

  afterEach(async () => {
    const db = getTestDb();
    await db.run(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS "activities_front_id_unique" ON "activities" ("front_id") WHERE "front_id" IS NOT NULL`,
    );
  });

  it("returns zero stats when no duplicates exist", async () => {
    const db = getTestDb();

    // Insert two activities with different front_ids
    await db.insert(activities).values(makeActivity({ frontId: "msg_aaa" }));
    await db.insert(activities).values(makeActivity({ frontId: "msg_bbb" }));

    const result = await deduplicateActivities(db);

    expect(result).toEqual({
      duplicateGroups: 0,
      deleted: 0,
      junctionRowsDeleted: 0,
      expressionRefsNullified: 0,
    });
  });

  it("returns zero stats when no activities have front_ids", async () => {
    const db = getTestDb();

    await db.insert(activities).values(makeActivity({ frontId: null }));
    await db.insert(activities).values(makeActivity({ frontId: null }));

    const result = await deduplicateActivities(db);

    expect(result).toEqual({
      duplicateGroups: 0,
      deleted: 0,
      junctionRowsDeleted: 0,
      expressionRefsNullified: 0,
    });
  });

  it("deletes newer duplicate and keeps oldest activity per front_id", async () => {
    const db = getTestDb();

    const olderId = createId();
    const newerId = createId();

    await db.insert(activities).values(
      makeActivity({ id: olderId, displayId: "ACT-AAA-001", frontId: "msg_dup", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" }),
    );
    await db.insert(activities).values(
      makeActivity({ id: newerId, displayId: "ACT-AAA-002", frontId: "msg_dup", createdAt: "2025-01-02T00:00:00Z", updatedAt: "2025-01-02T00:00:00Z" }),
    );

    const result = await deduplicateActivities(db);

    expect(result.duplicateGroups).toBe(1);
    expect(result.deleted).toBe(1);

    // The older one should survive
    const remaining = await db.select().from(activities).where(eq(activities.frontId, "msg_dup"));
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(olderId);
  });

  it("handles multiple duplicate groups", async () => {
    const db = getTestDb();

    // Group 1: msg_x appears 3 times
    await db.insert(activities).values(
      makeActivity({ displayId: "ACT-AAA-010", frontId: "msg_x", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" }),
    );
    await db.insert(activities).values(
      makeActivity({ displayId: "ACT-AAA-011", frontId: "msg_x", createdAt: "2025-01-02T00:00:00Z", updatedAt: "2025-01-02T00:00:00Z" }),
    );
    await db.insert(activities).values(
      makeActivity({ displayId: "ACT-AAA-012", frontId: "msg_x", createdAt: "2025-01-03T00:00:00Z", updatedAt: "2025-01-03T00:00:00Z" }),
    );

    // Group 2: msg_y appears 2 times
    await db.insert(activities).values(
      makeActivity({ displayId: "ACT-AAA-020", frontId: "msg_y", createdAt: "2025-02-01T00:00:00Z", updatedAt: "2025-02-01T00:00:00Z" }),
    );
    await db.insert(activities).values(
      makeActivity({ displayId: "ACT-AAA-021", frontId: "msg_y", createdAt: "2025-02-02T00:00:00Z", updatedAt: "2025-02-02T00:00:00Z" }),
    );

    const result = await deduplicateActivities(db);

    expect(result.duplicateGroups).toBe(2);
    expect(result.deleted).toBe(3); // 2 from group 1, 1 from group 2

    // One surviving per group
    const xRows = await db.select().from(activities).where(eq(activities.frontId, "msg_x"));
    expect(xRows).toHaveLength(1);
    expect(xRows[0].displayId).toBe("ACT-AAA-010"); // oldest

    const yRows = await db.select().from(activities).where(eq(activities.frontId, "msg_y"));
    expect(yRows).toHaveLength(1);
    expect(yRows[0].displayId).toBe("ACT-AAA-020"); // oldest
  });

  it("deletes activity_opportunities junction rows before deleting duplicate", async () => {
    const db = getTestDb();

    const keepId = createId();
    const dupeId = createId();
    const oppId = createId();

    // Seed opportunity
    await db.insert(opportunities).values({
      id: oppId,
      displayId: "OPP-AAA-001",
      stage: "open",
      seatsRequested: 1,
      passengerSeats: 1,
      petSeats: 0,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    });

    await db.insert(activities).values(
      makeActivity({ id: keepId, displayId: "ACT-AAA-030", frontId: "msg_j", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" }),
    );
    await db.insert(activities).values(
      makeActivity({ id: dupeId, displayId: "ACT-AAA-031", frontId: "msg_j", createdAt: "2025-01-02T00:00:00Z", updatedAt: "2025-01-02T00:00:00Z" }),
    );

    // Link duplicate to opportunity
    await db.insert(activityOpportunities).values({
      id: createId(),
      activityId: dupeId,
      opportunityId: oppId,
      createdAt: "2025-01-02T00:00:00Z",
    });

    const result = await deduplicateActivities(db);

    expect(result.junctionRowsDeleted).toBe(1);
    expect(result.deleted).toBe(1);

    // Junction row should be gone
    const junctions = await db.select().from(activityOpportunities).where(eq(activityOpportunities.activityId, dupeId));
    expect(junctions).toHaveLength(0);
  });

  it("nullifies geo_interest_expression activityId refs before deleting duplicate", async () => {
    const db = getTestDb();

    const keepId = createId();
    const dupeId = createId();
    const humanId = createId();
    const geoId = createId();

    // Seed human and geo interest
    await db.insert(humans).values({
      id: humanId,
      displayId: "HUM-AAA-001",
      firstName: "Test",
      lastName: "Human",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    });
    await db.insert(geoInterests).values({
      id: geoId,
      displayId: "GEO-AAA-001",
      city: "London",
      country: "UK",
      createdAt: "2025-01-01T00:00:00Z",
    });

    await db.insert(activities).values(
      makeActivity({ id: keepId, displayId: "ACT-AAA-040", frontId: "msg_g", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" }),
    );
    await db.insert(activities).values(
      makeActivity({ id: dupeId, displayId: "ACT-AAA-041", frontId: "msg_g", createdAt: "2025-01-02T00:00:00Z", updatedAt: "2025-01-02T00:00:00Z" }),
    );

    // Link geo expression to duplicate
    const gexId = createId();
    await db.insert(geoInterestExpressions).values({
      id: gexId,
      displayId: "GEX-AAA-001",
      humanId,
      geoInterestId: geoId,
      activityId: dupeId,
      createdAt: "2025-01-02T00:00:00Z",
    });

    const result = await deduplicateActivities(db);

    expect(result.expressionRefsNullified).toBeGreaterThanOrEqual(1);

    // Expression should still exist but activityId should be null
    const exprs = await db.select().from(geoInterestExpressions).where(eq(geoInterestExpressions.id, gexId));
    expect(exprs).toHaveLength(1);
    expect(exprs[0].activityId).toBeNull();
  });

  it("nullifies route_interest_expression activityId refs before deleting duplicate", async () => {
    const db = getTestDb();

    const keepId = createId();
    const dupeId = createId();
    const humanId = createId();
    const routeId = createId();

    // Seed human and route interest
    await db.insert(humans).values({
      id: humanId,
      displayId: "HUM-AAA-002",
      firstName: "Route",
      lastName: "Tester",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    });
    await db.insert(routeInterests).values({
      id: routeId,
      displayId: "ROI-AAA-001",
      originCity: "London",
      originCountry: "UK",
      destinationCity: "New York",
      destinationCountry: "US",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    });

    await db.insert(activities).values(
      makeActivity({ id: keepId, displayId: "ACT-AAA-050", frontId: "msg_r", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" }),
    );
    await db.insert(activities).values(
      makeActivity({ id: dupeId, displayId: "ACT-AAA-051", frontId: "msg_r", createdAt: "2025-01-02T00:00:00Z", updatedAt: "2025-01-02T00:00:00Z" }),
    );

    // Link route expression to duplicate
    const rexId = createId();
    await db.insert(routeInterestExpressions).values({
      id: rexId,
      displayId: "REX-AAA-001",
      humanId,
      routeInterestId: routeId,
      activityId: dupeId,
      createdAt: "2025-01-02T00:00:00Z",
    });

    const result = await deduplicateActivities(db);

    expect(result.expressionRefsNullified).toBeGreaterThanOrEqual(1);

    // Expression should still exist but activityId should be null
    const exprs = await db.select().from(routeInterestExpressions).where(eq(routeInterestExpressions.id, rexId));
    expect(exprs).toHaveLength(1);
    expect(exprs[0].activityId).toBeNull();
  });
});
