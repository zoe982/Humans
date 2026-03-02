import { describe, it, expect } from "vitest";
import { eq, sql } from "drizzle-orm";
import { getTestDb } from "../setup";
import {
  listActivities,
  getActivityDetail,
  createActivity,
  updateActivity,
  deleteActivity,
  linkActivityOpportunity,
  unlinkActivityOpportunity,
} from "../../../src/services/activities";
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

async function seedAccount(db: ReturnType<typeof getTestDb>, id = "acc-1", name = "Acme Corp") {
  const ts = now();
  await db.insert(schema.accounts).values({
    id,
    displayId: nextDisplayId("ACC"),
    name,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedActivity(
  db: ReturnType<typeof getTestDb>,
  id: string,
  overrides: Partial<{
    type: string;
    subject: string;
    body: string | null;
    notes: string | null;
    activityDate: string;
    humanId: string | null;
    accountId: string | null;
    routeSignupId: string | null;
    colleagueId: string | null;
    syncRunId: string | null;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.activities).values({
    id,
    displayId: nextDisplayId("ACT"),
    type: overrides.type ?? "email",
    subject: overrides.subject ?? "Test Subject",
    body: overrides.body ?? null,
    notes: overrides.notes ?? null,
    activityDate: overrides.activityDate ?? ts,
    humanId: overrides.humanId ?? null,
    accountId: overrides.accountId ?? null,
    routeSignupId: overrides.routeSignupId ?? null,
    colleagueId: overrides.colleagueId !== undefined ? overrides.colleagueId : "col-1",
    syncRunId: overrides.syncRunId ?? null,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedOpportunity(db: ReturnType<typeof getTestDb>, id: string) {
  const ts = now();
  await db.insert(schema.opportunities).values({
    id,
    displayId: nextDisplayId("OPP"),
    stage: "open",
    seatsRequested: 1,
    passengerSeats: 1,
    petSeats: 0,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

// ─── listActivities ──────────────────────────────────────────────────────────

describe("listActivities", () => {
  it("returns empty list when no activities", async () => {
    const db = getTestDb();
    const result = await listActivities(db, { page: 1, limit: 25 });
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it("filters by humanId and type", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1");

    await seedActivity(db, "act-1", { humanId: "h-1", type: "email" });
    await seedActivity(db, "act-2", { humanId: "h-1", type: "phone_call" });
    await seedActivity(db, "act-3", { humanId: null, type: "email" });

    const byHuman = await listActivities(db, { humanId: "h-1", page: 1, limit: 25 });
    expect(byHuman.data).toHaveLength(2);
    expect(byHuman.meta.total).toBe(2);

    const byType = await listActivities(db, { type: "phone_call", page: 1, limit: 25 });
    expect(byType.data).toHaveLength(1);
    expect(byType.data[0]!.id).toBe("act-2");
  });

  it("respects pagination", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedActivity(db, "act-1");
    await seedActivity(db, "act-2");
    await seedActivity(db, "act-3");

    const page1 = await listActivities(db, { page: 1, limit: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.meta.total).toBe(3);

    const page2 = await listActivities(db, { page: 2, limit: 2 });
    expect(page2.data).toHaveLength(1);
  });

  it("filters by text search query on subject and notes", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedActivity(db, "act-1", { subject: "Tokyo flight inquiry", notes: null });
    await seedActivity(db, "act-2", { subject: "Pet transport", notes: "Transporting a dog to Tokyo" });
    await seedActivity(db, "act-3", { subject: "Unrelated subject", notes: null });

    const result = await listActivities(db, { q: "Tokyo", page: 1, limit: 25 });
    expect(result.data).toHaveLength(2);

    const ids = result.data.map((a) => a.id);
    expect(ids).toContain("act-1");
    expect(ids).toContain("act-2");
  });

  it("enriches with human name and account name", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedAccount(db, "acc-1", "Acme Corp");

    await seedActivity(db, "act-1", { humanId: "h-1", accountId: "acc-1" });

    const result = await listActivities(db, { page: 1, limit: 25 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.humanName).toBe("Alice Smith");
    expect(result.data[0]!.accountName).toBe("Acme Corp");
  });
});

// ─── getActivityDetail ───────────────────────────────────────────────────────

describe("getActivityDetail", () => {
  it("throws notFound for missing activity", async () => {
    const db = getTestDb();
    await expect(getActivityDetail(db, "nonexistent")).rejects.toThrowError("Activity not found");
  });

  it("returns activity with human name and account name", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1", "Jane", "Doe");
    await seedAccount(db, "acc-1", "WidgetCo");

    await seedActivity(db, "act-1", { humanId: "h-1", accountId: "acc-1" });

    const result = await getActivityDetail(db, "act-1");
    expect(result.humanName).toBe("Jane Doe");
    expect(result.accountName).toBe("WidgetCo");
    expect(result.geoInterestExpressions).toHaveLength(0);
  });

  it("returns ownerName and ownerDisplayId when colleagueId is set", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedActivity(db, "act-1", { colleagueId: "col-1" });

    const result = await getActivityDetail(db, "act-1");
    expect(result.ownerName).toBe("Test User");
    expect(result.ownerDisplayId).toMatch(/^COL-/);
    expect(result.ownerId).toBe("col-1");
  });

  it("returns null ownerName and ownerDisplayId when colleagueId is not set", async () => {
    const db = getTestDb();
    // Seed a colleague so seedActivity works but don't link it to the activity
    await seedColleague(db, "col-1");
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-orphan",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "No owner",
      activityDate: ts,
      humanId: null,
      accountId: null,
      colleagueId: null,
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await getActivityDetail(db, "act-orphan");
    expect(result.ownerName).toBeNull();
    expect(result.ownerDisplayId).toBeNull();
    expect(result.ownerId).toBeNull();
  });

  it("returns geo-interest expressions with city and country", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-1");
    await seedActivity(db, "act-1", { humanId: "h-1" });

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", activityId: "act-1", createdAt: ts,
    });

    const result = await getActivityDetail(db, "act-1");
    expect(result.geoInterestExpressions).toHaveLength(1);
    expect(result.geoInterestExpressions[0]!.city).toBe("Paris");
    expect(result.geoInterestExpressions[0]!.country).toBe("France");
  });

  it("returns route-interest expressions with origin and destination data", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-1");
    await seedActivity(db, "act-1", { humanId: "h-1" });

    await db.insert(schema.routeInterests).values({
      id: "ri-1", displayId: nextDisplayId("ROI"),
      originCity: "London", originCountry: "UK",
      destinationCity: "Paris", destinationCountry: "France",
      createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1", displayId: nextDisplayId("REX"),
      humanId: "h-1", routeInterestId: "ri-1", activityId: "act-1",
      frequency: "one_time", createdAt: ts,
    });

    const result = await getActivityDetail(db, "act-1");
    expect(result.routeInterestExpressions).toHaveLength(1);
    expect(result.routeInterestExpressions[0]!.originCity).toBe("London");
    expect(result.routeInterestExpressions[0]!.destinationCity).toBe("Paris");
  });
});

// ─── createActivity ──────────────────────────────────────────────────────────

describe("createActivity", () => {
  it("creates activity with minimal fields", async () => {
    const db = getTestDb();
    await seedColleague(db);

    const result = await createActivity(db, { activityDate: now() }, "col-1");
    expect(result.id).toBeDefined();
    expect(result.type).toBe("email");
    expect(result.subject).toBe("");
    expect(result.colleagueId).toBe("col-1");

    const rows = await db.select().from(schema.activities);
    expect(rows).toHaveLength(1);
  });

  it("rejects duplicate frontId with conflict error", async () => {
    const db = getTestDb();
    await seedColleague(db);

    await createActivity(db, { activityDate: now(), frontId: "front-dup-1" }, "col-1");

    await expect(
      createActivity(db, { activityDate: now(), frontId: "front-dup-1" }, "col-1"),
    ).rejects.toThrowError("Activity with Front ID front-dup-1 already exists");
  });

  it("allows duplicate null frontId (no conflict)", async () => {
    const db = getTestDb();
    await seedColleague(db);

    await createActivity(db, { activityDate: now(), frontId: null }, "col-1");
    const second = await createActivity(db, { activityDate: now(), frontId: null }, "col-1");
    expect(second.id).toBeDefined();
    expect(second.frontId).toBeNull();
  });

  it("creates activity with all optional fields", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1");
    await seedAccount(db, "acc-1");
    const ts = now();

    const result = await createActivity(
      db,
      {
        type: "phone_call",
        subject: "Follow-up call",
        notes: "Discussed pricing",
        activityDate: ts,
        humanId: "h-1",
        accountId: "acc-1",
        routeSignupId: "rs-1",
        gmailId: "gmail-123",
        frontId: "front-456",
      },
      "col-1",
    );

    expect(result.type).toBe("phone_call");
    expect(result.subject).toBe("Follow-up call");
    expect(result.notes).toBe("Discussed pricing");
    expect(result.body).toBe("Discussed pricing");
    expect(result.humanId).toBe("h-1");
    expect(result.accountId).toBe("acc-1");
    expect(result.routeSignupId).toBe("rs-1");
    expect(result.gmailId).toBe("gmail-123");
    expect(result.frontId).toBe("front-456");
  });
});

// ─── updateActivity ──────────────────────────────────────────────────────────

describe("updateActivity", () => {
  it("throws notFound for missing activity", async () => {
    const db = getTestDb();
    await expect(updateActivity(db, "nonexistent", { subject: "X" })).rejects.toThrowError("Activity not found");
  });

  it("updates specified fields", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedActivity(db, "act-1", { subject: "Old Subject", type: "email" });

    const result = await updateActivity(db, "act-1", { subject: "New Subject", type: "call" });
    expect(result!.subject).toBe("New Subject");
    expect(result!.type).toBe("call");
  });

  it("keeps body in sync with notes", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedActivity(db, "act-1", { notes: "old notes", body: "old notes" });

    const result = await updateActivity(db, "act-1", { notes: "new notes" });
    expect(result!.notes).toBe("new notes");
    expect(result!.body).toBe("new notes");
  });

  it("updates gmailId, frontId, frontConversationId, and syncRunId", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedActivity(db, "act-1");

    // Seed a front_sync_runs row to satisfy the FK on syncRunId
    const ts = now();
    await db.insert(schema.frontSyncRuns).values({
      id: "sync-456",
      displayId: nextDisplayId("FRY"),
      status: "completed",
      startedAt: ts,
      completedAt: ts,
      createdAt: ts,
    });

    const result = await updateActivity(db, "act-1", {
      gmailId: "gmail-abc",
      frontId: "front-xyz",
      frontConversationId: "conv-123",
      syncRunId: "sync-456",
    });
    expect(result!.gmailId).toBe("gmail-abc");
    expect(result!.frontId).toBe("front-xyz");
    expect(result!.frontConversationId).toBe("conv-123");
    expect(result!.syncRunId).toBe("sync-456");
  });

  it("updates colleagueId to reassign ownership", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedColleague(db, "col-2");
    await seedActivity(db, "act-1", { colleagueId: "col-1" });

    const result = await updateActivity(db, "act-1", { colleagueId: "col-2" });
    expect(result!.colleagueId).toBe("col-2");
  });

  it("clears colleagueId by setting it to null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedActivity(db, "act-1", { colleagueId: "col-1" });

    const result = await updateActivity(db, "act-1", { colleagueId: null });
    expect(result!.colleagueId).toBeNull();
  });
});

