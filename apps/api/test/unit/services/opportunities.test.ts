import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listOpportunities,
  createOpportunity,
  getOpportunityDetail,
  updateOpportunity,
  deleteOpportunity,
  updateOpportunityStage,
  linkOpportunityHuman,
  updateOpportunityHumanRole,
  unlinkOpportunityHuman,
  linkOpportunityPet,
  unlinkOpportunityPet,
  updateNextAction,
  linkOpportunityFlight,
  unlinkOpportunityFlight,
  getOpportunityBookingRequests,
  linkBookingRequest,
  unlinkBookingRequest,
  completeNextAction,
} from "../../../src/services/opportunities";
import * as schema from "@humans/db/schema";
import { eq } from "drizzle-orm";

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

async function seedRoles(db: ReturnType<typeof getTestDb>) {
  const ts = now();
  await db.insert(schema.opportunityHumanRolesConfig).values([
    { id: "role-primary", name: "primary", createdAt: ts },
    { id: "role-passenger", name: "passenger", createdAt: ts },
  ]);
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

async function seedPet(
  db: ReturnType<typeof getTestDb>,
  id = "pet-1",
  humanId: string | null = "h-1",
  name = "Buddy",
) {
  const ts = now();
  await db.insert(schema.pets).values({
    id,
    displayId: nextDisplayId("PET"),
    humanId,
    type: "dog",
    name,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedOpportunity(
  db: ReturnType<typeof getTestDb>,
  id = "opp-1",
  overrides: Partial<{
    stage: string;
    seatsRequested: number;
    passengerSeats: number;
    petSeats: number;
    notes: string | null;
    lossReason: string | null;
    ownerId: string | null;
    nextActionOwnerId: string | null;
    nextActionDescription: string | null;
    nextActionType: string | null;
    nextActionDueDate: string | null;
    nextActionCompletedAt: string | null;
    nextActionCadenceNote: string | null;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.opportunities).values({
    id,
    displayId: nextDisplayId("OPP"),
    stage: overrides.stage ?? "open",
    seatsRequested: overrides.seatsRequested ?? 1,
    passengerSeats: overrides.passengerSeats ?? 1,
    petSeats: overrides.petSeats ?? 0,
    notes: overrides.notes ?? null,
    lossReason: overrides.lossReason ?? null,
    ownerId: overrides.ownerId ?? null,
    nextActionOwnerId: overrides.nextActionOwnerId ?? null,
    nextActionDescription: overrides.nextActionDescription ?? null,
    nextActionType: overrides.nextActionType ?? null,
    nextActionDueDate: overrides.nextActionDueDate ?? null,
    nextActionCompletedAt: overrides.nextActionCompletedAt ?? null,
    nextActionCadenceNote: overrides.nextActionCadenceNote ?? null,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedActivity(
  db: ReturnType<typeof getTestDb>,
  id = "act-1",
  overrides: Partial<{
    opportunityId: string | null;
    colleagueId: string | null;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.activities).values({
    id,
    displayId: nextDisplayId("ACT"),
    type: "email",
    subject: "Test activity",
    activityDate: ts,
    opportunityId: overrides.opportunityId ?? null,
    colleagueId: overrides.colleagueId ?? null,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedBookingRequest(
  db: ReturnType<typeof getTestDb>,
  id = "br-1",
  humanId = "h-1",
  opportunityId: string | null = null,
) {
  await db.insert(schema.humanWebsiteBookingRequests).values({
    id,
    humanId,
    websiteBookingRequestId: `wbr-${id}`,
    opportunityId,
    linkedAt: now(),
  });
  return id;
}

// ─── listOpportunities ───────────────────────────────────────────────────────

describe("listOpportunities", () => {
  it("returns empty list with pagination meta when no opportunities exist", async () => {
    const db = getTestDb();
    const result = await listOpportunities(db, 1, 10, {});
    expect(result.data).toHaveLength(0);
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 0 });
  });

  it("returns opportunities with correct pagination meta", async () => {
    const db = getTestDb();
    await seedOpportunity(db, "opp-1");
    await seedOpportunity(db, "opp-2");
    await seedOpportunity(db, "opp-3");

    const page1 = await listOpportunities(db, 1, 2, {});
    expect(page1.data).toHaveLength(2);
    expect(page1.meta).toEqual({ page: 1, limit: 2, total: 3 });

    const page2 = await listOpportunities(db, 2, 2, {});
    expect(page2.data).toHaveLength(1);
    expect(page2.meta.total).toBe(3);
  });

  it("filters by stage", async () => {
    const db = getTestDb();
    await seedOpportunity(db, "opp-1", { stage: "open" });
    await seedOpportunity(db, "opp-2", { stage: "qualified" });
    await seedOpportunity(db, "opp-3", { stage: "open" });

    const result = await listOpportunities(db, 1, 10, { stage: "open" });
    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(result.data.every((o) => o.stage === "open")).toBe(true);
  });

  it("filters by ownerId (nextActionOwnerId)", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedColleague(db, "col-2");
    await seedOpportunity(db, "opp-1", { nextActionOwnerId: "col-1" });
    await seedOpportunity(db, "opp-2", { nextActionOwnerId: "col-2" });
    await seedOpportunity(db, "opp-3", { nextActionOwnerId: "col-1" });

    const result = await listOpportunities(db, 1, 10, { ownerId: "col-1" });
    expect(result.data).toHaveLength(2);
    expect(result.data.every((o) => o.nextActionOwnerId === "col-1")).toBe(true);
  });

  it("filters by dealOwnerId (opportunity ownerId)", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedColleague(db, "col-2");
    await seedOpportunity(db, "opp-1", { ownerId: "col-1" });
    await seedOpportunity(db, "opp-2", { ownerId: "col-2" });

    const result = await listOpportunities(db, 1, 10, { dealOwnerId: "col-1" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("opp-1");
  });

  it("filters by overdueOnly — returns only overdue opportunities", async () => {
    const db = getTestDb();
    const pastDate = "2020-01-01T00:00:00.000Z";
    const futureDate = "2099-01-01T00:00:00.000Z";

    // Overdue: past due date with no completedAt
    await seedOpportunity(db, "opp-1", {
      nextActionDueDate: pastDate,
      nextActionCompletedAt: null,
    });
    // Not overdue: future due date
    await seedOpportunity(db, "opp-2", {
      nextActionDueDate: futureDate,
      nextActionCompletedAt: null,
    });
    // Not overdue: past due but completed
    await seedOpportunity(db, "opp-3", {
      nextActionDueDate: pastDate,
      nextActionCompletedAt: now(),
    });
    // Not overdue: no due date
    await seedOpportunity(db, "opp-4", {
      nextActionDueDate: null,
      nextActionCompletedAt: null,
    });

    const result = await listOpportunities(db, 1, 10, { overdueOnly: true });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("opp-1");
  });

  it("filters by q — matches displayId", async () => {
    const db = getTestDb();
    const ts = now();
    await db.insert(schema.opportunities).values({
      id: "opp-q1",
      displayId: "OPP-AAA-001",
      stage: "open",
      seatsRequested: 1,
      passengerSeats: 1,
      petSeats: 0,
      createdAt: ts,
      updatedAt: ts,
    });
    await db.insert(schema.opportunities).values({
      id: "opp-q2",
      displayId: "OPP-BBB-002",
      stage: "open",
      seatsRequested: 1,
      passengerSeats: 1,
      petSeats: 0,
      createdAt: ts,
      updatedAt: ts,
    });

    const result = await listOpportunities(db, 1, 10, { q: "AAA" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("opp-q1");
  });

  it("filters by q — matches nextActionDescription", async () => {
    const db = getTestDb();
    await seedOpportunity(db, "opp-1", { nextActionDescription: "Send follow-up email" });
    await seedOpportunity(db, "opp-2", { nextActionDescription: "Schedule call" });

    const result = await listOpportunities(db, 1, 10, { q: "follow-up" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("opp-1");
  });

  it("filters by humanId — finds opportunities linked to a specific human", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedOpportunity(db, "opp-1");
    await seedOpportunity(db, "opp-2");
    await seedOpportunity(db, "opp-3");

    const ts = now();
    // Link opp-1 and opp-3 to h-1; link opp-2 to h-2
    await db.insert(schema.opportunityHumans).values([
      { id: "oh-1", opportunityId: "opp-1", humanId: "h-1", roleId: "role-primary", createdAt: ts },
      { id: "oh-2", opportunityId: "opp-2", humanId: "h-2", roleId: "role-primary", createdAt: ts },
      { id: "oh-3", opportunityId: "opp-3", humanId: "h-1", roleId: "role-primary", createdAt: ts },
    ]);

    const result = await listOpportunities(db, 1, 10, { humanId: "h-1" });
    expect(result.data).toHaveLength(2);
    const ids = result.data.map((o) => o.id);
    expect(ids).toContain("opp-1");
    expect(ids).toContain("opp-3");
  });

  it("returns primaryHuman enrichment with name and displayId", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Jane", "Doe");
    await seedOpportunity(db, "opp-1");

    const ts = now();
    await db.insert(schema.opportunityHumans).values({
      id: "oh-1",
      opportunityId: "opp-1",
      humanId: "h-1",
      roleId: "role-primary",
      createdAt: ts,
    });

    const result = await listOpportunities(db, 1, 10, {});
    expect(result.data).toHaveLength(1);
    const opp = result.data[0]!;
    expect(opp.primaryHuman).not.toBeNull();
    expect(opp.primaryHuman!.id).toBe("h-1");
    expect(opp.primaryHuman!.firstName).toBe("Jane");
    expect(opp.primaryHuman!.lastName).toBe("Doe");
    expect(opp.primaryHuman!.displayId).toMatch(/^HUM-/);
    expect(opp.primaryHumanName).toBe("Jane Doe");
  });

  it("returns null primaryHuman when no humans linked", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedOpportunity(db, "opp-1");

    const result = await listOpportunities(db, 1, 10, {});
    expect(result.data[0]!.primaryHuman).toBeNull();
    expect(result.data[0]!.primaryHumanName).toBeNull();
  });

  it("returns isOverdue=true when nextActionDueDate is past and nextActionCompletedAt is null", async () => {
    const db = getTestDb();
    const pastDate = "2020-06-01T00:00:00.000Z";
    await seedOpportunity(db, "opp-1", {
      nextActionDueDate: pastDate,
      nextActionCompletedAt: null,
    });

    const result = await listOpportunities(db, 1, 10, {});
    expect(result.data[0]!.isOverdue).toBe(true);
  });

  it("returns isOverdue=false when nextActionDueDate is in the future", async () => {
    const db = getTestDb();
    await seedOpportunity(db, "opp-1", {
      nextActionDueDate: "2099-01-01T00:00:00.000Z",
      nextActionCompletedAt: null,
    });

    const result = await listOpportunities(db, 1, 10, {});
    expect(result.data[0]!.isOverdue).toBe(false);
  });

  it("returns isOverdue=false when nextActionCompletedAt is set even if due date is past", async () => {
    const db = getTestDb();
    await seedOpportunity(db, "opp-1", {
      nextActionDueDate: "2020-01-01T00:00:00.000Z",
      nextActionCompletedAt: now(),
    });

    const result = await listOpportunities(db, 1, 10, {});
    expect(result.data[0]!.isOverdue).toBe(false);
  });

  it("returns nextActionOwnerName when nextActionOwnerId is set", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { nextActionOwnerId: "col-1" });

    const result = await listOpportunities(db, 1, 10, {});
    expect(result.data[0]!.nextActionOwnerName).toBe("Test User");
  });

  it("returns ownerName and ownerDisplayId when ownerId is set", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { ownerId: "col-1" });

    const result = await listOpportunities(db, 1, 10, {});
    expect(result.data[0]!.ownerName).toBe("Test User");
    expect(result.data[0]!.ownerDisplayId).toMatch(/^COL-/);
  });

  it("returns null nextActionOwnerName and ownerName when no owner set", async () => {
    const db = getTestDb();
    await seedOpportunity(db, "opp-1", { nextActionOwnerId: null, ownerId: null });

    const result = await listOpportunities(db, 1, 10, {});
    expect(result.data[0]!.nextActionOwnerName).toBeNull();
    expect(result.data[0]!.ownerName).toBeNull();
    expect(result.data[0]!.ownerDisplayId).toBeNull();
  });
});

// ─── createOpportunity ───────────────────────────────────────────────────────

describe("createOpportunity", () => {
  it("creates an opportunity with default values", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const result = await createOpportunity(db, {}, "col-1");

    expect(result.id).toBeDefined();
    expect(result.displayId).toMatch(/^OPP-/);

    const rows = await db.select().from(schema.opportunities);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.stage).toBe("open");
    expect(rows[0]!.seatsRequested).toBe(1);
    expect(rows[0]!.passengerSeats).toBe(1);
    expect(rows[0]!.petSeats).toBe(0);
    expect(rows[0]!.ownerId).toBe("col-1");
    expect(rows[0]!.nextActionOwnerId).toBe("col-1");
  });

  it("creates an opportunity with custom seat counts", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    await createOpportunity(
      db,
      { seatsRequested: 4, passengerSeats: 3, petSeats: 2 },
      "col-1",
    );

    const rows = await db.select().from(schema.opportunities);
    expect(rows[0]!.seatsRequested).toBe(4);
    expect(rows[0]!.passengerSeats).toBe(3);
    expect(rows[0]!.petSeats).toBe(2);
  });

  it("creates an opportunity with a specified stage", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    await createOpportunity(db, { stage: "qualified" }, "col-1");

    const rows = await db.select().from(schema.opportunities);
    expect(rows[0]!.stage).toBe("qualified");
  });

  it("writes an audit log entry on create", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    await createOpportunity(db, {}, "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("CREATE");
    expect(auditRows[0]!.entityType).toBe("opportunity");
    expect(auditRows[0]!.colleagueId).toBe("col-1");
  });
});

// ─── getOpportunityDetail ─────────────────────────────────────────────────────

describe("getOpportunityDetail", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await expect(getOpportunityDetail(db, "nonexistent")).rejects.toThrowError("Opportunity not found");
  });

  it("returns basic opportunity detail with empty collections", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedOpportunity(db, "opp-1", { stage: "open" });

    const result = await getOpportunityDetail(db, "opp-1");
    expect(result.id).toBe("opp-1");
    expect(result.stage).toBe("open");
    expect(result.linkedHumans).toHaveLength(0);
    expect(result.linkedPets).toHaveLength(0);
    expect(result.activities).toHaveLength(0);
    expect(result.linkedBookingRequests).toHaveLength(0);
    expect(result.nextActionOwnerName).toBeNull();
    expect(result.ownerName).toBeNull();
  });

  it("returns linked humans with role names", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedOpportunity(db, "opp-1");

    const ts = now();
    await db.insert(schema.opportunityHumans).values({
      id: "oh-1",
      opportunityId: "opp-1",
      humanId: "h-1",
      roleId: "role-primary",
      createdAt: ts,
    });

    const result = await getOpportunityDetail(db, "opp-1");
    expect(result.linkedHumans).toHaveLength(1);
    expect(result.linkedHumans[0]!.humanName).toBe("Alice Smith");
    expect(result.linkedHumans[0]!.roleName).toBe("primary");
    expect(result.linkedHumans[0]!.humanDisplayId).toMatch(/^HUM-/);
  });

  it("returns linked pets with owner names", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Bob", "Jones");
    await seedPet(db, "pet-1", "h-1", "Max");
    await seedOpportunity(db, "opp-1");

    const ts = now();
    await db.insert(schema.opportunityHumans).values({
      id: "oh-1",
      opportunityId: "opp-1",
      humanId: "h-1",
      roleId: "role-primary",
      createdAt: ts,
    });
    await db.insert(schema.opportunityPets).values({
      id: "op-1",
      opportunityId: "opp-1",
      petId: "pet-1",
      createdAt: ts,
    });

    const result = await getOpportunityDetail(db, "opp-1");
    expect(result.linkedPets).toHaveLength(1);
    expect(result.linkedPets[0]!.petName).toBe("Max");
    expect(result.linkedPets[0]!.ownerName).toBe("Bob Jones");
  });

  it("includes activities linked to the opportunity", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");
    await seedActivity(db, "act-1", { opportunityId: "opp-1" });
    await seedActivity(db, "act-2", { opportunityId: "opp-1" });

    const result = await getOpportunityDetail(db, "opp-1");
    expect(result.activities).toHaveLength(2);
  });

  it("includes nextActionOwnerName when set", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { nextActionOwnerId: "col-1" });

    const result = await getOpportunityDetail(db, "opp-1");
    expect(result.nextActionOwnerName).toBe("Test User");
  });

  it("includes deal ownerName when set", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { ownerId: "col-1" });

    const result = await getOpportunityDetail(db, "opp-1");
    expect(result.ownerName).toBe("Test User");
    expect(result.ownerDisplayId).toMatch(/^COL-/);
  });
});

