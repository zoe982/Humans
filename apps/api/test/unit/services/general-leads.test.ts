import { describe, it, expect, vi, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { getTestDb } from "../setup";
import {
  listGeneralLeads,
  getGeneralLead,
  createGeneralLead,
  updateGeneralLead,
  updateGeneralLeadStatus,
  convertGeneralLead,
  deleteGeneralLead,
  linkHumanToGeneralLead,
  unlinkHumanFromGeneralLead,
  importLeadFromFront,
} from "../../../src/services/general-leads";
import * as schema from "@humans/db/schema";

// Mock frontFetch to avoid HTTP calls
const mockFrontFetch = vi.fn();
vi.mock("../../../src/services/front-sync", async () => {
  const actual = await vi.importActual<typeof import("../../../src/services/front-sync")>("../../../src/services/front-sync");
  return {
    ...actual,
    frontFetch: (...args: unknown[]) => mockFrontFetch(...args),
  };
});

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

async function seedLead(
  db: ReturnType<typeof getTestDb>,
  id = "lead-1",
  overrides: Partial<{
    status: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    notes: string | null;
    ownerId: string | null;
    convertedHumanId: string | null;
    rejectReason: string | null;
    lossReason: string | null;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.generalLeads).values({
    id,
    displayId: nextDisplayId("LEA"),
    status: overrides.status ?? "open",
    firstName: overrides.firstName ?? "Test",
    middleName: overrides.middleName ?? null,
    lastName: overrides.lastName ?? "Lead",
    notes: overrides.notes ?? null,
    ownerId: overrides.ownerId ?? null,
    convertedHumanId: overrides.convertedHumanId ?? null,
    rejectReason: overrides.rejectReason ?? null,
    lossReason: overrides.lossReason ?? null,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedActivity(
  db: ReturnType<typeof getTestDb>,
  id = "act-1",
  overrides: Partial<{
    humanId: string | null;
    generalLeadId: string | null;
    opportunityId: string | null;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.activities).values({
    id,
    displayId: nextDisplayId("ACT"),
    type: "email",
    subject: "Test activity",
    activityDate: ts,
    humanId: overrides.humanId ?? null,
    generalLeadId: overrides.generalLeadId ?? null,
    opportunityId: overrides.opportunityId ?? null,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedEmail(
  db: ReturnType<typeof getTestDb>,
  id: string,
  email: string,
  generalLeadId: string,
  humanId: string | null = null,
) {
  await db.insert(schema.emails).values({
    id,
    displayId: nextDisplayId("EML"),
    email,
    generalLeadId,
    humanId,
    accountId: null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    labelId: null,
    isPrimary: false,
    createdAt: now(),
  });
  return id;
}

async function seedPhone(
  db: ReturnType<typeof getTestDb>,
  id: string,
  phoneNumber: string,
  generalLeadId: string,
  humanId: string | null = null,
) {
  await db.insert(schema.phones).values({
    id,
    displayId: nextDisplayId("FON"),
    phoneNumber,
    generalLeadId,
    humanId,
    accountId: null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    labelId: null,
    hasWhatsapp: false,
    isPrimary: false,
    createdAt: now(),
  });
  return id;
}

async function seedSocialId(
  db: ReturnType<typeof getTestDb>,
  id: string,
  handle: string,
  generalLeadId: string,
  platformId: string | null = null,
  humanId: string | null = null,
) {
  await db.insert(schema.socialIds).values({
    id,
    displayId: nextDisplayId("SOC"),
    handle,
    generalLeadId,
    platformId,
    humanId,
    accountId: null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    createdAt: now(),
  });
  return id;
}

async function seedPlatform(
  db: ReturnType<typeof getTestDb>,
  id: string,
  name: string,
) {
  await db.insert(schema.socialIdPlatformsConfig).values({ id, name, createdAt: now() });
  return id;
}

// ─── listGeneralLeads ────────────────────────────────────────────────────────

describe("listGeneralLeads", () => {
  it("returns empty list when no leads exist", async () => {
    const db = getTestDb();
    const result = await listGeneralLeads(db, 1, 25, {});
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(25);
  });

  it("returns basic lead list with owner name", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { ownerId: "col-1" });

    const result = await listGeneralLeads(db, 1, 25, {});
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("lead-1");
    expect(result.data[0]!.ownerName).toBe("Test User");
  });

  it("returns null ownerName when lead has no owner", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1", { ownerId: null });

    const result = await listGeneralLeads(db, 1, 25, {});
    expect(result.data[0]!.ownerName).toBeNull();
  });

  it("filters by status", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1", { status: "open" });
    await seedLead(db, "lead-2", { status: "pending_response" });
    await seedLead(db, "lead-3", { status: "closed_lost" });

    const result = await listGeneralLeads(db, 1, 25, { status: "pending_response" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("lead-2");
  });

  it("filters by convertedHumanId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { convertedHumanId: "h-1", status: "closed_converted" });
    await seedLead(db, "lead-2");

    const result = await listGeneralLeads(db, 1, 25, { convertedHumanId: "h-1" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("lead-1");
  });

  it("filters by search query matching firstName", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1", { firstName: "Alice" });
    await seedLead(db, "lead-2", { firstName: "Bob" });

    const result = await listGeneralLeads(db, 1, 25, { q: "Alice" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("lead-1");
  });

  it("filters by search query matching notes", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1", { notes: "Interested in Malta route" });
    await seedLead(db, "lead-2", { notes: "No specific preference" });

    const result = await listGeneralLeads(db, 1, 25, { q: "Malta" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("lead-1");
  });

  it("includes converted human display info", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedLead(db, "lead-1", { convertedHumanId: "h-1", status: "closed_converted" });

    const result = await listGeneralLeads(db, 1, 25, {});
    expect(result.data[0]!.convertedHumanName).toBe("Alice Smith");
    expect(result.data[0]!.convertedHumanDisplayId).toMatch(/^HUM-/);
  });

  it("respects pagination", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1");
    await seedLead(db, "lead-2");
    await seedLead(db, "lead-3");

    const page1 = await listGeneralLeads(db, 1, 2, {});
    expect(page1.data).toHaveLength(2);
    expect(page1.meta.total).toBe(3);

    const page2 = await listGeneralLeads(db, 2, 2, {});
    expect(page2.data).toHaveLength(1);
  });
});

// ─── getGeneralLead ──────────────────────────────────────────────────────────

describe("getGeneralLead", () => {
  it("throws notFound for missing lead", async () => {
    const db = getTestDb();
    await expect(getGeneralLead(db, "nonexistent")).rejects.toThrowError("General lead not found");
  });

  it("returns basic lead detail", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1", { firstName: "Jane", lastName: "Doe" });

    const result = await getGeneralLead(db, "lead-1");
    expect(result.id).toBe("lead-1");
    expect(result.firstName).toBe("Jane");
    expect(result.lastName).toBe("Doe");
    expect(result.status).toBe("open");
    expect(result.ownerName).toBeNull();
    expect(result.convertedHumanDisplayId).toBeNull();
    expect(result.convertedHumanName).toBeNull();
    expect(result.activities).toHaveLength(0);
  });

  it("returns lead with owner name", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { ownerId: "col-1" });

    const result = await getGeneralLead(db, "lead-1");
    expect(result.ownerName).toBe("Test User");
  });

  it("returns lead with converted human info", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Bob", "Jones");
    await seedLead(db, "lead-1", { convertedHumanId: "h-1", status: "closed_converted" });

    const result = await getGeneralLead(db, "lead-1");
    expect(result.convertedHumanName).toBe("Bob Jones");
    expect(result.convertedHumanDisplayId).toMatch(/^HUM-/);
  });

  it("includes activities linked to the lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1");
    await seedActivity(db, "act-1", { generalLeadId: "lead-1" });
    await seedActivity(db, "act-2", { generalLeadId: "lead-1" });

    const result = await getGeneralLead(db, "lead-1");
    expect(result.activities).toHaveLength(2);
    const actIds = result.activities.map((a) => a.id);
    expect(actIds).toContain("act-1");
    expect(actIds).toContain("act-2");
  });

  it("does not include activities from other leads", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1");
    await seedLead(db, "lead-2");
    await seedActivity(db, "act-1", { generalLeadId: "lead-2" });

    const result = await getGeneralLead(db, "lead-1");
    expect(result.activities).toHaveLength(0);
  });
});