// ─── deleteActivity ──────────────────────────────────────────────────────────

describe("deleteActivity", () => {
  it("throws notFound for missing activity", async () => {
    const db = getTestDb();
    await expect(deleteActivity(db, "nonexistent")).rejects.toThrowError("Activity not found");
  });

  it("deletes activity and nullifies geo-expression activityId", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-1");
    await seedActivity(db, "act-1", { humanId: "h-1" });

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GIE"), humanId: "h-1", geoInterestId: "gi-1", activityId: "act-1", createdAt: ts,
    });

    await deleteActivity(db, "act-1");

    const activities = await db.select().from(schema.activities);
    expect(activities).toHaveLength(0);

    const expressions = await db.select().from(schema.geoInterestExpressions);
    expect(expressions).toHaveLength(1);
    expect(expressions[0]!.activityId).toBeNull();
  });
});

// ─── listActivities with includeLinkedEntities ────────────────────────────────

describe("listActivities with includeLinkedEntities", () => {
  it("includes geoInterestExpressions, routeInterestExpressions, and linkedOpportunities when flag is set", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-1");
    await seedActivity(db, "act-1", { humanId: "h-1" });
    await seedOpportunity(db, "opp-1");

    // Seed geo interest + expression
    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Rome", country: "Italy", createdAt: ts });
    await db.insert(schema.geoInterestExpressions).values({
      id: "gex-1", displayId: nextDisplayId("GEX"), humanId: "h-1", geoInterestId: "gi-1", activityId: "act-1", createdAt: ts,
    });

    // Seed route interest + expression
    await db.insert(schema.routeInterests).values({
      id: "ri-1", displayId: nextDisplayId("ROI"),
      originCity: "NYC", originCountry: "USA",
      destinationCity: "Rome", destinationCountry: "Italy",
      createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1", displayId: nextDisplayId("REX"),
      humanId: "h-1", routeInterestId: "ri-1", activityId: "act-1",
      frequency: "one_time", createdAt: ts,
    });

    // Seed activity-opportunity link
    await db.insert(schema.activityOpportunities).values({
      id: "ao-1", activityId: "act-1", opportunityId: "opp-1", createdAt: ts,
    });

    const result = await listActivities(db, { page: 1, limit: 25, includeLinkedEntities: true });

    expect(result.data).toHaveLength(1);
    const act = result.data[0]!;

    expect(act.geoInterestExpressions).toHaveLength(1);
    const geoExpr = act.geoInterestExpressions[0] as { city: string; country: string };
    expect(geoExpr.city).toBe("Rome");
    expect(geoExpr.country).toBe("Italy");

    expect(act.routeInterestExpressions).toHaveLength(1);
    const routeExpr = act.routeInterestExpressions[0] as { originCity: string; destinationCity: string };
    expect(routeExpr.originCity).toBe("NYC");
    expect(routeExpr.destinationCity).toBe("Rome");

    expect(act.linkedOpportunities).toHaveLength(1);
    const opp = act.linkedOpportunities[0] as { opportunityId: string; stage: string };
    expect(opp.opportunityId).toBe("opp-1");
    expect(opp.stage).toBe("open");
  });

  it("returns empty arrays for linked entities when activity has none", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedActivity(db, "act-1");

    const result = await listActivities(db, { page: 1, limit: 25, includeLinkedEntities: true });

    expect(result.data).toHaveLength(1);
    const act = result.data[0]!;
    expect(act.geoInterestExpressions).toHaveLength(0);
    expect(act.routeInterestExpressions).toHaveLength(0);
    expect(act.linkedOpportunities).toHaveLength(0);
  });

  it("does not include linked entity arrays when flag is not set", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedActivity(db, "act-1");

    const result = await listActivities(db, { page: 1, limit: 25 });

    expect(result.data).toHaveLength(1);
    const act = result.data[0]!;
    expect(act).not.toHaveProperty("geoInterestExpressions");
    expect(act).not.toHaveProperty("routeInterestExpressions");
    expect(act).not.toHaveProperty("linkedOpportunities");
  });
});

