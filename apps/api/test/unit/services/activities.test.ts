import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listActivities,
  getActivityDetail,
  createActivity,
  updateActivity,
  deleteActivity,
} from "../../../src/services/activities";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

async function seedColleague(db: ReturnType<typeof getTestDb>, id = "col-1") {
  const ts = now();
  await db.insert(schema.colleagues).values({
    id,
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
    createdByColleagueId: string;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.activities).values({
    id,
    type: overrides.type ?? "email",
    subject: overrides.subject ?? "Test Subject",
    body: overrides.body ?? null,
    notes: overrides.notes ?? null,
    activityDate: overrides.activityDate ?? ts,
    humanId: overrides.humanId ?? null,
    accountId: overrides.accountId ?? null,
    routeSignupId: overrides.routeSignupId ?? null,
    createdByColleagueId: overrides.createdByColleagueId ?? "col-1",
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
    await seedActivity(db, "act-2", { humanId: "h-1", type: "call" });
    await seedActivity(db, "act-3", { humanId: null, type: "email" });

    const byHuman = await listActivities(db, { humanId: "h-1", page: 1, limit: 25 });
    expect(byHuman.data).toHaveLength(2);
    expect(byHuman.meta.total).toBe(2);

    const byType = await listActivities(db, { type: "call", page: 1, limit: 25 });
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

  it("returns geo-interest expressions with city and country", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-1");
    await seedActivity(db, "act-1", { humanId: "h-1" });

    await db.insert(schema.geoInterests).values({ id: "gi-1", city: "Paris", country: "France", createdAt: ts });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", humanId: "h-1", geoInterestId: "gi-1", activityId: "act-1", createdAt: ts,
    });

    const result = await getActivityDetail(db, "act-1");
    expect(result.geoInterestExpressions).toHaveLength(1);
    expect(result.geoInterestExpressions[0]!.city).toBe("Paris");
    expect(result.geoInterestExpressions[0]!.country).toBe("France");
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
    expect(result.createdByColleagueId).toBe("col-1");

    const rows = await db.select().from(schema.activities);
    expect(rows).toHaveLength(1);
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
        type: "call",
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

    expect(result.type).toBe("call");
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

    await db.insert(schema.geoInterests).values({ id: "gi-1", city: "Paris", country: "France", createdAt: ts });
    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", humanId: "h-1", geoInterestId: "gi-1", activityId: "act-1", createdAt: ts,
    });

    await deleteActivity(db, "act-1");

    const activities = await db.select().from(schema.activities);
    expect(activities).toHaveLength(0);

    const expressions = await db.select().from(schema.geoInterestExpressions);
    expect(expressions).toHaveLength(1);
    expect(expressions[0]!.activityId).toBeNull();
  });
});