// ─── createGeneralLead ───────────────────────────────────────────────────────

describe("createGeneralLead", () => {
  it("creates a lead with required fields and defaults", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const result = await createGeneralLead(
      db,
      { firstName: "Test", lastName: "Lead" },
      "col-1",
    );

    expect(result.id).toBeDefined();
    expect(result.displayId).toMatch(/^LEA-/);

    const rows = await db.select().from(schema.generalLeads);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("open");
    expect(rows[0]!.firstName).toBe("Test");
    expect(rows[0]!.lastName).toBe("Lead");
    expect(rows[0]!.notes).toBeNull();
    expect(rows[0]!.ownerId).toBe("col-1");
  });

  it("creates a lead with all optional fields", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const result = await createGeneralLead(
      db,
      {
        firstName: "John",
        middleName: "Paul",
        lastName: "Smith",
        notes: "Referred by someone",
        ownerId: "col-1",
      },
      "col-1",
    );

    const rows = await db.select().from(schema.generalLeads);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.firstName).toBe("John");
    expect(rows[0]!.middleName).toBe("Paul");
    expect(rows[0]!.lastName).toBe("Smith");
    expect(rows[0]!.notes).toBe("Referred by someone");
    expect(rows[0]!.ownerId).toBe("col-1");
    expect(result.displayId).toMatch(/^LEA-/);
  });

  it("writes an audit log entry on create", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    await createGeneralLead(db, { firstName: "Test", lastName: "Lead" }, "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("CREATE");
    expect(auditRows[0]!.entityType).toBe("general_lead");
    expect(auditRows[0]!.colleagueId).toBe("col-1");
  });
});

// ─── updateGeneralLead ───────────────────────────────────────────────────────

describe("updateGeneralLead", () => {
  it("throws notFound for missing lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await expect(
      updateGeneralLead(db, "nonexistent", { notes: "test" }, "col-1"),
    ).rejects.toThrowError("General lead not found");
  });

  it("updates notes field", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { notes: "old notes" });

    const result = await updateGeneralLead(db, "lead-1", { notes: "new notes" }, "col-1");
    expect(result.data!.notes).toBe("new notes");
  });

  it("updates firstName field", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { firstName: "Old" });

    const result = await updateGeneralLead(db, "lead-1", { firstName: "New" }, "col-1");
    expect(result.data!.firstName).toBe("New");
  });

  it("updates lastName field", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { lastName: "OldLast" });

    const result = await updateGeneralLead(db, "lead-1", { lastName: "NewLast" }, "col-1");
    expect(result.data!.lastName).toBe("NewLast");
  });

  it("can set middleName to null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { middleName: "Middle" });

    const result = await updateGeneralLead(db, "lead-1", { middleName: null }, "col-1");
    expect(result.data!.middleName).toBeNull();
  });

  it("blocks owner change on a closed lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedColleague(db, "col-2");
    await seedLead(db, "lead-1", { status: "closed_lost" });

    await expect(
      updateGeneralLead(db, "lead-1", { ownerId: "col-2" }, "col-1"),
    ).rejects.toThrowError("Cannot change owner on a closed lead");
  });

  it("blocks owner change on a closed_converted lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedColleague(db, "col-2");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { status: "closed_converted", convertedHumanId: "h-1" });

    await expect(
      updateGeneralLead(db, "lead-1", { ownerId: "col-2" }, "col-1"),
    ).rejects.toThrowError("Cannot change owner on a closed lead");
  });

  it("allows owner change on an open lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedColleague(db, "col-2");
    await seedLead(db, "lead-1", { status: "open", ownerId: "col-1" });

    const result = await updateGeneralLead(db, "lead-1", { ownerId: "col-2" }, "col-1");
    expect(result.data!.ownerId).toBe("col-2");
  });

  it("writes an audit log entry when fields change", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { notes: "old notes" });

    await updateGeneralLead(db, "lead-1", { notes: "new notes" }, "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("UPDATE");
    expect(auditRows[0]!.entityType).toBe("general_lead");
  });
});

// ─── updateGeneralLeadStatus ─────────────────────────────────────────────────

describe("updateGeneralLeadStatus", () => {
  it("throws notFound for missing lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await expect(
      updateGeneralLeadStatus(db, "nonexistent", { status: "pending_response" }, "col-1"),
    ).rejects.toThrowError("General lead not found");
  });

  it("transitions to pending_response status", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    const result = await updateGeneralLeadStatus(db, "lead-1", { status: "pending_response" }, "col-1");
    expect(result.data!.status).toBe("pending_response");
  });

  it("blocks closed_lost without lossReason", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    await expect(
      updateGeneralLeadStatus(db, "lead-1", { status: "closed_lost" }, "col-1"),
    ).rejects.toThrowError("Loss reason is required for closed_lost");
  });

  it("blocks closed_lost with empty lossReason", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    await expect(
      updateGeneralLeadStatus(db, "lead-1", { status: "closed_lost", lossReason: "  " }, "col-1"),
    ).rejects.toThrowError("Loss reason is required for closed_lost");
  });

  it("closes as lost with a valid lossReason", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    const result = await updateGeneralLeadStatus(
      db,
      "lead-1",
      { status: "closed_lost", lossReason: "Price/Budget" },
      "col-1",
    );
    expect(result.data!.status).toBe("closed_lost");
    expect(result.data!.lossReason).toBe("Price/Budget");
  });

  it("allows reopening a closed_lost lead to pending_response", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "closed_lost" });

    const result = await updateGeneralLeadStatus(db, "lead-1", { status: "pending_response" }, "col-1");
    expect(result.data!.status).toBe("pending_response");
  });

  it("allows reopening a closed_converted lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { status: "closed_converted", convertedHumanId: "h-1" });

    const result = await updateGeneralLeadStatus(db, "lead-1", { status: "open" }, "col-1");
    expect(result.data!.status).toBe("open");
  });

  it("allows setting closed_converted on an open lead via status endpoint", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    const result = await updateGeneralLeadStatus(
      db,
      "lead-1",
      { status: "closed_converted" },
      "col-1",
    );
    expect(result.data!.status).toBe("closed_converted");
  });

  it("allows reopening a closed_converted lead when no human is linked", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "closed_converted", convertedHumanId: null });

    const result = await updateGeneralLeadStatus(
      db,
      "lead-1",
      { status: "open" },
      "col-1",
    );
    expect(result.data!.status).toBe("open");
  });

  it("clears lossReason when reopening from closed_lost", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "closed_lost", lossReason: "Price/Budget" });

    const result = await updateGeneralLeadStatus(db, "lead-1", { status: "open" }, "col-1");
    expect(result.data!.lossReason).toBeNull();
  });

  it("writes an audit log entry on status change", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    await updateGeneralLeadStatus(db, "lead-1", { status: "pending_response" }, "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("STATUS_CHANGE");
  });
});