// ─── updateOpportunity ───────────────────────────────────────────────────────

describe("updateOpportunity", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await expect(
      updateOpportunity(db, "nonexistent", { notes: "test" }, "col-1"),
    ).rejects.toThrowError("Opportunity not found");
  });

  it("updates notes field", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { notes: "old notes" });

    const result = await updateOpportunity(db, "opp-1", { notes: "new notes" }, "col-1");
    expect(result.data!.notes).toBe("new notes");
  });

  it("updates seat counts", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { seatsRequested: 1, passengerSeats: 1, petSeats: 0 });

    const result = await updateOpportunity(
      db,
      "opp-1",
      { seatsRequested: 3, passengerSeats: 2, petSeats: 1 },
      "col-1",
    );
    expect(result.data!.seatsRequested).toBe(3);
    expect(result.data!.passengerSeats).toBe(2);
    expect(result.data!.petSeats).toBe(1);
  });

  it("can set notes to null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { notes: "some notes" });

    const result = await updateOpportunity(db, "opp-1", { notes: null }, "col-1");
    expect(result.data!.notes).toBeNull();
  });

  it("writes an audit log entry when fields change", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { notes: "old" });

    await updateOpportunity(db, "opp-1", { notes: "new" }, "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("UPDATE");
    expect(auditRows[0]!.entityType).toBe("opportunity");
  });

  it("does not write audit log when no fields change", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    await updateOpportunity(db, "opp-1", {}, "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(0);
  });
});