// ─── getActivityDetail — additional coverage ──────────────────────────────────

describe("getActivityDetail — additional coverage", () => {
  it("returns linkedOpportunities via the junction table", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedActivity(db, "act-1");
    await seedOpportunity(db, "opp-1");

    await db.insert(schema.activityOpportunities).values({
      id: "ao-1", activityId: "act-1", opportunityId: "opp-1", createdAt: ts,
    });

    const result = await getActivityDetail(db, "act-1");

    expect(result.linkedOpportunities).toHaveLength(1);
    const opp = result.linkedOpportunities[0] as { opportunityId: string; stage: string; displayId: string };
    expect(opp.opportunityId).toBe("opp-1");
    expect(opp.stage).toBe("open");
    expect(opp.displayId).toMatch(/^OPP-/);
  });

  it("returns ownerName as 'Front Sync' when syncRunId is set but colleagueId is null", async () => {
    const db = getTestDb();
    const ts = now();

    // Seed a front sync run to satisfy the FK
    await db.insert(schema.frontSyncRuns).values({
      id: "sync-1",
      displayId: nextDisplayId("FRY"),
      status: "completed",
      startedAt: ts,
      completedAt: ts,
      createdAt: ts,
    });

    // Insert activity directly with syncRunId set and no colleagueId
    await db.insert(schema.activities).values({
      id: "act-sync",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Synced message",
      activityDate: ts,
      humanId: null,
      accountId: null,
      colleagueId: null,
      syncRunId: "sync-1",
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await getActivityDetail(db, "act-sync");
    expect(result.ownerName).toBe("Front Sync");
    expect(result.ownerDisplayId).toBeNull();
    expect(result.ownerId).toBeNull();
  });

  it("returns null humanName, accountName, and empty linked entities when all FKs are null", async () => {
    const db = getTestDb();
    const ts = now();

    // Insert activity with no human, no account, no colleague
    await db.insert(schema.activities).values({
      id: "act-bare",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Bare activity",
      activityDate: ts,
      humanId: null,
      accountId: null,
      colleagueId: null,
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await getActivityDetail(db, "act-bare");
    expect(result.humanName).toBeNull();
    expect(result.humanDisplayId).toBeNull();
    expect(result.accountName).toBeNull();
    expect(result.ownerName).toBeNull();
    expect(result.ownerDisplayId).toBeNull();
    expect(result.ownerId).toBeNull();
    expect(result.geoInterestExpressions).toHaveLength(0);
    expect(result.routeInterestExpressions).toHaveLength(0);
    expect(result.linkedOpportunities).toHaveLength(0);
  });
});

// ─── linkActivityOpportunity ──────────────────────────────────────────────────

describe("linkActivityOpportunity", () => {
  it("creates a new link and returns an object with the expected fields", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedActivity(db, "act-1");
    await seedOpportunity(db, "opp-1");

    const link = await linkActivityOpportunity(db, "act-1", "opp-1");

    expect(link).toBeDefined();
    expect(link!.id).toBeDefined();
    expect(link!.activityId).toBe("act-1");
    expect(link!.opportunityId).toBe("opp-1");
    expect(link!.createdAt).toBeDefined();

    // Verify row persisted in database
    const rows = await db.select().from(schema.activityOpportunities);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.activityId).toBe("act-1");
    expect(rows[0]!.opportunityId).toBe("opp-1");
  });

  it("returns the existing link without inserting a duplicate when called twice with the same ids", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedActivity(db, "act-1");
    await seedOpportunity(db, "opp-1");

    const first = await linkActivityOpportunity(db, "act-1", "opp-1");
    const second = await linkActivityOpportunity(db, "act-1", "opp-1");

    expect(second!.id).toBe(first!.id);

    // Only one row should exist
    const rows = await db.select().from(schema.activityOpportunities);
    expect(rows).toHaveLength(1);
  });
});