// ─── convertGeneralLead ──────────────────────────────────────────────────────

describe("convertGeneralLead", () => {
  it("throws notFound for missing lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await expect(
      convertGeneralLead(db, "nonexistent", "h-1", "col-1"),
    ).rejects.toThrowError("General lead not found");
  });

  it("throws notFound when human does not exist", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    await expect(
      convertGeneralLead(db, "lead-1", "nonexistent-human", "col-1"),
    ).rejects.toThrowError("Human not found");
  });

  it("blocks conversion when lead is already closed_lost", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { status: "closed_lost" });

    await expect(
      convertGeneralLead(db, "lead-1", "h-1", "col-1"),
    ).rejects.toThrowError("Lead is already closed");
  });

  it("blocks conversion when lead is already closed_converted", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2", "Jane", "Doe");
    await seedLead(db, "lead-1", { status: "closed_converted", convertedHumanId: "h-1" });

    await expect(
      convertGeneralLead(db, "lead-1", "h-2", "col-1"),
    ).rejects.toThrowError("Lead is already closed");
  });

  it("converts an open lead, sets status and convertedHumanId", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedLead(db, "lead-1", { status: "open" });

    const result = await convertGeneralLead(db, "lead-1", "h-1", "col-1");
    expect(result.data!.status).toBe("closed_converted");
    expect(result.data!.convertedHumanId).toBe("h-1");
  });

  it("reparents linked activities to the human on convert", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { status: "open" });
    await seedActivity(db, "act-1", { generalLeadId: "lead-1" });
    await seedActivity(db, "act-2", { generalLeadId: "lead-1" });

    await convertGeneralLead(db, "lead-1", "h-1", "col-1");

    const acts = await db.select().from(schema.activities);
    for (const act of acts) {
      expect(act.humanId).toBe("h-1");
      expect(act.generalLeadId).toBeNull();
    }
  });

  it("does not reparent activities belonging to other leads", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { status: "open" });
    await seedLead(db, "lead-2");
    await seedActivity(db, "act-other", { generalLeadId: "lead-2" });

    await convertGeneralLead(db, "lead-1", "h-1", "col-1");

    const actOther = await db.select().from(schema.activities);
    const other = actOther.find((a) => a.id === "act-other");
    expect(other!.generalLeadId).toBe("lead-2");
    expect(other!.humanId).toBeNull();
  });

  it("writes an audit log entry on convert", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { status: "open" });

    await convertGeneralLead(db, "lead-1", "h-1", "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("STATUS_CHANGE");
    expect(auditRows[0]!.entityType).toBe("general_lead");
  });
});

// ─── deleteGeneralLead ───────────────────────────────────────────────────────

describe("deleteGeneralLead", () => {
  it("throws notFound for missing lead", async () => {
    const db = getTestDb();
    await expect(deleteGeneralLead(db, "nonexistent")).rejects.toThrowError("General lead not found");
  });

  it("deletes the lead", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1");

    await deleteGeneralLead(db, "lead-1");

    const rows = await db.select().from(schema.generalLeads);
    expect(rows).toHaveLength(0);
  });

  it("nullifies generalLeadId on linked activities before deleting", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1");
    await seedActivity(db, "act-1", { generalLeadId: "lead-1" });
    await seedActivity(db, "act-2", { generalLeadId: "lead-1" });

    await deleteGeneralLead(db, "lead-1");

    const leads = await db.select().from(schema.generalLeads);
    expect(leads).toHaveLength(0);

    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(2);
    for (const act of acts) {
      expect(act.generalLeadId).toBeNull();
    }
  });

  it("does not nullify activities from other leads", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1");
    await seedLead(db, "lead-2");
    await seedActivity(db, "act-1", { generalLeadId: "lead-1" });
    await seedActivity(db, "act-2", { generalLeadId: "lead-2" });

    await deleteGeneralLead(db, "lead-1");

    const acts = await db.select().from(schema.activities);
    const actOther = acts.find((a) => a.id === "act-2");
    expect(actOther!.generalLeadId).toBe("lead-2");
  });
});

// ─── updateGeneralLead source/channel branch coverage ────────────────────────

describe("updateGeneralLead — source and channel fields", () => {
  it("updates source and channel fields", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1");

    const result = await updateGeneralLead(
      db,
      "lead-1",
      { source: "website", channel: "organic" },
      "col-1",
    );

    expect(result.data!.source).toBe("website");
    expect(result.data!.channel).toBe("organic");
  });

  it("can clear source and channel to null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1");
    await updateGeneralLead(db, "lead-1", { source: "referral", channel: "email" }, "col-1");

    const result = await updateGeneralLead(
      db,
      "lead-1",
      { source: null, channel: null },
      "col-1",
    );

    expect(result.data!.source).toBeNull();
    expect(result.data!.channel).toBeNull();
  });
});

// ─── getGeneralLead enrichment ───────────────────────────────────────────────

describe("getGeneralLead — linked contacts enrichment", () => {
  it("returns linked emails, phones, and socialIds with platform enrichment", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1");
    await seedPlatform(db, "plat-1", "Instagram");
    await seedEmail(db, "email-1", "test@example.com", "lead-1");
    await seedPhone(db, "phone-1", "+1234567890", "lead-1");
    await seedSocialId(db, "soc-1", "@testhandle", "lead-1", "plat-1");

    const result = await getGeneralLead(db, "lead-1");

    expect(result.emails).toHaveLength(1);
    expect(result.emails[0]!.email).toBe("test@example.com");
    expect(result.emails[0]!.generalLeadId).toBe("lead-1");

    expect(result.phoneNumbers).toHaveLength(1);
    expect(result.phoneNumbers[0]!.phoneNumber).toBe("+1234567890");
    expect(result.phoneNumbers[0]!.generalLeadId).toBe("lead-1");

    expect(result.socialIds).toHaveLength(1);
    expect(result.socialIds[0]!.handle).toBe("@testhandle");
    expect(result.socialIds[0]!.platformName).toBe("Instagram");
  });

  it("returns socialId with null platformName when no platform is set", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1");
    await seedSocialId(db, "soc-1", "@noplatform", "lead-1", null);

    const result = await getGeneralLead(db, "lead-1");

    expect(result.socialIds).toHaveLength(1);
    expect(result.socialIds[0]!.platformName).toBeNull();
  });
});