// ─── deleteOpportunity ───────────────────────────────────────────────────────

describe("deleteOpportunity", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await expect(deleteOpportunity(db, "nonexistent")).rejects.toThrowError("Opportunity not found");
  });

  it("deletes the opportunity", async () => {
    const db = getTestDb();
    await seedOpportunity(db, "opp-1");

    await deleteOpportunity(db, "opp-1");

    const rows = await db.select().from(schema.opportunities);
    expect(rows).toHaveLength(0);
  });

  it("deletes linked opportunityHumans on delete", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await seedOpportunity(db, "opp-1");

    const ts = now();
    await db.insert(schema.opportunityHumans).values({
      id: "oh-1",
      opportunityId: "opp-1",
      humanId: "h-1",
      roleId: "role-primary",
      createdAt: ts,
    });

    await deleteOpportunity(db, "opp-1");

    const links = await db.select().from(schema.opportunityHumans);
    expect(links).toHaveLength(0);
  });

  it("deletes linked opportunityPets on delete", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await seedPet(db, "pet-1", "h-1");
    await seedOpportunity(db, "opp-1");

    const ts = now();
    await db.insert(schema.opportunityPets).values({
      id: "op-1",
      opportunityId: "opp-1",
      petId: "pet-1",
      createdAt: ts,
    });

    await deleteOpportunity(db, "opp-1");

    const petLinks = await db.select().from(schema.opportunityPets);
    expect(petLinks).toHaveLength(0);
  });

  it("nullifies opportunityId on linked activities", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");
    await seedActivity(db, "act-1", { opportunityId: "opp-1" });

    await deleteOpportunity(db, "opp-1");

    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(1);
    expect(acts[0]!.opportunityId).toBeNull();
  });
});