// ─── updateActivity — additional optional field branches ─────────────────────

describe("updateActivity — all optional FK fields", () => {
  it("updates routeSignupId, websiteBookingRequestId, generalLeadId, humanId, and accountId", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedAccount(db, "acc-1", "Acme Corp");
    // Seed a general lead for the FK constraint
    await db.insert(schema.generalLeads).values({
      id: "gl-test", displayId: "LEA-TEST-001", status: "open", firstName: "Test", lastName: "Lead",
      createdAt: ts, updatedAt: ts,
    });
    await seedActivity(db, "act-upd-all", { humanId: null, accountId: null });

    const result = await updateActivity(db, "act-upd-all", {
      humanId: "h-1",
      accountId: "acc-1",
      routeSignupId: "rs-test",
      websiteBookingRequestId: "wbr-test",
      generalLeadId: "gl-test",
      direction: "inbound",
    });

    expect(result!.humanId).toBe("h-1");
    expect(result!.accountId).toBe("acc-1");
    expect(result!.routeSignupId).toBe("rs-test");
    expect(result!.websiteBookingRequestId).toBe("wbr-test");
    expect(result!.generalLeadId).toBe("gl-test");
    expect(result!.direction).toBe("inbound");
  });
});

// ─── listActivities — geoExpression with null activityId ─────────────────────