// ─── linkHumanToGeneralLead ──────────────────────────────────────────────────

describe("linkHumanToGeneralLead", () => {
  it("throws notFound when lead does not exist", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");

    await expect(
      linkHumanToGeneralLead(db, "nonexistent-lead", "h-1", "col-1"),
    ).rejects.toThrowError("General lead not found");
  });

  it("throws notFound when human does not exist", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1");

    await expect(
      linkHumanToGeneralLead(db, "lead-1", "nonexistent-human", "col-1"),
    ).rejects.toThrowError("Human not found");
  });

  it("returns without error when lead is already linked to the same human (idempotent)", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { convertedHumanId: "h-1" });

    await expect(
      linkHumanToGeneralLead(db, "lead-1", "h-1", "col-1"),
    ).resolves.toBeUndefined();

    // Verify no audit entry was written (idempotent short-circuit)
    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(0);
  });

  it("throws conflict when lead is already linked to a different human", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2", "Jane", "Doe");
    await seedLead(db, "lead-1", { convertedHumanId: "h-1" });

    await expect(
      linkHumanToGeneralLead(db, "lead-1", "h-2", "col-1"),
    ).rejects.toThrowError("Lead is already linked to a different human");
  });

  it("sets convertedHumanId and auto-sets closed_converted status on an open lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedLead(db, "lead-1");
    await seedActivity(db, "act-1", { generalLeadId: "lead-1" });
    await seedEmail(db, "email-1", "alice@example.com", "lead-1");
    await seedPhone(db, "phone-1", "+1111111111", "lead-1");
    await seedSocialId(db, "soc-1", "@alice", "lead-1");

    await linkHumanToGeneralLead(db, "lead-1", "h-1", "col-1");

    // Lead should have convertedHumanId set AND status auto-changed
    const leads = await db.select().from(schema.generalLeads);
    expect(leads[0]!.convertedHumanId).toBe("h-1");
    expect(leads[0]!.status).toBe("closed_converted");

    // Activity should have humanId set but retain generalLeadId (dual-associate)
    const acts = await db.select().from(schema.activities);
    expect(acts[0]!.humanId).toBe("h-1");
    expect(acts[0]!.generalLeadId).toBe("lead-1");

    // Email should have humanId set
    const emailRows = await db.select().from(schema.emails);
    expect(emailRows[0]!.humanId).toBe("h-1");
    expect(emailRows[0]!.generalLeadId).toBe("lead-1");

    // Phone should have humanId set
    const phoneRows = await db.select().from(schema.phones);
    expect(phoneRows[0]!.humanId).toBe("h-1");
    expect(phoneRows[0]!.generalLeadId).toBe("lead-1");

    // SocialId should have humanId set
    const socialRows = await db.select().from(schema.socialIds);
    expect(socialRows[0]!.humanId).toBe("h-1");
    expect(socialRows[0]!.generalLeadId).toBe("lead-1");
  });

  it("does not change status when linking human to an already closed_converted lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedLead(db, "lead-1", { status: "closed_converted", convertedHumanId: null });

    await linkHumanToGeneralLead(db, "lead-1", "h-1", "col-1");

    const leads = await db.select().from(schema.generalLeads);
    expect(leads[0]!.status).toBe("closed_converted");
    expect(leads[0]!.convertedHumanId).toBe("h-1");
  });

  it("does not change status when linking human to a closed_lost lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedLead(db, "lead-1", { status: "closed_lost", convertedHumanId: null });

    await linkHumanToGeneralLead(db, "lead-1", "h-1", "col-1");

    const leads = await db.select().from(schema.generalLeads);
    expect(leads[0]!.status).toBe("closed_lost");
  });

  it("writes a LINK_HUMAN audit log entry with status change when auto-setting closed_converted", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1");

    await linkHumanToGeneralLead(db, "lead-1", "h-1", "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("LINK_HUMAN");
    expect(auditRows[0]!.entityType).toBe("general_lead");
    expect(auditRows[0]!.entityId).toBe("lead-1");
    expect(auditRows[0]!.colleagueId).toBe("col-1");
    // Audit log should include status change
    const changes = auditRows[0]!.changes as Record<string, { old: unknown; new: unknown }>;
    expect(changes["status"]).toEqual({ old: "open", new: "closed_converted" });
  });

  it("does not overwrite humanId on activities that already have one set", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedLead(db, "lead-1");
    // act-1 is linked to lead-1 but already has humanId h-2
    await seedActivity(db, "act-1", { generalLeadId: "lead-1", humanId: "h-2" });

    await linkHumanToGeneralLead(db, "lead-1", "h-1", "col-1");

    // humanId should remain h-2 — the WHERE clause filters IS NULL
    const acts = await db.select().from(schema.activities);
    expect(acts[0]!.humanId).toBe("h-2");
  });
});

// ─── unlinkHumanFromGeneralLead ──────────────────────────────────────────────