// ─── updateOpportunityStage ───────────────────────────────────────────────────

describe("updateOpportunityStage", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await expect(
      updateOpportunityStage(db, "nonexistent", { stage: "qualified" }, "col-1"),
    ).rejects.toThrowError("Opportunity not found");
  });

  it("transitions to qualified stage", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { stage: "open" });

    const result = await updateOpportunityStage(db, "opp-1", { stage: "qualified" }, "col-1");
    expect(result.data!.stage).toBe("qualified");
  });

  it("blocks closed_lost without lossReason", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { stage: "open" });

    await expect(
      updateOpportunityStage(db, "opp-1", { stage: "closed_lost" }, "col-1"),
    ).rejects.toThrowError("Loss reason is required for closed_lost");
  });

  it("blocks closed_lost with empty lossReason", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { stage: "open" });

    await expect(
      updateOpportunityStage(db, "opp-1", { stage: "closed_lost", lossReason: "   " }, "col-1"),
    ).rejects.toThrowError("Loss reason is required for closed_lost");
  });

  it("closes as lost with a valid lossReason", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { stage: "open" });

    const result = await updateOpportunityStage(
      db,
      "opp-1",
      { stage: "closed_lost", lossReason: "Client went with competitor" },
      "col-1",
    );
    expect(result.data!.stage).toBe("closed_lost");
    expect(result.data!.lossReason).toBe("Client went with competitor");
  });

  it("clears next action fields when closing as lost", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", {
      stage: "open",
      nextActionDescription: "Follow up call",
      nextActionType: "call",
      nextActionDueDate: now(),
      nextActionOwnerId: "col-1",
    });

    const result = await updateOpportunityStage(
      db,
      "opp-1",
      { stage: "closed_lost", lossReason: "Budget cut" },
      "col-1",
    );
    expect(result.data!.nextActionDescription).toBeNull();
    expect(result.data!.nextActionType).toBeNull();
    expect(result.data!.nextActionDueDate).toBeNull();
    expect(result.data!.nextActionOwnerId).toBeNull();
  });

  it("writes an audit log entry on stage change", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { stage: "open" });

    await updateOpportunityStage(db, "opp-1", { stage: "qualified" }, "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("STAGE_CHANGE");
    expect(auditRows[0]!.entityType).toBe("opportunity");
  });
});