describe("listActivities — null activityId on geo expression (branch coverage)", () => {
  it("skips geo expression with null activityId when grouping by activity", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-geo-null");
    await seedActivity(db, "act-geo-null", { humanId: "h-geo-null" });

    // Create a geo interest + expression where activityId is NULL (not linked to the activity)
    await db.insert(schema.geoInterests).values({
      id: "gi-null", displayId: nextDisplayId("GEO"), city: "Oslo", country: "Norway", createdAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "gex-null", displayId: nextDisplayId("GEX"),
      humanId: "h-geo-null", geoInterestId: "gi-null",
      activityId: null, // null activityId — exercises the `if (expr.activityId == null) continue` branch
      createdAt: ts,
    });

    const result = await listActivities(db, {
      humanId: "h-geo-null", page: 1, limit: 25, includeLinkedEntities: true,
    });

    expect(result.data).toHaveLength(1);
    // The activity has no linked geo expressions because the expression's activityId is null
    const act = result.data[0]!;
    expect(act.geoInterestExpressions).toHaveLength(0);
  });

  it("skips route expression with null activityId when grouping by activity", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-route-null");
    await seedActivity(db, "act-route-null", { humanId: "h-route-null" });

    // Create a route interest + expression where activityId is NULL
    await db.insert(schema.routeInterests).values({
      id: "ri-null", displayId: nextDisplayId("ROI"),
      originCity: "NYC", originCountry: "USA",
      destinationCity: "LAX", destinationCountry: "USA",
      createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-null", displayId: nextDisplayId("REX"),
      humanId: "h-route-null", routeInterestId: "ri-null",
      activityId: null, // null activityId — exercises the `if (expr.activityId == null) continue` branch
      frequency: "one_time", createdAt: ts,
    });

    const result = await listActivities(db, {
      humanId: "h-route-null", page: 1, limit: 25, includeLinkedEntities: true,
    });

    expect(result.data).toHaveLength(1);
    const act = result.data[0]!;
    expect(act.routeInterestExpressions).toHaveLength(0);
  });
});

// ─── listActivities — filter branches ────────────────────────────────────────