describe("unlinkHumanFromGeneralLead", () => {
  it("throws notFound when lead does not exist", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    await expect(
      unlinkHumanFromGeneralLead(db, "nonexistent-lead", "col-1"),
    ).rejects.toThrowError("General lead not found");
  });

  it("returns without error when convertedHumanId is already null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { convertedHumanId: null });

    await expect(
      unlinkHumanFromGeneralLead(db, "lead-1", "col-1"),
    ).resolves.toBeUndefined();

    // No audit entry should be written
    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(0);
  });

  it("clears convertedHumanId and removes humanId from linked records", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedLead(db, "lead-1", { convertedHumanId: "h-1" });
    // Seed linked records with humanId already set (as if linkHuman was called previously)
    await seedActivity(db, "act-1", { generalLeadId: "lead-1", humanId: "h-1" });
    await seedEmail(db, "email-1", "alice@example.com", "lead-1", "h-1");
    await seedPhone(db, "phone-1", "+2222222222", "lead-1", "h-1");
    await seedSocialId(db, "soc-1", "@alice", "lead-1", null, "h-1");

    await unlinkHumanFromGeneralLead(db, "lead-1", "col-1");

    // Lead should have convertedHumanId cleared
    const leads = await db.select().from(schema.generalLeads);
    expect(leads[0]!.convertedHumanId).toBeNull();

    // Activity should have humanId cleared
    const acts = await db.select().from(schema.activities);
    expect(acts[0]!.humanId).toBeNull();
    expect(acts[0]!.generalLeadId).toBe("lead-1");

    // Email should have humanId cleared
    const emailRows = await db.select().from(schema.emails);
    expect(emailRows[0]!.humanId).toBeNull();

    // Phone should have humanId cleared
    const phoneRows = await db.select().from(schema.phones);
    expect(phoneRows[0]!.humanId).toBeNull();

    // SocialId should have humanId cleared
    const socialRows = await db.select().from(schema.socialIds);
    expect(socialRows[0]!.humanId).toBeNull();
  });

  it("does not clear humanId on records linked to a different human", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedLead(db, "lead-1", { convertedHumanId: "h-1" });
    // act-1 belongs to lead-1 but has humanId h-2 (directly linked, not via this lead's link)
    await seedActivity(db, "act-1", { generalLeadId: "lead-1", humanId: "h-2" });

    await unlinkHumanFromGeneralLead(db, "lead-1", "col-1");

    // act-1.humanId should remain h-2 — WHERE clause checks eq(humanId, previousHumanId)
    const acts = await db.select().from(schema.activities);
    expect(acts[0]!.humanId).toBe("h-2");
  });

  it("writes an UNLINK_HUMAN audit log entry", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { convertedHumanId: "h-1" });

    await unlinkHumanFromGeneralLead(db, "lead-1", "col-1");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]!.action).toBe("UNLINK_HUMAN");
    expect(auditRows[0]!.entityType).toBe("general_lead");
    expect(auditRows[0]!.entityId).toBe("lead-1");
    expect(auditRows[0]!.colleagueId).toBe("col-1");
  });

  it("reverts closed_converted status to open when unlinking", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { status: "closed_converted", convertedHumanId: "h-1" });

    await unlinkHumanFromGeneralLead(db, "lead-1", "col-1");

    const leads = await db.select().from(schema.generalLeads);
    expect(leads[0]!.status).toBe("open");
    expect(leads[0]!.convertedHumanId).toBeNull();
  });

  it("does not change closed_lost status when unlinking", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { status: "closed_lost", convertedHumanId: "h-1" });

    await unlinkHumanFromGeneralLead(db, "lead-1", "col-1");

    const leads = await db.select().from(schema.generalLeads);
    expect(leads[0]!.status).toBe("closed_lost");
  });
});

// ─── Branch coverage: toGeneralLeadStatus invalid input ───────────────────

describe("listGeneralLeads — toGeneralLeadStatus invalid fallback via status filter", () => {
  it("treats an invalid status filter as 'open' and returns leads with open status", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1", { status: "open" });
    await seedLead(db, "lead-2", { status: "pending_response" });

    // "invalid_status" is not in generalLeadStatuses, toGeneralLeadStatus maps it to "open"
    const result = await listGeneralLeads(db, 1, 25, { status: "invalid_status" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("lead-1");
    expect(result.data[0]!.status).toBe("open");
  });
});

// ─── Branch coverage: listGeneralLeads combined filters ───────────────────

describe("listGeneralLeads — combined filter branches", () => {
  it("filters by q search term matching lastName", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1", { lastName: "Searchable" });
    await seedLead(db, "lead-2", { lastName: "NotMatching" });

    const result = await listGeneralLeads(db, 1, 25, { q: "Searchable" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("lead-1");
  });

  it("filters by status returning only the matching status value", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1", { status: "open" });
    await seedLead(db, "lead-2", { status: "pending_response" });
    await seedLead(db, "lead-3", { status: "closed_lost" });

    const result = await listGeneralLeads(db, 1, 25, { status: "open" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("lead-1");
    expect(result.data[0]!.status).toBe("open");
  });

  it("filters by convertedHumanId returning only leads linked to that human", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-filter-1", "Filter", "Human");
    await seedLead(db, "lead-linked", { convertedHumanId: "h-filter-1", status: "closed_converted" });
    await seedLead(db, "lead-unlinked");

    const result = await listGeneralLeads(db, 1, 25, { convertedHumanId: "h-filter-1" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("lead-linked");
  });

  it("returns null convertedHumanDisplayId and convertedHumanName when convertedHumanId is null", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1", { convertedHumanId: null });

    const result = await listGeneralLeads(db, 1, 25, {});
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.convertedHumanDisplayId).toBeNull();
    expect(result.data[0]!.convertedHumanName).toBeNull();
  });
});

// ─── Branch coverage: updateGeneralLead no changes → no audit entry ───────

describe("updateGeneralLead — no changes detected skips audit log", () => {
  it("does not write an audit entry when the update payload matches existing values", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { firstName: "Same", lastName: "Name", notes: "Same notes" });

    // Update with the exact same values — computeDiff should return null
    const result = await updateGeneralLead(
      db,
      "lead-1",
      { firstName: "Same", lastName: "Name", notes: "Same notes" },
      "col-1",
    );

    expect(result.data!.firstName).toBe("Same");
    expect(result.data!.lastName).toBe("Name");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(0);
  });
});

// ─── Branch coverage: updateGeneralLeadStatus no change → no audit entry ──

describe("updateGeneralLeadStatus — same status produces no audit entry", () => {
  it("does not write an audit entry when new status equals existing status", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    // Seed with "pending_response" so we can "update" to the same value
    await seedLead(db, "lead-1", { status: "pending_response" });

    const result = await updateGeneralLeadStatus(
      db,
      "lead-1",
      { status: "pending_response" },
      "col-1",
    );

    expect(result.data!.status).toBe("pending_response");

    const auditRows = await db.select().from(schema.auditLog);
    expect(auditRows).toHaveLength(0);
  });
});

// ─── Branch coverage: getGeneralLead convertedHumanId set but human gone ──

describe("getGeneralLead — convertedHumanId references a missing human", () => {
  it("returns null convertedHumanDisplayId and convertedHumanName when the referenced human does not exist", async () => {
    const db = getTestDb();
    // Seed human so FK is satisfied during insert, then remove FK constraint check via raw SQL
    await seedHuman(db, "h-ghost", "Ghost", "Human");
    await seedLead(db, "lead-ghost", { convertedHumanId: "h-ghost", status: "closed_converted" });

    // Update converted_human_id to a dangling value by bypassing FK with session_replication_role
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(
      sql`UPDATE general_leads SET converted_human_id = 'does-not-exist' WHERE id = 'lead-ghost'`,
    );
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await getGeneralLead(db, "lead-ghost");

    expect(result.id).toBe("lead-ghost");
    expect(result.convertedHumanDisplayId).toBeNull();
    expect(result.convertedHumanName).toBeNull();
  });
});

// ─── importLeadFromFront ──────────────────────────────────────────────────────

function buildConversation(
  overrides: Partial<{
    id: string;
    subject: string;
    recipient: { handle: string; name: string | null };
  }> = {},
) {
  return {
    id: overrides.id ?? "cnv_test",
    subject: overrides.subject ?? "Test Subject",
    recipient: overrides.recipient ?? { handle: "test@example.com", name: "Test User" },
    status: "assigned",
    assignee: null,
    tags: [],
    links: [],
    created_at: 1700000000,
  };
}