// ─── linkOpportunityHuman ────────────────────────────────────────────────────

describe("linkOpportunityHuman", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await expect(
      linkOpportunityHuman(db, "nonexistent", { humanId: "h-1" }),
    ).rejects.toThrowError("Opportunity not found");
  });

  it("first human linked becomes primary", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedOpportunity(db, "opp-1");

    const link = await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    expect(link.roleId).toBe("role-primary");
  });

  it("second human linked gets passenger role by default", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedOpportunity(db, "opp-1");

    await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    const link2 = await linkOpportunityHuman(db, "opp-1", { humanId: "h-2" });
    expect(link2.roleId).toBe("role-passenger");
  });

  it("creates the opportunityHumans junction record", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await seedOpportunity(db, "opp-1");

    await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });

    const links = await db.select().from(schema.opportunityHumans);
    expect(links).toHaveLength(1);
    expect(links[0]!.humanId).toBe("h-1");
    expect(links[0]!.opportunityId).toBe("opp-1");
  });

  it("linking a second human as primary demotes the existing primary", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedOpportunity(db, "opp-1");

    const link1 = await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    expect(link1.roleId).toBe("role-primary");

    // Link second human explicitly as primary
    await linkOpportunityHuman(db, "opp-1", { humanId: "h-2", roleId: "role-primary" });

    const links = await db.select().from(schema.opportunityHumans);
    const h1Link = links.find((l) => l.humanId === "h-1");
    const h2Link = links.find((l) => l.humanId === "h-2");
    expect(h1Link!.roleId).toBe("role-passenger");
    expect(h2Link!.roleId).toBe("role-primary");
  });
});

// ─── unlinkOpportunityHuman ──────────────────────────────────────────────────

describe("unlinkOpportunityHuman", () => {
  it("throws notFound for missing link", async () => {
    const db = getTestDb();
    await expect(unlinkOpportunityHuman(db, "nonexistent")).rejects.toThrowError("Link not found");
  });

  it("removes the only human link when they are the sole human (no block)", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await seedOpportunity(db, "opp-1");

    const link = await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    await unlinkOpportunityHuman(db, link.id);

    const links = await db.select().from(schema.opportunityHumans);
    expect(links).toHaveLength(0);
  });

  it("blocks removing primary human when other humans are linked on a non-terminal opportunity", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedOpportunity(db, "opp-1", { stage: "open" });

    const link1 = await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    await linkOpportunityHuman(db, "opp-1", { humanId: "h-2" });

    await expect(unlinkOpportunityHuman(db, link1.id)).rejects.toThrowError(
      "Cannot remove primary human while other humans are linked on a non-terminal opportunity",
    );
  });

  it("allows removing a passenger human even when primary exists", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedOpportunity(db, "opp-1", { stage: "open" });

    await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    const link2 = await linkOpportunityHuman(db, "opp-1", { humanId: "h-2" });

    await unlinkOpportunityHuman(db, link2.id);

    const links = await db.select().from(schema.opportunityHumans);
    expect(links).toHaveLength(1);
    expect(links[0]!.humanId).toBe("h-1");
  });
});

// ─── linkOpportunityPet ───────────────────────────────────────────────────────

describe("linkOpportunityPet", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await seedPet(db, "pet-1", "h-1");
    await expect(
      linkOpportunityPet(db, "nonexistent", { petId: "pet-1" }),
    ).rejects.toThrowError("Opportunity not found");
  });

  it("throws notFound for missing pet", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedOpportunity(db, "opp-1");
    await expect(
      linkOpportunityPet(db, "opp-1", { petId: "nonexistent-pet" }),
    ).rejects.toThrowError("Pet not found");
  });

  it("blocks linking pet when owner is not linked to the opportunity", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await seedPet(db, "pet-1", "h-1", "Buddy");
    await seedOpportunity(db, "opp-1");

    await expect(
      linkOpportunityPet(db, "opp-1", { petId: "pet-1" }),
    ).rejects.toThrowError("Pet's owner must be linked to the opportunity first");
  });

  it("links a pet successfully when owner is already linked", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedPet(db, "pet-1", "h-1", "Buddy");
    await seedOpportunity(db, "opp-1");

    await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    const link = await linkOpportunityPet(db, "opp-1", { petId: "pet-1" });

    expect(link.petId).toBe("pet-1");
    expect(link.opportunityId).toBe("opp-1");

    const petLinks = await db.select().from(schema.opportunityPets);
    expect(petLinks).toHaveLength(1);
  });

  it("allows linking a pet with no owner (humanId is null)", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedPet(db, "pet-orphan", null, "Stray");
    await seedOpportunity(db, "opp-1");

    const link = await linkOpportunityPet(db, "opp-1", { petId: "pet-orphan" });
    expect(link.petId).toBe("pet-orphan");
  });
});

// ─── completeNextAction ───────────────────────────────────────────────────────

