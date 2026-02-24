import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listGeneralLeads,
  getGeneralLead,
  createGeneralLead,
  updateGeneralLead,
  updateGeneralLeadStatus,
  convertGeneralLead,
  deleteGeneralLead,
} from "../../../src/services/general-leads";
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

async function seedLead(
  db: ReturnType<typeof getTestDb>,
  id = "lead-1",
  overrides: Partial<{
    status: string;
    source: string;
    notes: string | null;
    email: string | null;
    phone: string | null;
    ownerId: string | null;
    convertedHumanId: string | null;
    rejectReason: string | null;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.generalLeads).values({
    id,
    displayId: nextDisplayId("LEA"),
    status: overrides.status ?? "open",
    source: overrides.source ?? "email",
    notes: overrides.notes ?? null,
    email: overrides.email ?? null,
    phone: overrides.phone ?? null,
    ownerId: overrides.ownerId ?? null,
    convertedHumanId: overrides.convertedHumanId ?? null,
    rejectReason: overrides.rejectReason ?? null,
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
    await seedLead(db, "lead-1", { source: "direct_referral", ownerId: "col-1" });

    const result = await listGeneralLeads(db, 1, 25, {});
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("lead-1");
    expect(result.data[0]!.source).toBe("direct_referral");
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
    await seedLead(db, "lead-2", { status: "qualified" });
    await seedLead(db, "lead-3", { status: "closed_rejected" });

    const result = await listGeneralLeads(db, 1, 25, { status: "qualified" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("lead-2");
  });

  it("filters by source", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1", { source: "email" });
    await seedLead(db, "lead-2", { source: "direct_referral" });

    const result = await listGeneralLeads(db, 1, 25, { source: "direct_referral" });
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

  it("filters by search query matching email", async () => {
    const db = getTestDb();
    await seedLead(db, "lead-1", { email: "alice@example.com" });
    await seedLead(db, "lead-2", { email: "bob@example.com" });

    const result = await listGeneralLeads(db, 1, 25, { q: "alice" });
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
    await seedLead(db, "lead-1", { source: "whatsapp", email: "test@example.com" });

    const result = await getGeneralLead(db, "lead-1");
    expect(result.id).toBe("lead-1");
    expect(result.source).toBe("whatsapp");
    expect(result.email).toBe("test@example.com");
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
      { source: "email" },
      "col-1",
    );

    expect(result.id).toBeDefined();
    expect(result.displayId).toMatch(/^LEA-/);

    const rows = await db.select().from(schema.generalLeads);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("open");
    expect(rows[0]!.source).toBe("email");
    expect(rows[0]!.notes).toBeNull();
    expect(rows[0]!.email).toBeNull();
    expect(rows[0]!.phone).toBeNull();
    expect(rows[0]!.ownerId).toBeNull();
  });

  it("creates a lead with all optional fields", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const result = await createGeneralLead(
      db,
      {
        source: "direct_referral",
        notes: "Referred by John",
        email: "lead@example.com",
        phone: "+1234567890",
        ownerId: "col-1",
      },
      "col-1",
    );

    const rows = await db.select().from(schema.generalLeads);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.notes).toBe("Referred by John");
    expect(rows[0]!.email).toBe("lead@example.com");
    expect(rows[0]!.phone).toBe("+1234567890");
    expect(rows[0]!.ownerId).toBe("col-1");
    expect(result.displayId).toMatch(/^LEA-/);
  });

  it("writes an audit log entry on create", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    await createGeneralLead(db, { source: "email" }, "col-1");

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

  it("updates email field", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { email: "old@example.com" });

    const result = await updateGeneralLead(db, "lead-1", { email: "new@example.com" }, "col-1");
    expect(result.data!.email).toBe("new@example.com");
  });

  it("updates phone field", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { phone: "+1111111111" });

    const result = await updateGeneralLead(db, "lead-1", { phone: "+9999999999" }, "col-1");
    expect(result.data!.phone).toBe("+9999999999");
  });

  it("can set email to null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { email: "someone@example.com" });

    const result = await updateGeneralLead(db, "lead-1", { email: null }, "col-1");
    expect(result.data!.email).toBeNull();
  });

  it("blocks owner change on a closed lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedColleague(db, "col-2");
    await seedLead(db, "lead-1", { status: "closed_rejected" });

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
      updateGeneralLeadStatus(db, "nonexistent", { status: "qualified" }, "col-1"),
    ).rejects.toThrowError("General lead not found");
  });

  it("transitions to qualified status", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    const result = await updateGeneralLeadStatus(db, "lead-1", { status: "qualified" }, "col-1");
    expect(result.data!.status).toBe("qualified");
  });

  it("blocks closed_rejected without rejectReason", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    await expect(
      updateGeneralLeadStatus(db, "lead-1", { status: "closed_rejected" }, "col-1"),
    ).rejects.toThrowError("Reject reason is required for closed_rejected");
  });

  it("blocks closed_rejected with empty rejectReason", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    await expect(
      updateGeneralLeadStatus(db, "lead-1", { status: "closed_rejected", rejectReason: "  " }, "col-1"),
    ).rejects.toThrowError("Reject reason is required for closed_rejected");
  });

  it("closes as rejected with a valid rejectReason", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    const result = await updateGeneralLeadStatus(
      db,
      "lead-1",
      { status: "closed_rejected", rejectReason: "Not a good fit" },
      "col-1",
    );
    expect(result.data!.status).toBe("closed_rejected");
    expect(result.data!.rejectReason).toBe("Not a good fit");
  });

  it("blocks transition from a closed_rejected lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "closed_rejected" });

    await expect(
      updateGeneralLeadStatus(db, "lead-1", { status: "qualified" }, "col-1"),
    ).rejects.toThrowError("Cannot change status of a closed lead");
  });

  it("blocks transition from a closed_converted lead", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { status: "closed_converted", convertedHumanId: "h-1" });

    await expect(
      updateGeneralLeadStatus(db, "lead-1", { status: "open" }, "col-1"),
    ).rejects.toThrowError("Cannot change status of a closed lead");
  });

  it("blocks setting closed_converted via status endpoint (must use convert endpoint)", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    await expect(
      updateGeneralLeadStatus(db, "lead-1", { status: "closed_converted" }, "col-1"),
    ).rejects.toThrowError("Use the convert endpoint to set closed_converted status");
  });

  it("writes an audit log entry on status change", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedLead(db, "lead-1", { status: "open" });

    await updateGeneralLeadStatus(db, "lead-1", { status: "qualified" }, "col-1");

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

  it("blocks conversion when lead is already closed_rejected", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");
    await seedLead(db, "lead-1", { status: "closed_rejected" });

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