function buildMessages(
  msgs: Partial<{
    id: string;
    is_draft: boolean;
    is_inbound: boolean;
    created_at: number;
    text: string;
    blurb: string;
    type: string | undefined;
    recipients: { role: string; handle: string; name?: string }[];
  }>[] = [],
) {
  const defaults = msgs.length > 0 ? msgs : [
    {
      id: "msg_1",
      is_draft: false,
      is_inbound: true,
      created_at: 1700000000,
      text: "Hello",
      blurb: "",
      type: undefined,
      recipients: [],
    },
  ];
  return {
    _results: defaults.map((m) => ({
      id: m.id ?? "msg_1",
      is_draft: m.is_draft ?? false,
      is_inbound: m.is_inbound ?? true,
      created_at: m.created_at ?? 1700000000,
      text: m.text ?? "Hello",
      blurb: m.blurb ?? "",
      type: m.type,
      recipients: m.recipients ?? [],
    })),
    _pagination: { next: null },
  };
}

describe("importLeadFromFront", () => {
  beforeEach(() => {
    mockFrontFetch.mockReset();
  });

  it("imports a lead from a cnv_ conversation ID — happy path", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_happy",
      subject: "Hello",
      recipient: { handle: "john@example.com", name: "John Doe" },
    });
    const messages = buildMessages();

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_happy/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_happy")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const result = await importLeadFromFront(db, "cnv_happy", "fake-token", "col-1");

    expect(result.lead.displayId).toMatch(/^LEA-/);
    expect(result.activitiesImported).toBe(1);
    expect(result.contactHandle).toBe("john@example.com");
    expect(result.contactName).toBe("John Doe");

    // Verify lead was persisted with the correct name
    const leads = await db.select().from(schema.generalLeads);
    expect(leads).toHaveLength(1);
    expect(leads[0]!.firstName).toBe("John");
    expect(leads[0]!.lastName).toBe("Doe");
    expect(leads[0]!.frontConversationId).toBe("cnv_happy");

    // Verify email was created for the @ handle
    const emails = await db.select().from(schema.emails);
    expect(emails).toHaveLength(1);
    expect(emails[0]!.email).toBe("john@example.com");
  });

  it("resolves a msg_ prefix to its conversation and imports the lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_456",
      subject: "From message",
      recipient: { handle: "jane@example.com", name: "Jane Smith" },
    });
    const messages = buildMessages();

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/messages/msg_123")) {
        return Promise.resolve({
          _links: {
            related: {
              conversation: "https://api2.frontapp.com/conversations/cnv_456",
            },
          },
        });
      }
      if ((url as string).includes("/conversations/cnv_456/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_456")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const result = await importLeadFromFront(db, "msg_123", "fake-token", "col-1");

    expect(result.lead.displayId).toMatch(/^LEA-/);
    expect(result.contactHandle).toBe("jane@example.com");

    const leads = await db.select().from(schema.generalLeads);
    expect(leads).toHaveLength(1);
    expect(leads[0]!.frontConversationId).toBe("cnv_456");
  });

  it("throws for an invalid frontId prefix", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    await expect(
      importLeadFromFront(db, "invalid_123", "fake-token", "col-1"),
    ).rejects.toThrowError("Invalid Front ID format");
  });

  it("throws when the conversation was already imported", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    // Seed a lead with the frontConversationId already set
    const ts = now();
    await db.insert(schema.generalLeads).values({
      id: "lead-dup",
      displayId: nextDisplayId("LEA"),
      status: "open",
      firstName: "Already",
      lastName: "Imported",
      middleName: null,
      notes: null,
      ownerId: null,
      convertedHumanId: null,
      rejectReason: null,
      frontConversationId: "cnv_dup",
      createdAt: ts,
      updatedAt: ts,
    });

    const conversation = buildConversation({ id: "cnv_dup" });
    const messages = buildMessages();

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_dup/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_dup")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await expect(
      importLeadFromFront(db, "cnv_dup", "fake-token", "col-1"),
    ).rejects.toThrowError("Conversation already imported");
  });

  it("creates a phone number for a phone handle", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_phone",
      subject: "Phone contact",
      recipient: { handle: "+15551234567", name: "Phone User" },
    });
    const messages = buildMessages();

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_phone/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_phone")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const result = await importLeadFromFront(db, "cnv_phone", "fake-token", "col-1");

    expect(result.contactHandle).toBe("+15551234567");

    // Verify phone number was created
    const phones = await db.select().from(schema.phones);
    expect(phones).toHaveLength(1);
    expect(phones[0]!.phoneNumber).toBe("+15551234567");
    expect(phones[0]!.generalLeadId).toBe(result.lead.id);
  });

  it("parses a single-word name into firstName only, lastName becomes (unknown)", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_onename",
      recipient: { handle: "madonna@example.com", name: "Madonna" },
    });
    const messages = buildMessages();

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_onename/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_onename")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await importLeadFromFront(db, "cnv_onename", "fake-token", "col-1");

    const leads = await db.select().from(schema.generalLeads);
    expect(leads).toHaveLength(1);
    expect(leads[0]!.firstName).toBe("Madonna");
    expect(leads[0]!.lastName).toBe("(unknown)");
  });

  it("uses handle as displayName when contact name is null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_noname",
      recipient: { handle: "noname@example.com", name: null },
    });
    const messages = buildMessages();

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_noname/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_noname")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await importLeadFromFront(db, "cnv_noname", "fake-token", "col-1");

    const leads = await db.select().from(schema.generalLeads);
    expect(leads).toHaveLength(1);
    // Handle "noname@example.com" → parseName uses the whole string, firstName = "noname@example.com", lastName = "(unknown)"
    expect(leads[0]!.firstName).toBe("noname@example.com");
  });

  it("uses blurb when message text is empty", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_blurb",
      subject: "Blurb test",
      recipient: { handle: "blurb@example.com", name: "Blurb User" },
    });
    const messages = buildMessages([
      {
        id: "msg_blurb",
        is_draft: false,
        is_inbound: true,
        created_at: 1700000000,
        text: "",
        blurb: "This is the blurb content",
        type: undefined,
        recipients: [],
      },
    ]);

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_blurb/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_blurb")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await importLeadFromFront(db, "cnv_blurb", "fake-token", "col-1");

    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(1);
    expect(acts[0]!.body).toBe("This is the blurb content");
  });

  it("skips draft messages and only imports non-draft messages", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_drafts",
      recipient: { handle: "drafts@example.com", name: "Draft User" },
    });
    const messages = buildMessages([
      {
        id: "msg_draft",
        is_draft: true,
        is_inbound: true,
        created_at: 1700000000,
        text: "Draft message",
        blurb: "",
        type: undefined,
        recipients: [],
      },
      {
        id: "msg_real",
        is_draft: false,
        is_inbound: false,
        created_at: 1700000001,
        text: "Real message",
        blurb: "",
        type: undefined,
        recipients: [],
      },
    ]);

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_drafts/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_drafts")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const result = await importLeadFromFront(db, "cnv_drafts", "fake-token", "col-1");

    expect(result.activitiesImported).toBe(1);
    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(1);
    expect(acts[0]!.frontId).toBe("msg_real");
  });

  it("falls back to message recipients when conversation recipient is a colleague", async () => {
    const db = getTestDb();

    // Seed the colleague whose email matches the conversation recipient
    const ts = now();
    await db.insert(schema.colleagues).values({
      id: "col-admin",
      displayId: nextDisplayId("COL"),
      email: "admin@company.com",
      firstName: "Admin",
      lastName: "User",
      name: "Admin User",
      role: "admin",
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    });

    const conversation = buildConversation({
      id: "cnv_colleague",
      subject: "Colleague sender",
      // recipient is the colleague — should be skipped
      recipient: { handle: "admin@company.com", name: "Admin User" },
    });

    // Messages contain the external client as a "to" recipient
    const messages = buildMessages([
      {
        id: "msg_to_client",
        is_draft: false,
        is_inbound: false,
        created_at: 1700000000,
        text: "Hello client",
        blurb: "",
        type: undefined,
        recipients: [{ role: "to", handle: "external@client.com", name: "Client" }],
      },
    ]);

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_colleague/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_colleague")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const result = await importLeadFromFront(db, "cnv_colleague", "fake-token", "col-admin");

    // Should have resolved to the external client, not the colleague
    expect(result.contactHandle).toBe("external@client.com");

    const leads = await db.select().from(schema.generalLeads);
    expect(leads).toHaveLength(1);
    expect(leads[0]!.firstName).toBe("Client");
  });

  // ─── L743 if[1]: both text and blurb empty → body is null ──────────────────

  it("sets activity body to null when both message text and blurb are empty strings", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_nobody",
      subject: "No Body",
      recipient: { handle: "nobody@example.com", name: "No Body" },
    });
    const messages = buildMessages([
      {
        id: "msg_nobody",
        is_draft: false,
        is_inbound: true,
        created_at: 1700000000,
        text: "",
        blurb: "",
        type: undefined,
        recipients: [],
      },
    ]);

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_nobody/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_nobody")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await importLeadFromFront(db, "cnv_nobody", "fake-token", "col-1");

    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(1);
    // Both text and blurb are empty → body is null (L759 cond-expr[1])
    expect(acts[0]!.body).toBeNull();
    // noteLines only has the direction line, no content line pushed
    expect(acts[0]!.notes).toContain("Inbound from");
    expect(acts[0]!.notes).not.toContain("\n\n");
  });

  // ─── L748 cond-expr[1]: empty subject → "Email conversation" fallback ───────

  it("falls back to 'Email conversation' subject when conversation subject is empty and handle is email", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_nosubj_email",
      subject: "",
      recipient: { handle: "user@email.com", name: "Email User" },
    });
    const messages = buildMessages([
      {
        id: "msg_nosubj_email",
        is_draft: false,
        is_inbound: true,
        created_at: 1700000000,
        text: "Hello",
        blurb: "",
        type: undefined,
        recipients: [],
      },
    ]);

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_nosubj_email/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_nosubj_email")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await importLeadFromFront(db, "cnv_nosubj_email", "fake-token", "col-1");

    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(1);
    // subject is "" → falls back to "Email conversation" (email handle contains "@")
    expect(acts[0]!.subject).toBe("Email conversation");
  });

  // ─── L750 nested ternary: empty subject + WhatsApp handle ─────────────────

  it("falls back to 'WhatsApp conversation' subject when conversation subject is empty and handle is a phone number", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_nosubj_wa",
      subject: "",
      recipient: { handle: "+15559876543", name: "WA User" },
    });
    const messages = buildMessages([
      {
        id: "msg_nosubj_wa",
        is_draft: false,
        is_inbound: true,
        created_at: 1700000000,
        text: "Hey",
        blurb: "",
        type: "custom",
        recipients: [],
      },
    ]);

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_nosubj_wa/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_nosubj_wa")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await importLeadFromFront(db, "cnv_nosubj_wa", "fake-token", "col-1");

    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(1);
    // subject is "" and handle is phone → activityType is "whatsapp_message" → "WhatsApp conversation"
    expect(acts[0]!.subject).toBe("WhatsApp conversation");
  });

  // ─── L750 nested ternary: empty subject + social handle ───────────────────

  it("falls back to 'Social conversation' subject when conversation subject is empty and handle is non-email non-phone", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_nosubj_social",
      subject: "",
      recipient: { handle: "facebook_user_12345", name: "Social Person" },
    });
    const messages = buildMessages([
      {
        id: "msg_nosubj_social",
        is_draft: false,
        is_inbound: true,
        created_at: 1700000000,
        text: "Hi",
        blurb: "",
        type: undefined,
        recipients: [],
      },
    ]);

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_nosubj_social/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_nosubj_social")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await importLeadFromFront(db, "cnv_nosubj_social", "fake-token", "col-1");

    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(1);
    // subject is "" and handle is not email or phone → "Social conversation"
    expect(acts[0]!.subject).toBe("Social conversation");
  });

  // ─── L584 if[0]: parseName("") → both (unknown) ──────────────────────────

  it("parses an empty contact name string into both firstName and lastName as '(unknown)'", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_emptyname",
      recipient: { handle: "anon@example.com", name: "" },
    });
    const messages = buildMessages();

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_emptyname/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_emptyname")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await importLeadFromFront(db, "cnv_emptyname", "fake-token", "col-1");

    const leads = await db.select().from(schema.generalLeads);
    expect(leads).toHaveLength(1);
    // parseName("") → { firstName: "(unknown)", lastName: "(unknown)" }
    expect(leads[0]!.firstName).toBe("(unknown)");
    expect(leads[0]!.lastName).toBe("(unknown)");
  });

  // ─── L604-607: msg_ with malformed _links (no conversation URL) ───────────

  it("throws VALIDATION_FAILED when msg_ message response has no _links.related.conversation", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/messages/msg_malformed")) {
        // Return a response with no _links.related.conversation
        return Promise.resolve({ _links: { related: {} } });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await expect(
      importLeadFromFront(db, "msg_malformed", "fake-token", "col-1"),
    ).rejects.toThrowError("Could not resolve message to conversation");
  });

  // ─── L612 if[0]: extracted ID doesn't start with cnv_ ────────────────────

  it("throws VALIDATION_FAILED when the extracted conversation ID from URL does not start with cnv_", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/messages/msg_badcnv")) {
        return Promise.resolve({
          _links: {
            related: {
              conversation: "https://api2.frontapp.com/conversations/bad_not_cnv",
            },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await expect(
      importLeadFromFront(db, "msg_badcnv", "fake-token", "col-1"),
    ).rejects.toThrowError("Could not resolve message to conversation");
  });

  // ─── L637 if[0]: invalid conversation response (not FrontConversation) ────

  it("throws VALIDATION_FAILED when conversation fetch returns data that fails isFrontConversation check", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_invalid_shape/messages")) {
        return Promise.resolve(buildMessages());
      }
      if ((url as string).includes("/conversations/cnv_invalid_shape")) {
        // Return an object missing required FrontConversation fields
        return Promise.resolve({ totally: "wrong", shape: true });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    await expect(
      importLeadFromFront(db, "cnv_invalid_shape", "fake-token", "col-1"),
    ).rejects.toThrowError("Invalid conversation response from Front");
  });

  // ─── L746: EMAIL_DUPLICATE catch — link existing email to new lead ───────────

  it("links an existing email to the imported lead when the email address is already in the DB", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    // Pre-seed the email address that will be used as the contact handle
    const ts = now();
    await db.insert(schema.emails).values({
      id: "pre-existing-email",
      displayId: nextDisplayId("EML"),
      email: "duplicate@example.com",
      generalLeadId: null,
      humanId: null,
      accountId: null,
      websiteBookingRequestId: null,
      routeSignupId: null,
      labelId: null,
      isPrimary: false,
      createdAt: ts,
    });

    const conversation = buildConversation({
      id: "cnv_dup_email",
      subject: "Duplicate email import",
      recipient: { handle: "duplicate@example.com", name: "Dup User" },
    });
    const messages = buildMessages();

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_dup_email/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_dup_email")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const result = await importLeadFromFront(db, "cnv_dup_email", "fake-token", "col-1");

    expect(result.lead.displayId).toMatch(/^LEA-/);
    expect(result.contactHandle).toBe("duplicate@example.com");

    // The pre-existing email should now be linked to the new lead (updateEmail was called)
    const emailRows = await db.select().from(schema.emails);
    expect(emailRows).toHaveLength(1);
    expect(emailRows[0]!.id).toBe("pre-existing-email");
    expect(emailRows[0]!.generalLeadId).toBe(result.lead.id);
  });

  // ─── L758: PHONE_DUPLICATE catch — link existing phone to new lead ──────────

  it("links an existing phone to the imported lead when the phone number is already in the DB", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    // Pre-seed the phone number that will be used as the contact handle
    const ts = now();
    await db.insert(schema.phones).values({
      id: "pre-existing-phone",
      displayId: nextDisplayId("FON"),
      phoneNumber: "+19995550123",
      generalLeadId: null,
      humanId: null,
      accountId: null,
      websiteBookingRequestId: null,
      routeSignupId: null,
      labelId: null,
      hasWhatsapp: false,
      isPrimary: false,
      createdAt: ts,
    });

    const conversation = buildConversation({
      id: "cnv_dup_phone",
      subject: "Duplicate phone import",
      recipient: { handle: "+19995550123", name: "Phone Dup" },
    });
    const messages = buildMessages();

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_dup_phone/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_dup_phone")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const result = await importLeadFromFront(db, "cnv_dup_phone", "fake-token", "col-1");

    expect(result.lead.displayId).toMatch(/^LEA-/);
    expect(result.contactHandle).toBe("+19995550123");

    // The pre-existing phone should now be linked to the new lead (updatePhoneNumber was called)
    const phoneRows = await db.select().from(schema.phones);
    expect(phoneRows).toHaveLength(1);
    expect(phoneRows[0]!.id).toBe("pre-existing-phone");
    expect(phoneRows[0]!.generalLeadId).toBe(result.lead.id);
  });

  // ─── Colleague-recipient: all "to" recipients are also colleagues ─────────────

  it("falls back to no-contact error when the conversation recipient is a colleague and all message 'to' recipients are also colleagues", async () => {
    const db = getTestDb();
    const ts = now();

    // Two colleagues: one is the conversation recipient, one is the "to" recipient
    await db.insert(schema.colleagues).values({
      id: "col-sender",
      displayId: nextDisplayId("COL"),
      email: "sender@company.com",
      firstName: "Sender",
      lastName: "Col",
      name: "Sender Col",
      role: "admin",
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    });
    await db.insert(schema.colleagues).values({
      id: "col-recipient",
      displayId: nextDisplayId("COL"),
      email: "recipient@company.com",
      firstName: "Recipient",
      lastName: "Col",
      name: "Recipient Col",
      role: "agent",
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    });

    const conversation = buildConversation({
      id: "cnv_all_colleagues",
      subject: "Internal",
      // conversation recipient is a colleague
      recipient: { handle: "sender@company.com", name: "Sender Col" },
    });

    // All "to" recipients in messages are also colleagues
    const messages = buildMessages([
      {
        id: "msg_internal",
        is_draft: false,
        is_inbound: false,
        created_at: 1700000000,
        text: "Internal message",
        blurb: "",
        type: undefined,
        recipients: [{ role: "to", handle: "recipient@company.com", name: "Recipient Col" }],
      },
    ]);

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("/conversations/cnv_all_colleagues/messages")) return Promise.resolve(messages);
      if ((url as string).includes("/conversations/cnv_all_colleagues")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    // contactHandle remains the original colleague handle since no external recipient was found
    // then hits the "contactHandle === ''" check — but actually contactHandle is not "" here,
    // it's still "sender@company.com". The loop doesn't find a non-colleague "to" recipient,
    // so contactHandle remains the colleague email. The code then tries to create an email
    // for the colleague handle, which will succeed (the colleague email doesn't exist in emails table).
    // This covers the branch where the inner loop finds only colleague recipients (recipientIsColleague=true).
    const result = await importLeadFromFront(db, "cnv_all_colleagues", "fake-token", "col-sender");
    // The lead is created with the colleague's email as handle
    expect(result.contactHandle).toBe("sender@company.com");
    expect(result.lead.displayId).toMatch(/^LEA-/);
  });

  // ─── Paginated messages (nextUrl branch) ────────────────────────────────────

  it("fetches subsequent pages when pagination next URL is set", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const conversation = buildConversation({
      id: "cnv_paged",
      subject: "Paged conversation",
      recipient: { handle: "paged@example.com", name: "Paged User" },
    });

    const page1 = {
      _results: [
        {
          id: "msg_page1",
          is_draft: false,
          is_inbound: true,
          created_at: 1700000000,
          text: "Page 1 message",
          blurb: "",
          type: undefined,
          recipients: [],
        },
      ],
      _pagination: { next: "https://api2.frontapp.com/conversations/cnv_paged/messages?page=2" },
    };

    const page2 = {
      _results: [
        {
          id: "msg_page2",
          is_draft: false,
          is_inbound: false,
          created_at: 1700000001,
          text: "Page 2 message",
          blurb: "",
          type: undefined,
          recipients: [],
        },
      ],
      _pagination: { next: null },
    };

    mockFrontFetch.mockImplementation((url: string) => {
      if ((url as string).includes("?page=2")) return Promise.resolve(page2);
      if ((url as string).includes("/conversations/cnv_paged/messages")) return Promise.resolve(page1);
      if ((url as string).includes("/conversations/cnv_paged")) return Promise.resolve(conversation);
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const result = await importLeadFromFront(db, "cnv_paged", "fake-token", "col-1");

    // Both pages were imported — 2 non-draft messages
    expect(result.activitiesImported).toBe(2);
    const acts = await db.select().from(schema.activities);
    expect(acts).toHaveLength(2);
    const actIds = acts.map((a) => a.frontId);
    expect(actIds).toContain("msg_page1");
    expect(actIds).toContain("msg_page2");
  });
});