describe("completeNextAction", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await expect(completeNextAction(db, "nonexistent", "col-1")).rejects.toThrowError(
      "Opportunity not found",
    );
  });

  it("throws badRequest when there is no next action to complete", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { nextActionDescription: null });

    await expect(completeNextAction(db, "opp-1", "col-1")).rejects.toThrowError(
      "No next action to complete",
    );
  });

  it("clears next action fields on complete", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", {
      nextActionDescription: "Send follow-up email",
      nextActionType: "email",
      nextActionDueDate: now(),
      nextActionOwnerId: "col-1",
      nextActionCadenceNote: "Weekly",
    });

    const result = await completeNextAction(db, "opp-1", "col-1");
    expect(result.data!.nextActionDescription).toBeNull();
    expect(result.data!.nextActionType).toBeNull();
    expect(result.data!.nextActionDueDate).toBeNull();
    expect(result.data!.nextActionOwnerId).toBeNull();
    expect(result.data!.nextActionCompletedAt).toBeNull();
    expect(result.data!.nextActionCadenceNote).toBeNull();
  });

  it("writes an audit log entry on complete", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", {
      nextActionDescription: "Call client",
      nextActionType: "call",
    });

    await completeNextAction(db, "opp-1", "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("NEXT_ACTION_DONE");
    expect(auditRows[0]!.entityType).toBe("opportunity");
    expect(auditRows[0]!.colleagueId).toBe("col-1");
  });
});

// ─── updateOpportunity — lossReason, flightId, ownerId ───────────────────────

describe("updateOpportunity — additional fields", () => {
  it("updates lossReason field", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    const result = await updateOpportunity(db, "opp-1", { lossReason: "Too expensive" }, "col-1");
    expect(result.data!.lossReason).toBe("Too expensive");
  });

  it("can set lossReason to null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { lossReason: "Old reason" });

    const result = await updateOpportunity(db, "opp-1", { lossReason: null }, "col-1");
    expect(result.data!.lossReason).toBeNull();
  });

  it("updates flightId field", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    const result = await updateOpportunity(db, "opp-1", { flightId: "flight-123" }, "col-1");
    expect(result.data!.flightId).toBe("flight-123");
  });

  it("can set flightId to null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    const result = await updateOpportunity(db, "opp-1", { flightId: null }, "col-1");
    expect(result.data!.flightId).toBeNull();
  });

  it("updates ownerId field", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedColleague(db, "col-2");
    await seedOpportunity(db, "opp-1", { ownerId: "col-1" });

    const result = await updateOpportunity(db, "opp-1", { ownerId: "col-2" }, "col-1");
    expect(result.data!.ownerId).toBe("col-2");
  });

  it("can set ownerId to null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { ownerId: "col-1" });

    const result = await updateOpportunity(db, "opp-1", { ownerId: null }, "col-1");
    expect(result.data!.ownerId).toBeNull();
  });

  it("returns auditEntryId when fields actually change", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { seatsRequested: 1 });

    const result = await updateOpportunity(db, "opp-1", { seatsRequested: 5 }, "col-1");
    expect(result.auditEntryId).toBeDefined();
  });

  it("returns undefined auditEntryId when values are identical", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { seatsRequested: 2 });

    const result = await updateOpportunity(db, "opp-1", { seatsRequested: 2 }, "col-1");
    expect(result.auditEntryId).toBeUndefined();
  });
});

// ─── updateOpportunityStage — closed_flown ───────────────────────────────────

describe("updateOpportunityStage — closed_flown", () => {
  it("transitions to closed_flown stage", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { stage: "qualified" });

    const result = await updateOpportunityStage(db, "opp-1", { stage: "closed_flown" }, "col-1");
    expect(result.data!.stage).toBe("closed_flown");
  });

  it("clears next action fields when closing as flown", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", {
      stage: "qualified",
      nextActionDescription: "Board client",
      nextActionType: "call",
      nextActionDueDate: now(),
      nextActionOwnerId: "col-1",
    });

    const result = await updateOpportunityStage(db, "opp-1", { stage: "closed_flown" }, "col-1");
    expect(result.data!.nextActionDescription).toBeNull();
    expect(result.data!.nextActionType).toBeNull();
    expect(result.data!.nextActionDueDate).toBeNull();
    expect(result.data!.nextActionOwnerId).toBeNull();
  });

  it("auto-creates activity from next action when closing as flown", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", {
      stage: "qualified",
      nextActionDescription: "Final boarding call",
      nextActionType: "call",
      nextActionDueDate: now(),
      nextActionOwnerId: "col-1",
      nextActionCompletedAt: null,
    });

    await updateOpportunityStage(db, "opp-1", { stage: "closed_flown" }, "col-1");

    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(1);
    expect(acts[0]!.subject).toBe("[Auto] Final boarding call");
    expect(acts[0]!.opportunityId).toBe("opp-1");
    expect(acts[0]!.colleagueId).toBe("col-1");
  });

  it("does not auto-create activity when next action already completed", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", {
      stage: "qualified",
      nextActionDescription: "Old action",
      nextActionCompletedAt: now(),
    });

    await updateOpportunityStage(db, "opp-1", { stage: "closed_flown" }, "col-1");

    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(0);
  });

  it("does not auto-create activity when no next action exists on flown", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", {
      stage: "qualified",
      nextActionDescription: null,
    });

    await updateOpportunityStage(db, "opp-1", { stage: "closed_flown" }, "col-1");

    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(0);
  });

  it("allows removing primary human on a terminal (closed_flown) opportunity", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1", { stage: "closed_flown" });

    const link1 = await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    await linkOpportunityHuman(db, "opp-1", { humanId: "h-2" });

    // Should NOT throw even though there are other humans — it's a terminal stage
    await unlinkOpportunityHuman(db, link1.id);

    const links = await db.select().from(schema.opportunityHumans);
    expect(links).toHaveLength(1);
    expect(links[0]!.humanId).toBe("h-2");
  });
});

// ─── updateOpportunityHumanRole ──────────────────────────────────────────────