describe("listActivities — additional filter branches", () => {
  it("filters by routeSignupId", async () => {
    const db = getTestDb();
    await seedColleague(db);
    // Insert an activity directly with routeSignupId set (no FK constraint on this column)
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-rs-1",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Route signup activity",
      activityDate: ts,
      routeSignupId: "rs-target",
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });
    await db.insert(schema.activities).values({
      id: "act-rs-2",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Other activity",
      activityDate: ts,
      routeSignupId: null,
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await listActivities(db, { routeSignupId: "rs-target", page: 1, limit: 25 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("act-rs-1");
    expect(result.data[0]!.routeSignupId).toBe("rs-target");
  });

  it("filters by websiteBookingRequestId", async () => {
    const db = getTestDb();
    await seedColleague(db);
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-wbr-1",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "WBR activity",
      activityDate: ts,
      websiteBookingRequestId: "wbr-target",
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });
    await db.insert(schema.activities).values({
      id: "act-wbr-2",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Other activity",
      activityDate: ts,
      websiteBookingRequestId: null,
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await listActivities(db, { websiteBookingRequestId: "wbr-target", page: 1, limit: 25 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("act-wbr-1");
    expect(result.data[0]!.websiteBookingRequestId).toBe("wbr-target");
  });

  it("filters by generalLeadId", async () => {
    const db = getTestDb();
    await seedColleague(db);
    const ts = now();
    // Seed a general lead to satisfy the FK
    await db.insert(schema.generalLeads).values({
      id: "gl-filter-1",
      displayId: "LEA-FILTER-001",
      status: "open",
      firstName: "Filter",
      lastName: "Lead",
      createdAt: ts,
      updatedAt: ts,
    });
    await db.insert(schema.activities).values({
      id: "act-gl-1",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "General lead activity",
      activityDate: ts,
      generalLeadId: "gl-filter-1",
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });
    await seedActivity(db, "act-gl-2", {});

    const result = await listActivities(db, { generalLeadId: "gl-filter-1", page: 1, limit: 25 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("act-gl-1");
    expect(result.data[0]!.generalLeadId).toBe("gl-filter-1");
  });

  it("filters by accountId", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedAccount(db, "acc-filter", "Filter Corp");
    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-acc-1",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Account activity",
      activityDate: ts,
      accountId: "acc-filter",
      colleagueId: "col-1",
      createdAt: ts,
      updatedAt: ts,
    });
    await seedActivity(db, "act-acc-2", { accountId: null });

    const result = await listActivities(db, { accountId: "acc-filter", page: 1, limit: 25 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("act-acc-1");
    expect(result.data[0]!.accountName).toBe("Filter Corp");
  });

  it("filters by dateFrom — only returns activities on or after the date", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await db.insert(schema.activities).values({
      id: "act-date-old",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Old activity",
      activityDate: "2025-01-01T00:00:00.000Z",
      colleagueId: "col-1",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });
    await db.insert(schema.activities).values({
      id: "act-date-new",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "New activity",
      activityDate: "2026-06-01T00:00:00.000Z",
      colleagueId: "col-1",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    });

    const result = await listActivities(db, { dateFrom: "2026-01-01T00:00:00.000Z", page: 1, limit: 25 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("act-date-new");
  });

  it("filters by dateTo — only returns activities on or before the date", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await db.insert(schema.activities).values({
      id: "act-date-old",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Old activity",
      activityDate: "2025-01-01T00:00:00.000Z",
      colleagueId: "col-1",
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });
    await db.insert(schema.activities).values({
      id: "act-date-new",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "New activity",
      activityDate: "2026-06-01T00:00:00.000Z",
      colleagueId: "col-1",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    });

    const result = await listActivities(db, { dateTo: "2025-12-31T23:59:59.999Z", page: 1, limit: 25 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("act-date-old");
  });

  it("ignores an invalid type filter and returns all activities", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedActivity(db, "act-type-1", { type: "email" });
    await seedActivity(db, "act-type-2", { type: "phone_call" });

    // "invalid_type" is not in the valid types list — the condition is skipped
    const result = await listActivities(db, { type: "invalid_type", page: 1, limit: 25 });
    expect(result.data).toHaveLength(2);
  });
});

// ─── listActivities — orphaned geo interest in includeLinkedEntities ──────────

describe("listActivities — orphaned geo interest (includeLinkedEntities)", () => {
  it("returns city: null and country: null when expression's geoInterestId does not resolve", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-gi-orphan");
    await seedActivity(db, "act-gi-orphan", { humanId: "h-gi-orphan" });

    // Insert a real geo interest so FK is satisfied on insert
    await db.insert(schema.geoInterests).values({
      id: "gi-orphan-real", displayId: nextDisplayId("GEO"), city: "Tokyo", country: "Japan", createdAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "gex-act-orphan", displayId: nextDisplayId("GEX"),
      humanId: "h-gi-orphan", geoInterestId: "gi-orphan-real", activityId: "act-gi-orphan",
      createdAt: ts,
    });

    // Orphan the expression by updating its geoInterestId to a value that doesn't exist
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(
      sql`UPDATE geo_interest_expressions SET geo_interest_id = 'orphan-gi-list' WHERE id = 'gex-act-orphan'`,
    );
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await listActivities(db, {
      humanId: "h-gi-orphan", page: 1, limit: 25, includeLinkedEntities: true,
    });

    expect(result.data).toHaveLength(1);
    const act = result.data[0]!;
    expect(act.geoInterestExpressions).toHaveLength(1);
    const geoExpr = act.geoInterestExpressions[0] as { city: string | null; country: string | null };
    expect(geoExpr.city).toBeNull();
    expect(geoExpr.country).toBeNull();
  });
});

// ─── listActivities — orphaned route interest in includeLinkedEntities ────────

describe("listActivities — orphaned route interest (includeLinkedEntities)", () => {
  it("returns all route fields as null when expression's routeInterestId does not resolve", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-ri-orphan");
    await seedActivity(db, "act-ri-orphan", { humanId: "h-ri-orphan" });

    // Insert a real route interest so FK is satisfied on insert
    await db.insert(schema.routeInterests).values({
      id: "ri-orphan-real", displayId: nextDisplayId("ROI"),
      originCity: "Sydney", originCountry: "Australia",
      destinationCity: "Auckland", destinationCountry: "New Zealand",
      createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-act-orphan", displayId: nextDisplayId("REX"),
      humanId: "h-ri-orphan", routeInterestId: "ri-orphan-real", activityId: "act-ri-orphan",
      frequency: "one_time", createdAt: ts,
    });

    // Orphan the expression by updating its routeInterestId to a value that doesn't exist
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(
      sql`UPDATE route_interest_expressions SET route_interest_id = 'orphan-ri-list' WHERE id = 'rex-act-orphan'`,
    );
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await listActivities(db, {
      humanId: "h-ri-orphan", page: 1, limit: 25, includeLinkedEntities: true,
    });

    expect(result.data).toHaveLength(1);
    const act = result.data[0]!;
    expect(act.routeInterestExpressions).toHaveLength(1);
    const routeExpr = act.routeInterestExpressions[0] as {
      originCity: string | null;
      originCountry: string | null;
      destinationCity: string | null;
      destinationCountry: string | null;
    };
    expect(routeExpr.originCity).toBeNull();
    expect(routeExpr.originCountry).toBeNull();
    expect(routeExpr.destinationCity).toBeNull();
    expect(routeExpr.destinationCountry).toBeNull();
  });
});

// ─── getActivityDetail — orphaned geo interest expression ─────────────────────

describe("getActivityDetail — orphaned geo interest expression", () => {
  it("returns city: null and country: null when expression's geoInterestId does not resolve", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-detail-gi-orphan");
    await seedActivity(db, "act-detail-gi-orphan", { humanId: "h-detail-gi-orphan" });

    // Insert a real geo interest so FK is satisfied on insert
    await db.insert(schema.geoInterests).values({
      id: "gi-detail-real", displayId: nextDisplayId("GEO"), city: "Madrid", country: "Spain", createdAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "gex-detail-orphan", displayId: nextDisplayId("GEX"),
      humanId: "h-detail-gi-orphan", geoInterestId: "gi-detail-real",
      activityId: "act-detail-gi-orphan", createdAt: ts,
    });

    // Orphan the expression by updating its geoInterestId to a non-existent value
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(
      sql`UPDATE geo_interest_expressions SET geo_interest_id = 'orphan-gi-detail' WHERE id = 'gex-detail-orphan'`,
    );
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await getActivityDetail(db, "act-detail-gi-orphan");

    expect(result.geoInterestExpressions).toHaveLength(1);
    const expr = result.geoInterestExpressions[0] as { city: string | null; country: string | null };
    expect(expr.city).toBeNull();
    expect(expr.country).toBeNull();
  });
});

// ─── getActivityDetail — orphaned route interest expression ───────────────────

describe("getActivityDetail — orphaned route interest expression", () => {
  it("returns all route fields as null when expression's routeInterestId does not resolve", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-detail-ri-orphan");
    await seedActivity(db, "act-detail-ri-orphan", { humanId: "h-detail-ri-orphan" });

    // Insert a real route interest so FK is satisfied on insert
    await db.insert(schema.routeInterests).values({
      id: "ri-detail-real", displayId: nextDisplayId("ROI"),
      originCity: "Dublin", originCountry: "Ireland",
      destinationCity: "Amsterdam", destinationCountry: "Netherlands",
      createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-detail-orphan", displayId: nextDisplayId("REX"),
      humanId: "h-detail-ri-orphan", routeInterestId: "ri-detail-real",
      activityId: "act-detail-ri-orphan", frequency: "one_time", createdAt: ts,
    });

    // Orphan the expression by updating its routeInterestId to a non-existent value
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(
      sql`UPDATE route_interest_expressions SET route_interest_id = 'orphan-ri-detail' WHERE id = 'rex-detail-orphan'`,
    );
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await getActivityDetail(db, "act-detail-ri-orphan");

    expect(result.routeInterestExpressions).toHaveLength(1);
    const expr = result.routeInterestExpressions[0] as {
      originCity: string | null;
      originCountry: string | null;
      destinationCity: string | null;
      destinationCountry: string | null;
    };
    expect(expr.originCity).toBeNull();
    expect(expr.originCountry).toBeNull();
    expect(expr.destinationCity).toBeNull();
    expect(expr.destinationCountry).toBeNull();
  });
});

// ─── createActivity — invalid type fallback ───────────────────────────────────

describe("createActivity — invalid type defaults to email", () => {
  it("defaults type to 'email' when an unrecognized type string is provided", async () => {
    const db = getTestDb();
    await seedColleague(db);

    const result = await createActivity(db, { type: "invalid_type", activityDate: now() }, "col-1");
    expect(result.type).toBe("email");
  });
});

// ─── updateActivity — activityDate branch ────────────────────────────────────

describe("updateActivity — activityDate field", () => {
  it("updates activityDate when provided", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedActivity(db, "act-date-upd", { activityDate: "2025-01-01T00:00:00.000Z" });

    const result = await updateActivity(db, "act-date-upd", { activityDate: "2026-01-15T00:00:00.000Z" });
    expect(result!.activityDate).toBe("2026-01-15T00:00:00.000Z");
  });
});

// ─── listActivities — syncRunId ownerName branch ─────────────────────────────

describe("listActivities — ownerName from syncRunId", () => {
  it("sets ownerName to 'Front Sync' when syncRunId is set but colleagueId is null", async () => {
    const db = getTestDb();
    const ts = now();

    // Seed a front sync run to satisfy the FK on syncRunId
    await db.insert(schema.frontSyncRuns).values({
      id: "sync-list-1",
      displayId: nextDisplayId("FRY"),
      status: "completed",
      startedAt: ts,
      completedAt: ts,
      createdAt: ts,
    });

    // Insert activity with syncRunId set and no colleagueId
    await db.insert(schema.activities).values({
      id: "act-sync-list",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Sync activity",
      activityDate: ts,
      humanId: null,
      accountId: null,
      colleagueId: null,
      syncRunId: "sync-list-1",
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await listActivities(db, { page: 1, limit: 25, includeLinkedEntities: true });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.ownerName).toBe("Front Sync");
    expect(result.data[0]!.ownerDisplayId).toBeNull();
    expect(result.data[0]!.ownerId).toBeNull();
  });
});

// ─── unlinkActivityOpportunity ────────────────────────────────────────────────

describe("unlinkActivityOpportunity", () => {
  it("deletes the link by id so it no longer exists in the database", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedActivity(db, "act-1");
    await seedOpportunity(db, "opp-1");

    await db.insert(schema.activityOpportunities).values({
      id: "ao-to-delete", activityId: "act-1", opportunityId: "opp-1", createdAt: ts,
    });

    await unlinkActivityOpportunity(db, "ao-to-delete");

    const rows = await db
      .select()
      .from(schema.activityOpportunities)
      .where(eq(schema.activityOpportunities.id, "ao-to-delete"));
    expect(rows).toHaveLength(0);
  });
});

// ─── listActivities — null activityId expressions skipped in batch ─────────

describe("listActivities — expressions with null activityId", () => {
  it("skips geo and route expressions with null activityId in includeLinkedEntities batch", async () => {
    const db = getTestDb();
    const ts = now();

    // Seed human
    await db.insert(schema.humans).values({
      id: "h-nullact",
      displayId: "HUM-NULLACT-001",
      firstName: "Null",
      lastName: "Act",
      status: "open",
      createdAt: ts,
      updatedAt: ts,
    });

    // Seed activity linked to human
    await db.insert(schema.activities).values({
      id: "act-nullact",
      displayId: "ACT-NULLACT-001",
      type: "email",
      subject: "Test",
      activityDate: ts,
      humanId: "h-nullact",
      createdAt: ts,
      updatedAt: ts,
    });

    // Seed a geo interest
    await db.insert(schema.geoInterests).values({
      id: "gi-nullact",
      displayId: "GEO-NULLACT-001",
      city: "London",
      country: "UK",
      createdAt: ts,
      updatedAt: ts,
    });

    // Seed a route interest
    await db.insert(schema.routeInterests).values({
      id: "ri-nullact",
      displayId: "ROI-NULLACT-001",
      originCity: "London",
      originCountry: "UK",
      destinationCity: "Malta",
      destinationCountry: "Malta",
      createdAt: ts,
      updatedAt: ts,
    });

    // Seed geo expression with NULL activityId (linked to human only)
    await db.insert(schema.geoInterestExpressions).values({
      id: "gex-nullact",
      displayId: "GEX-NULLACT-001",
      humanId: "h-nullact",
      geoInterestId: "gi-nullact",
      activityId: null,
      createdAt: ts,
    });

    // Seed route expression with NULL activityId
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-nullact",
      displayId: "REX-NULLACT-001",
      humanId: "h-nullact",
      routeInterestId: "ri-nullact",
      activityId: null,
      createdAt: ts,
    });

    const result = await listActivities(db, {
      page: 1,
      limit: 10,
      humanId: "h-nullact",
      includeLinkedEntities: true,
    });

    expect(result.data).toHaveLength(1);
    // The expressions with null activityId should be skipped (not grouped under any activity)
    const activity = result.data[0]!;
    expect(activity.geoInterestExpressions).toHaveLength(0);
    expect(activity.routeInterestExpressions).toHaveLength(0);
  });
});