describe("updateOpportunityHumanRole", () => {
  it("throws notFound for missing link", async () => {
    const db = getTestDb();
    await expect(
      updateOpportunityHumanRole(db, "nonexistent", { roleId: "role-primary" }),
    ).rejects.toThrowError("Link not found");
  });

  it("updates role to passenger without demoting anyone", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await seedOpportunity(db, "opp-1");

    const link = await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    // First human is primary — change it to passenger
    const result = await updateOpportunityHumanRole(db, link.id, { roleId: "role-passenger" });
    expect(result.id).toBe(link.id);
    expect(result.roleId).toBe("role-passenger");

    const links = await db.select().from(schema.opportunityHumans);
    expect(links[0]!.roleId).toBe("role-passenger");
  });

  it("promotes to primary and demotes existing primary", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedOpportunity(db, "opp-1");

    const link1 = await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    const link2 = await linkOpportunityHuman(db, "opp-1", { humanId: "h-2" });

    // link1 is primary, link2 is passenger — promote link2 to primary
    await updateOpportunityHumanRole(db, link2.id, { roleId: "role-primary" });

    const links = await db.select().from(schema.opportunityHumans);
    const h1Link = links.find((l) => l.humanId === "h-1");
    const h2Link = links.find((l) => l.humanId === "h-2");
    expect(h1Link!.roleId).toBe("role-passenger");
    expect(h2Link!.roleId).toBe("role-primary");
  });

  it("promotes to primary when there is no existing primary", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await seedOpportunity(db, "opp-1");

    const link = await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    // Manually set to passenger first
    await db.update(schema.opportunityHumans).set({ roleId: "role-passenger" }).where(
      eq(schema.opportunityHumans.id, link.id),
    );

    // Now promote to primary — no existing primary to demote
    const result = await updateOpportunityHumanRole(db, link.id, { roleId: "role-primary" });
    expect(result.roleId).toBe("role-primary");
  });
});

// ─── unlinkOpportunityPet ────────────────────────────────────────────────────

describe("unlinkOpportunityPet", () => {
  it("throws notFound for missing link", async () => {
    const db = getTestDb();
    await expect(unlinkOpportunityPet(db, "nonexistent")).rejects.toThrowError("Link not found");
  });

  it("removes the pet link successfully", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedPet(db, "pet-1", "h-1", "Buddy");
    await seedOpportunity(db, "opp-1");

    await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });
    const petLink = await linkOpportunityPet(db, "opp-1", { petId: "pet-1" });

    await unlinkOpportunityPet(db, petLink.id);

    const petLinks = await db.select().from(schema.opportunityPets);
    expect(petLinks).toHaveLength(0);
  });
});

// ─── updateNextAction ────────────────────────────────────────────────────────

describe("updateNextAction", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await expect(
      updateNextAction(
        db,
        "nonexistent",
        { ownerId: "col-1", description: "Do thing", type: "call", dueDate: now() },
        "col-1",
      ),
    ).rejects.toThrowError("Opportunity not found");
  });

  it("sets all next action fields", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");
    const dueDate = now();

    const result = await updateNextAction(
      db,
      "opp-1",
      { ownerId: "col-1", description: "Follow up email", type: "email", dueDate, cadenceNote: "Weekly" },
      "col-1",
    );

    expect(result.data!.nextActionOwnerId).toBe("col-1");
    expect(result.data!.nextActionDescription).toBe("Follow up email");
    expect(result.data!.nextActionType).toBe("email");
    expect(result.data!.nextActionDueDate).toBe(dueDate);
    expect(result.data!.nextActionCadenceNote).toBe("Weekly");
    expect(result.data!.nextActionCompletedAt).toBeNull();
  });

  it("sets cadenceNote to null when not provided", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    const result = await updateNextAction(
      db,
      "opp-1",
      { ownerId: "col-1", description: "Call", type: "call", dueDate: now() },
      "col-1",
    );

    expect(result.data!.nextActionCadenceNote).toBeNull();
  });

  it("writes an audit log entry when next action changes", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    await updateNextAction(
      db,
      "opp-1",
      { ownerId: "col-1", description: "New task", type: "email", dueDate: now() },
      "col-1",
    );

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("UPDATE");
    expect(auditRows[0]!.entityType).toBe("opportunity");
    expect(auditRows[0]!.colleagueId).toBe("col-1");
  });

  it("does not write audit log when next action values are unchanged", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    const dueDate = now();
    await seedOpportunity(db, "opp-1", {
      nextActionDescription: "Same task",
      nextActionType: "email",
      nextActionDueDate: dueDate,
      nextActionCadenceNote: null,
      nextActionOwnerId: "col-1",
    });

    const result = await updateNextAction(
      db,
      "opp-1",
      { ownerId: "col-1", description: "Same task", type: "email", dueDate },
      "col-1",
    );

    expect(result.auditEntryId).toBeUndefined();
  });
});

// ─── linkOpportunityFlight ───────────────────────────────────────────────────

describe("linkOpportunityFlight", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await expect(
      linkOpportunityFlight(db, "nonexistent", "flight-1", "col-1"),
    ).rejects.toThrowError("Opportunity not found");
  });

  it("sets flightId on the opportunity", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    const result = await linkOpportunityFlight(db, "opp-1", "flight-abc", "col-1");
    expect(result.data!.flightId).toBe("flight-abc");
  });

  it("writes an audit log entry when flightId changes", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    await linkOpportunityFlight(db, "opp-1", "flight-abc", "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("UPDATE");
    expect(auditRows[0]!.colleagueId).toBe("col-1");
  });

  it("does not write audit log when flightId is unchanged", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    // Set flight once, then set it to the same value
    await db.update(schema.opportunities).set({ flightId: "flight-abc" }).where(
      eq(schema.opportunities.id, "opp-1"),
    );

    await linkOpportunityFlight(db, "opp-1", "flight-abc", "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(0);
  });
});

// ─── unlinkOpportunityFlight ─────────────────────────────────────────────────

describe("unlinkOpportunityFlight", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await expect(
      unlinkOpportunityFlight(db, "nonexistent", "col-1"),
    ).rejects.toThrowError("Opportunity not found");
  });

  it("clears flightId on the opportunity", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    await db.update(schema.opportunities).set({ flightId: "flight-abc" }).where(
      eq(schema.opportunities.id, "opp-1"),
    );

    const result = await unlinkOpportunityFlight(db, "opp-1", "col-1");
    expect(result.data!.flightId).toBeNull();
  });

  it("writes an audit log entry when flightId was previously set", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    await db.update(schema.opportunities).set({ flightId: "flight-abc" }).where(
      eq(schema.opportunities.id, "opp-1"),
    );

    await unlinkOpportunityFlight(db, "opp-1", "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("UPDATE");
  });

  it("does not write audit log when flightId was already null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedOpportunity(db, "opp-1");

    await unlinkOpportunityFlight(db, "opp-1", "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(0);
  });
});

// ─── getOpportunityBookingRequests ───────────────────────────────────────────

describe("getOpportunityBookingRequests", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await expect(
      getOpportunityBookingRequests(db, "nonexistent"),
    ).rejects.toThrowError("Opportunity not found");
  });

  it("returns empty linked and available when no booking requests", async () => {
    const db = getTestDb();
    await seedOpportunity(db, "opp-1");

    const result = await getOpportunityBookingRequests(db, "opp-1");
    expect(result.linked).toHaveLength(0);
    expect(result.available).toHaveLength(0);
  });

  it("returns linked booking requests for the opportunity", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await seedOpportunity(db, "opp-1");
    await seedBookingRequest(db, "br-1", "h-1", "opp-1");

    const result = await getOpportunityBookingRequests(db, "opp-1");
    expect(result.linked).toHaveLength(1);
    expect(result.linked[0]!.id).toBe("br-1");
  });

  it("returns available booking requests from linked humans", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await seedOpportunity(db, "opp-1");

    // Link human to opportunity
    await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });

    // Create unlinked booking request for that human
    await seedBookingRequest(db, "br-unlinked", "h-1", null);

    const result = await getOpportunityBookingRequests(db, "opp-1");
    expect(result.available).toHaveLength(1);
    expect(result.available[0]!.id).toBe("br-unlinked");
  });

  it("excludes booking requests from humans not linked to the opportunity", async () => {
    const db = getTestDb();
    await seedRoles(db);
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");
    await seedOpportunity(db, "opp-1");

    await linkOpportunityHuman(db, "opp-1", { humanId: "h-1" });

    // h-2 is NOT linked to the opportunity
    await seedBookingRequest(db, "br-h2", "h-2", null);

    const result = await getOpportunityBookingRequests(db, "opp-1");
    expect(result.available).toHaveLength(0);
  });

  it("returns empty available when no humans are linked", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedOpportunity(db, "opp-1");
    await seedBookingRequest(db, "br-1", "h-1", null);

    const result = await getOpportunityBookingRequests(db, "opp-1");
    expect(result.available).toHaveLength(0);
  });
});

// ─── linkBookingRequest ───────────────────────────────────────────────────────

describe("linkBookingRequest", () => {
  it("throws notFound for missing opportunity", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedBookingRequest(db, "br-1", "h-1", null);

    await expect(
      linkBookingRequest(db, "nonexistent", "br-1"),
    ).rejects.toThrowError("Opportunity not found");
  });

  it("throws notFound for missing booking request", async () => {
    const db = getTestDb();
    await seedOpportunity(db, "opp-1");

    await expect(
      linkBookingRequest(db, "opp-1", "nonexistent"),
    ).rejects.toThrowError("Booking request link not found");
  });

  it("links booking request to opportunity", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedOpportunity(db, "opp-1");
    await seedBookingRequest(db, "br-1", "h-1", null);

    const result = await linkBookingRequest(db, "opp-1", "br-1");
    expect(result.success).toBe(true);

    const brs = await db.select().from(schema.humanWebsiteBookingRequests);
    expect(brs[0]!.opportunityId).toBe("opp-1");
  });
});

// ─── unlinkBookingRequest ─────────────────────────────────────────────────────

describe("unlinkBookingRequest", () => {
  it("throws notFound when booking request not found for this opportunity", async () => {
    const db = getTestDb();
    await seedOpportunity(db, "opp-1");

    await expect(
      unlinkBookingRequest(db, "opp-1", "nonexistent"),
    ).rejects.toThrowError("Booking request link not found for this opportunity");
  });

  it("throws notFound when booking request belongs to a different opportunity", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedOpportunity(db, "opp-1");
    await seedOpportunity(db, "opp-2");
    await seedBookingRequest(db, "br-1", "h-1", "opp-2");

    await expect(
      unlinkBookingRequest(db, "opp-1", "br-1"),
    ).rejects.toThrowError("Booking request link not found for this opportunity");
  });

  it("unlinks booking request from opportunity", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedOpportunity(db, "opp-1");
    await seedBookingRequest(db, "br-1", "h-1", "opp-1");

    const result = await unlinkBookingRequest(db, "opp-1", "br-1");
    expect(result.success).toBe(true);

    const brs = await db.select().from(schema.humanWebsiteBookingRequests);
    expect(brs[0]!.opportunityId).toBeNull();
  });
});
