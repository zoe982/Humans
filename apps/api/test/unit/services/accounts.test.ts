import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { getTestDb } from "../setup";
import {
  listAccounts,
  getAccountDetail,
  createAccount,
  updateAccount,
  updateAccountStatus,
  deleteAccount,
  addAccountEmail,
  deleteAccountEmail,
  addAccountPhone,
  deleteAccountPhone,
  linkAccountHuman,
  updateAccountHumanLabel,
  unlinkAccountHuman,
} from "../../../src/services/accounts";
import * as schema from "@humans/db/schema";
import { eq } from "drizzle-orm";

function mockSupabase() {
  const chain: Record<string, unknown> = {};
  chain["from"] = () => chain;
  chain["select"] = () => chain;
  chain["eq"] = () => Promise.resolve({ data: [], error: null });
  chain["in"] = () => Promise.resolve({ data: [], error: null });
  chain["delete"] = () => chain;
  chain["update"] = () => chain;
  chain["single"] = () => Promise.resolve({ data: null, error: null });
  return chain as any;
}

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

describe("listAccounts", () => {
  it("returns empty list when no accounts", async () => {
    const db = getTestDb();
    const result = await listAccounts(db);
    expect(result.data).toHaveLength(0);
  });

  it("returns accounts with types resolved", async () => {
    const db = getTestDb();
    const ts = now();

    await seedAccount(db, "acc-1", "Acme Corp");
    await seedAccount(db, "acc-2", "Beta Inc");

    await db.insert(schema.accountTypesConfig).values({
      id: "tc-1", name: "Airline", createdAt: ts,
    });
    await db.insert(schema.accountTypes).values({
      id: "at-1", accountId: "acc-1", typeId: "tc-1", createdAt: ts,
    });

    const result = await listAccounts(db);
    expect(result.data).toHaveLength(2);

    const acme = result.data.find((a) => a.id === "acc-1");
    expect(acme?.types).toHaveLength(1);
    expect(acme?.types[0]!.name).toBe("Airline");

    const beta = result.data.find((a) => a.id === "acc-2");
    expect(beta?.types).toHaveLength(0);
  });
});

describe("getAccountDetail", () => {
  it("throws notFound for missing account", async () => {
    const db = getTestDb();
    await expect(getAccountDetail(mockSupabase(), db, "nonexistent")).rejects.toThrowError("Account not found");
  });

  it("returns account with full detail", async () => {
    const db = getTestDb();
    const ts = now();

    await seedColleague(db);
    await seedAccount(db, "acc-1", "Acme Corp");
    await seedHuman(db, "h-1", "Jane", "Smith");

    // Types
    await db.insert(schema.accountTypesConfig).values({
      id: "tc-1", name: "Airline", createdAt: ts,
    });
    await db.insert(schema.accountTypes).values({
      id: "at-1", accountId: "acc-1", typeId: "tc-1", createdAt: ts,
    });

    // Linked human with label
    await db.insert(schema.accountHumanLabelsConfig).values({
      id: "lbl-1", name: "Primary Contact", createdAt: ts,
    });
    await db.insert(schema.accountHumans).values({
      id: "ah-1", accountId: "acc-1", humanId: "h-1", labelId: "lbl-1", createdAt: ts,
    });

    // Human emails and phones (for linked human detail)
    await db.insert(schema.emails).values({
      id: "he-1", displayId: nextDisplayId("EML"), humanId: "h-1", email: "jane@test.com", isPrimary: true, createdAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "hp-1", displayId: nextDisplayId("FON"), humanId: "h-1", phoneNumber: "+1234567890", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    // Account emails
    await db.insert(schema.accountEmailLabelsConfig).values({
      id: "elbl-1", name: "Work", createdAt: ts,
    });
    await db.insert(schema.emails).values({
      id: "ae-1", displayId: nextDisplayId("EML"), accountId: "acc-1", email: "info@acme.com", labelId: "elbl-1", isPrimary: true, createdAt: ts,
    });

    // Account phones
    await db.insert(schema.accountPhoneLabelsConfig).values({
      id: "plbl-1", name: "Office", createdAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "ap-1", displayId: nextDisplayId("FON"), accountId: "acc-1", phoneNumber: "+9876543210", labelId: "plbl-1", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    // Direct activity on account
    await db.insert(schema.activities).values({
      id: "act-1", displayId: nextDisplayId("ACT"), type: "email", subject: "Account Meeting", activityDate: ts,
      accountId: "acc-1", colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    // Activity on linked human
    await db.insert(schema.activities).values({
      id: "act-2", displayId: nextDisplayId("ACT"), type: "call", subject: "Follow-up", activityDate: ts,
      humanId: "h-1", colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    const result = await getAccountDetail(mockSupabase(), db, "acc-1");

    expect(result.name).toBe("Acme Corp");
    expect(result.types).toHaveLength(1);
    expect(result.types[0]!.name).toBe("Airline");

    expect(result.linkedHumans).toHaveLength(1);
    expect(result.linkedHumans[0]!.humanName).toBe("Jane Smith");
    expect(result.linkedHumans[0]!.labelName).toBe("Primary Contact");
    expect(result.linkedHumans[0]!.emails).toHaveLength(1);
    expect(result.linkedHumans[0]!.phoneNumbers).toHaveLength(1);

    expect(result.emails).toHaveLength(1);
    expect(result.emails[0]!.labelName).toBe("Work");

    expect(result.phoneNumbers).toHaveLength(1);
    expect(result.phoneNumbers[0]!.labelName).toBe("Office");

    expect(result.activities).toHaveLength(2);
    const directActivity = result.activities.find((a) => a.subject === "Account Meeting");
    const humanActivity = result.activities.find((a) => a.subject === "Follow-up");
    expect(directActivity).toBeDefined();
    expect(directActivity!.viaHumanName).toBeNull();
    expect(humanActivity).toBeDefined();
    expect(humanActivity!.viaHumanName).toBe("Jane Smith");
  });

  it("deduplicates activities that have both accountId and humanId of a linked human", async () => {
    const db = getTestDb();
    const ts = now();

    await seedColleague(db);
    await seedAccount(db, "acc-1", "Dedup Corp");
    await seedHuman(db, "h-1", "Jane", "Smith");

    // Link human to account
    await db.insert(schema.accountHumans).values({
      id: "ah-1", accountId: "acc-1", humanId: "h-1", createdAt: ts,
    });

    // Activity with BOTH accountId and humanId — this is the duplicate scenario
    await db.insert(schema.activities).values({
      id: "act-shared", displayId: nextDisplayId("ACT"), type: "email",
      subject: "Shared Activity", activityDate: ts,
      accountId: "acc-1", humanId: "h-1",
      colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    // Activity with only accountId (direct)
    await db.insert(schema.activities).values({
      id: "act-direct", displayId: nextDisplayId("ACT"), type: "call",
      subject: "Direct Only", activityDate: ts,
      accountId: "acc-1",
      colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    // Activity with only humanId (via human)
    await db.insert(schema.activities).values({
      id: "act-human", displayId: nextDisplayId("ACT"), type: "note",
      subject: "Human Only", activityDate: ts,
      humanId: "h-1",
      colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    const result = await getAccountDetail(mockSupabase(), db, "acc-1");

    // Should have exactly 3 unique activities, NOT 4 (shared should not appear twice)
    expect(result.activities).toHaveLength(3);

    const ids = result.activities.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Verify each activity appears exactly once
    expect(ids).toContain("act-shared");
    expect(ids).toContain("act-direct");
    expect(ids).toContain("act-human");

    // The shared activity should come from directActivities (viaHumanName = null)
    const shared = result.activities.find((a) => a.id === "act-shared");
    expect(shared!.viaHumanName).toBeNull();

    // The human-only activity should have viaHumanName set
    const humanOnly = result.activities.find((a) => a.id === "act-human");
    expect(humanOnly!.viaHumanName).toBe("Jane Smith");
  });

  it("returns no duplicate IDs in any entity array", async () => {
    const db = getTestDb();
    const ts = now();

    await seedColleague(db);
    await seedAccount(db, "acc-1", "Full Corp");
    await seedHuman(db, "h-1", "Jane", "Smith");

    // Link human to account
    await db.insert(schema.accountHumans).values({
      id: "ah-1", accountId: "acc-1", humanId: "h-1", createdAt: ts,
    });

    // Create activities with overlapping accountId + humanId
    await db.insert(schema.activities).values({
      id: "act-overlap", displayId: nextDisplayId("ACT"), type: "email",
      subject: "Overlap", activityDate: ts,
      accountId: "acc-1", humanId: "h-1",
      colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    const result = await getAccountDetail(mockSupabase(), db, "acc-1");

    // Check ALL entity arrays for duplicate IDs
    const entityArrays: { name: string; items: { id: string }[] }[] = [
      { name: "activities", items: result.activities },
      { name: "emails", items: result.emails },
      { name: "phoneNumbers", items: result.phoneNumbers },
      { name: "linkedHumans", items: result.linkedHumans },
      { name: "socialIds", items: result.socialIds },
      { name: "websites", items: result.websites },
    ];

    for (const { name, items } of entityArrays) {
      const ids = items.map((item) => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size, `Duplicate IDs found in ${name}: ${JSON.stringify(ids)}`).toBe(ids.length);
    }
  });

  it("returns account with no linked humans — skips humanIds enrichment entirely", async () => {
    const db = getTestDb();
    const ts = now();

    await seedColleague(db, "col-3");
    await seedAccount(db, "acc-3", "Empty Corp");

    // No accountHumans rows — humanIds will be empty, so the if-branch is skipped
    await db.insert(schema.activities).values({
      id: "act-e1", displayId: nextDisplayId("ACT"), type: "email", subject: "Direct Activity", activityDate: ts,
      accountId: "acc-3", colleagueId: "col-3", createdAt: ts, updatedAt: ts,
    });

    const result = await getAccountDetail(mockSupabase(), db, "acc-3");

    expect(result.linkedHumans).toHaveLength(0);
    expect(result.name).toBe("Empty Corp");
    expect(result.activities).toHaveLength(1);
  });

  it("returns account with types that resolve to config name", async () => {
    const db = getTestDb();
    const ts = now();

    await seedColleague(db, "col-4");
    await seedAccount(db, "acc-4", "Typed Corp");

    // Seed a config entry and link an account type to it
    await db.insert(schema.accountTypesConfig).values({
      id: "atc-1", name: "Partner", createdAt: ts,
    });
    await db.insert(schema.accountTypes).values({
      id: "at-1", accountId: "acc-4", typeId: "atc-1", createdAt: ts,
    });

    const result = await getAccountDetail(mockSupabase(), db, "acc-4");

    expect(result.types).toHaveLength(1);
    expect(result.types[0]!.name).toBe("Partner");
  });

  it("returns account with social IDs enriched with platform names", async () => {
    const db = getTestDb();
    const ts = now();

    await seedColleague(db, "col-2");
    await seedAccount(db, "acc-2", "Social Corp");

    await db.insert(schema.socialIdPlatformsConfig).values({
      id: "plat-1", name: "LinkedIn", createdAt: ts,
    });
    // Social ID with platform
    await db.insert(schema.socialIds).values({
      id: "soc-1", displayId: nextDisplayId("SOC"),
      handle: "@socialcorp", platformId: "plat-1", accountId: "acc-2",
      createdAt: ts,
    });
    // Social ID without platform
    await db.insert(schema.socialIds).values({
      id: "soc-2", displayId: nextDisplayId("SOC"),
      handle: "@noplatform", platformId: null, accountId: "acc-2",
      createdAt: ts,
    });

    const result = await getAccountDetail(mockSupabase(), db, "acc-2");
    expect(result.socialIds).toHaveLength(2);

    const withPlatform = result.socialIds.find((s: { id: string }) => s.id === "soc-1");
    expect(withPlatform!.platformName).toBe("LinkedIn");

    const withoutPlatform = result.socialIds.find((s: { id: string }) => s.id === "soc-2");
    expect(withoutPlatform!.platformName).toBeNull();
  });
});

describe("createAccount", () => {
  it("creates account with defaults", async () => {
    const db = getTestDb();
    const result = await createAccount(db, { name: "New Corp" });

    expect(result.id).toBeDefined();

    const rows = await db.select().from(schema.accounts);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("New Corp");
    expect(rows[0]!.status).toBe("open");
  });

  it("creates account with typeIds", async () => {
    const db = getTestDb();
    const ts = now();

    await db.insert(schema.accountTypesConfig).values({
      id: "tc-1", name: "Airline", createdAt: ts,
    });
    await db.insert(schema.accountTypesConfig).values({
      id: "tc-2", name: "Broker", createdAt: ts,
    });

    const result = await createAccount(db, {
      name: "Typed Corp",
      typeIds: ["tc-1", "tc-2"],
    });

    expect(result.id).toBeDefined();

    const types = await db.select().from(schema.accountTypes);
    expect(types).toHaveLength(2);
    expect(types.map((t) => t.typeId).sort()).toEqual(["tc-1", "tc-2"]);
  });
});

describe("updateAccount", () => {
  it("throws notFound for missing account", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await expect(
      updateAccount(db, "nonexistent", { name: "X" }, "col-1"),
    ).rejects.toThrowError("Account not found");
  });

  it("updates name and creates audit entry", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedAccount(db, "acc-1", "Old Name");

    const result = await updateAccount(db, "acc-1", { name: "New Name" }, "col-1");
    expect(result.data?.name).toBe("New Name");
    expect(result.auditEntryId).toBeDefined();

    const auditEntries = await db.select().from(schema.auditLog);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]!.action).toBe("UPDATE");
    expect(auditEntries[0]!.entityType).toBe("account");
    expect(auditEntries[0]!.entityId).toBe("acc-1");
  });

  it("replaces types and creates audit entry", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedAccount(db, "acc-1");

    await db.insert(schema.accountTypesConfig).values({
      id: "tc-1", name: "Airline", createdAt: ts,
    });
    await db.insert(schema.accountTypesConfig).values({
      id: "tc-2", name: "Broker", createdAt: ts,
    });
    await db.insert(schema.accountTypes).values({
      id: "at-1", accountId: "acc-1", typeId: "tc-1", createdAt: ts,
    });

    const result = await updateAccount(db, "acc-1", { typeIds: ["tc-2"] }, "col-1");
    expect(result.auditEntryId).toBeDefined();

    const types = await db.select().from(schema.accountTypes);
    expect(types).toHaveLength(1);
    expect(types[0]!.typeId).toBe("tc-2");
  });

  it("skips audit when no changes detected", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedAccount(db, "acc-1", "Same Name");

    const result = await updateAccount(db, "acc-1", { name: "Same Name" }, "col-1");
    expect(result.auditEntryId).toBeUndefined();

    const auditEntries = await db.select().from(schema.auditLog);
    expect(auditEntries).toHaveLength(0);
  });
});

describe("updateAccountStatus", () => {
  it("throws notFound for missing account", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await expect(
      updateAccountStatus(db, "nonexistent", "closed", "col-1"),
    ).rejects.toThrowError("Account not found");
  });

  it("updates status and creates audit entry", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedAccount(db, "acc-1");

    const result = await updateAccountStatus(db, "acc-1", "closed", "col-1");
    expect(result.status).toBe("closed");
    expect(result.auditEntryId).toBeDefined();

    const auditEntries = await db.select().from(schema.auditLog);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]!.action).toBe("UPDATE");
    expect(auditEntries[0]!.entityType).toBe("account");
  });

  it("skips audit when status unchanged", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedAccount(db, "acc-1");

    const result = await updateAccountStatus(db, "acc-1", "open", "col-1");
    expect(result.auditEntryId).toBeUndefined();

    const auditEntries = await db.select().from(schema.auditLog);
    expect(auditEntries).toHaveLength(0);
  });
});

describe("deleteAccount", () => {
  it("throws notFound for missing account", async () => {
    const db = getTestDb();
    await expect(deleteAccount(mockSupabase(), db, "nonexistent")).rejects.toThrowError("Account not found");
  });

  it("deletes account and all related records", async () => {
    const db = getTestDb();
    const ts = now();

    await seedAccount(db, "acc-1");
    await seedHuman(db, "h-1");

    await db.insert(schema.accountTypesConfig).values({
      id: "tc-1", name: "Airline", createdAt: ts,
    });
    await db.insert(schema.accountTypes).values({
      id: "at-1", accountId: "acc-1", typeId: "tc-1", createdAt: ts,
    });
    await db.insert(schema.accountHumans).values({
      id: "ah-1", accountId: "acc-1", humanId: "h-1", createdAt: ts,
    });
    await db.insert(schema.emails).values({
      id: "ae-1", displayId: nextDisplayId("EML"), accountId: "acc-1", email: "info@acme.com", isPrimary: true, createdAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "ap-1", displayId: nextDisplayId("FON"), accountId: "acc-1", phoneNumber: "+1234567890", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    await deleteAccount(mockSupabase(), db, "acc-1");

    expect(await db.select().from(schema.accounts)).toHaveLength(0);
    expect(await db.select().from(schema.accountTypes)).toHaveLength(0);
    expect(await db.select().from(schema.accountHumans)).toHaveLength(0);
    expect((await db.select().from(schema.emails))[0]!.accountId).toBeNull();
    expect((await db.select().from(schema.phones))[0]!.accountId).toBeNull();
  });
});

describe("addAccountEmail", () => {
  it("adds email to account", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1");

    const result = await addAccountEmail(db, "acc-1", {
      email: "hello@acme.com",
      isPrimary: true,
    });

    expect(result.id).toBeDefined();
    expect(result.email).toBe("hello@acme.com");
    expect(result.accountId).toBe("acc-1");
    expect(result.isPrimary).toBe(true);

    const rows = await db.select().from(schema.emails);
    expect(rows).toHaveLength(1);
  });

  it("defaults labelId to null and isPrimary to false", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1");

    const result = await addAccountEmail(db, "acc-1", { email: "no-label@acme.com" });
    expect(result.labelId).toBeNull();
    expect(result.isPrimary).toBe(false);
  });
});

describe("deleteAccountEmail", () => {
  it("deletes email by id", async () => {
    const db = getTestDb();
    const ts = now();
    await seedAccount(db, "acc-1");

    await db.insert(schema.emails).values({
      id: "ae-1", displayId: nextDisplayId("EML"), accountId: "acc-1", email: "del@acme.com", isPrimary: false, createdAt: ts,
    });

    await deleteAccountEmail(db, "ae-1");
    expect(await db.select().from(schema.emails)).toHaveLength(0);
  });
});

describe("addAccountPhone", () => {
  it("adds phone to account", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1");

    const result = await addAccountPhone(db, "acc-1", {
      phoneNumber: "+1234567890",
      hasWhatsapp: true,
      isPrimary: true,
    });

    expect(result.id).toBeDefined();
    expect(result.phoneNumber).toBe("+1234567890");
    expect(result.accountId).toBe("acc-1");
    expect(result.hasWhatsapp).toBe(true);
    expect(result.isPrimary).toBe(true);

    const rows = await db.select().from(schema.phones);
    expect(rows).toHaveLength(1);
  });

  it("defaults labelId to null and booleans to false", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1");

    const result = await addAccountPhone(db, "acc-1", { phoneNumber: "+0000000000" });
    expect(result.labelId).toBeNull();
    expect(result.hasWhatsapp).toBe(false);
    expect(result.isPrimary).toBe(false);
  });
});

describe("deleteAccountPhone", () => {
  it("deletes phone by id", async () => {
    const db = getTestDb();
    const ts = now();
    await seedAccount(db, "acc-1");

    await db.insert(schema.phones).values({
      id: "ap-1", displayId: nextDisplayId("FON"), accountId: "acc-1", phoneNumber: "+1234567890", hasWhatsapp: false, isPrimary: false, createdAt: ts,
    });

    await deleteAccountPhone(db, "ap-1");
    expect(await db.select().from(schema.phones)).toHaveLength(0);
  });
});

describe("linkAccountHuman", () => {
  it("creates link between account and human", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1");
    await seedHuman(db, "h-1");

    const result = await linkAccountHuman(db, "acc-1", { humanId: "h-1" });

    expect(result.id).toBeDefined();
    expect(result.accountId).toBe("acc-1");
    expect(result.humanId).toBe("h-1");
    expect(result.labelId).toBeNull();
    expect(result.createdAt).toBeDefined();

    const rows = await db.select().from(schema.accountHumans);
    expect(rows).toHaveLength(1);
  });

  it("creates link with labelId", async () => {
    const db = getTestDb();
    const ts = now();
    await seedAccount(db, "acc-1");
    await seedHuman(db, "h-1");

    await db.insert(schema.accountHumanLabelsConfig).values({
      id: "lbl-1", name: "Decision Maker", createdAt: ts,
    });

    const result = await linkAccountHuman(db, "acc-1", { humanId: "h-1", labelId: "lbl-1" });
    expect(result.labelId).toBe("lbl-1");
  });
});

describe("updateAccountHumanLabel", () => {
  it("updates label on existing link", async () => {
    const db = getTestDb();
    const ts = now();
    await seedAccount(db, "acc-1");
    await seedHuman(db, "h-1");

    await db.insert(schema.accountHumanLabelsConfig).values({
      id: "lbl-1", name: "Primary Contact", createdAt: ts,
    });
    await db.insert(schema.accountHumans).values({
      id: "ah-1", accountId: "acc-1", humanId: "h-1", createdAt: ts,
    });

    await updateAccountHumanLabel(db, "ah-1", "lbl-1");

    const rows = await db.select().from(schema.accountHumans).where(eq(schema.accountHumans.id, "ah-1"));
    expect(rows[0]!.labelId).toBe("lbl-1");
  });

  it("clears label when set to null", async () => {
    const db = getTestDb();
    const ts = now();
    await seedAccount(db, "acc-1");
    await seedHuman(db, "h-1");

    await db.insert(schema.accountHumanLabelsConfig).values({
      id: "lbl-1", name: "Primary Contact", createdAt: ts,
    });
    await db.insert(schema.accountHumans).values({
      id: "ah-1", accountId: "acc-1", humanId: "h-1", labelId: "lbl-1", createdAt: ts,
    });

    await updateAccountHumanLabel(db, "ah-1", null);

    const rows = await db.select().from(schema.accountHumans).where(eq(schema.accountHumans.id, "ah-1"));
    expect(rows[0]!.labelId).toBeNull();
  });
});

describe("unlinkAccountHuman", () => {
  it("deletes link by id", async () => {
    const db = getTestDb();
    const ts = now();
    await seedAccount(db, "acc-1");
    await seedHuman(db, "h-1");

    await db.insert(schema.accountHumans).values({
      id: "ah-1", accountId: "acc-1", humanId: "h-1", createdAt: ts,
    });

    await unlinkAccountHuman(db, "ah-1");
    expect(await db.select().from(schema.accountHumans)).toHaveLength(0);
  });
});

describe("getAccountDetail — email and phone label resolution", () => {
  it("returns null labelName for account email with no labelId", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db, "col-x1");
    await seedAccount(db, "acc-x1", "NoLabel Corp");

    // Email with no labelId (null path of the e.labelId != null branch)
    await db.insert(schema.emails).values({
      id: "ae-x1", displayId: nextDisplayId("EML"), accountId: "acc-x1", email: "nolabel@corp.com",
      labelId: null, isPrimary: true, createdAt: ts,
    });

    const result = await getAccountDetail(mockSupabase(), db, "acc-x1");
    expect(result.emails).toHaveLength(1);
    expect(result.emails[0]!.labelName).toBeNull();
  });

  it("returns null labelName for account phone with no labelId", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db, "col-x2");
    await seedAccount(db, "acc-x2", "NoLabelPhone Corp");

    // Phone with no labelId (null path of the p.labelId != null branch)
    await db.insert(schema.phones).values({
      id: "ap-x1", displayId: nextDisplayId("FON"), accountId: "acc-x2",
      phoneNumber: "+1000000000", labelId: null, hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    const result = await getAccountDetail(mockSupabase(), db, "acc-x2");
    expect(result.phoneNumbers).toHaveLength(1);
    expect(result.phoneNumbers[0]!.labelName).toBeNull();
  });
});

describe("updateAccountStatus — diff branch coverage", () => {
  it("does not write audit entry when status is same (diff is null)", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-status-1");
    await seedAccount(db, "acc-status-1", "Status Corp");

    // Same status → oldStatus === status so the diff block is skipped entirely
    const result = await updateAccountStatus(db, "acc-status-1", "open", "col-status-1");
    expect(result.auditEntryId).toBeUndefined();

    const auditEntries = await db.select().from(schema.auditLog);
    expect(auditEntries).toHaveLength(0);
  });

  it("writes audit entry when status changes and diff is non-null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-status-2");
    await seedAccount(db, "acc-status-2", "Status Corp 2");

    // Different status → diff != null branch at line 336 is taken
    const result = await updateAccountStatus(db, "acc-status-2", "closed", "col-status-2");
    expect(result.auditEntryId).toBeDefined();
    expect(result.status).toBe("closed");

    const auditEntries = await db.select().from(schema.auditLog);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]!.action).toBe("UPDATE");
  });
});

// ─── toAccountStatus invalid → "open" fallback ───────────────────────────────

describe("createAccount — toAccountStatus invalid input falls back to 'open'", () => {
  it("stores 'open' when an invalid status string is passed", async () => {
    const db = getTestDb();

    // Pass an unrecognised status — toAccountStatus must map it to "open"
    await createAccount(db, { name: "InvalidStatus Corp", status: "definitely_not_a_real_status" });

    const rows = await db.select().from(schema.accounts);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("open");
  });
});

// ─── listAccounts — type config not found → falls back to typeId ──────────────

describe("listAccounts — type config not found fallback", () => {
  it("falls back to raw typeId when config entry is missing (orphaned account_types row)", async () => {
    const db = getTestDb();
    const ts = now();

    await seedAccount(db, "acc-fb-1", "Fallback Corp");

    // Insert an account_types row whose typeId has no matching accountTypesConfig entry.
    // Use session_replication_role to bypass the FK constraint.
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.insert(schema.accountTypes).values({
      id: "at-orphan", accountId: "acc-fb-1", typeId: "orphan-type-id", createdAt: ts,
    });
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await listAccounts(db);
    expect(result.data).toHaveLength(1);

    const acct = result.data.find((a) => a.id === "acc-fb-1");
    expect(acct?.types).toHaveLength(1);
    // config not found → name falls back to the raw typeId string
    expect(acct?.types[0]!.name).toBe("orphan-type-id");
    expect(acct?.types[0]!.id).toBe("orphan-type-id");
  });
});

// ─── getAccountDetail — supabase null data (L111 / L125 ?? [] branches) ──────

describe("getAccountDetail — supabase returns null data (referral and discount code branches)", () => {
  it("handles null supabase referral code response without throwing", async () => {
    const db = getTestDb();

    await seedColleague(db, "col-null-1");
    await seedAccount(db, "acc-null-1", "Null Supabase Corp");

    // Return null data for both referral and discount code calls
    const nullSupabase = (() => {
      const chain: Record<string, unknown> = {};
      chain["from"] = () => chain;
      chain["select"] = () => chain;
      chain["eq"] = () => Promise.resolve({ data: null, error: null });
      chain["update"] = () => chain;
      chain["delete"] = () => chain;
      chain["single"] = () => Promise.resolve({ data: null, error: null });
      return chain;
    })() as Parameters<typeof getAccountDetail>[0];

    const result = await getAccountDetail(nullSupabase, db, "acc-null-1");

    // ?? [] branch is taken: should return empty arrays rather than throwing
    expect(result.referralCodes).toHaveLength(0);
    expect(result.discountCodes).toHaveLength(0);
  });
});

// ─── getAccountDetail — type config not found → falls back to typeId ─────────

describe("getAccountDetail — type config orphaned → falls back to typeId (L152)", () => {
  it("falls back to raw typeId when accountTypesConfig entry is missing in getAccountDetail", async () => {
    const db = getTestDb();
    const ts = now();

    await seedColleague(db, "col-tc-1");
    await seedAccount(db, "acc-tc-1", "TypeFallback Corp");

    // Orphaned type — no matching config entry
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.insert(schema.accountTypes).values({
      id: "at-tc-orphan", accountId: "acc-tc-1", typeId: "ghost-type-config-id", createdAt: ts,
    });
    await db.execute(sql`SET session_replication_role = 'origin'`);

    function mockSupabaseEmpty() {
      const chain: Record<string, unknown> = {};
      chain["from"] = () => chain;
      chain["select"] = () => chain;
      chain["eq"] = () => Promise.resolve({ data: [], error: null });
      chain["update"] = () => chain;
      chain["delete"] = () => chain;
      chain["single"] = () => Promise.resolve({ data: null, error: null });
      return chain as Parameters<typeof getAccountDetail>[0];
    }

    const result = await getAccountDetail(mockSupabaseEmpty(), db, "acc-tc-1");

    expect(result.types).toHaveLength(1);
    // config?.name is undefined → falls back to t.typeId
    expect(result.types[0]!.name).toBe("ghost-type-config-id");
    expect(result.types[0]!.id).toBe("ghost-type-config-id");
  });
});

// ─── getAccountDetail — linked human orphaned (L160-162) ─────────────────────

describe("getAccountDetail — orphaned linked human (humanId has no matching humans row)", () => {
  it("returns humanDisplayId=null, humanName='Unknown', humanStatus=null for orphaned link", async () => {
    const db = getTestDb();
    const ts = now();

    await seedColleague(db, "col-orph-1");
    await seedAccount(db, "acc-orph-1", "Orphan Human Corp");
    // Seed the human so the FK is satisfied during insert
    await seedHuman(db, "h-orph-1", "Ghost", "Person");

    await db.insert(schema.accountHumans).values({
      id: "ah-orph-1", accountId: "acc-orph-1", humanId: "h-orph-1", createdAt: ts,
    });

    // Remove the human row to orphan the link, bypassing FK
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(sql`DELETE FROM humans WHERE id = 'h-orph-1'`);
    await db.execute(sql`SET session_replication_role = 'origin'`);

    function mockSupabaseEmpty() {
      const chain: Record<string, unknown> = {};
      chain["from"] = () => chain;
      chain["select"] = () => chain;
      chain["eq"] = () => Promise.resolve({ data: [], error: null });
      chain["update"] = () => chain;
      chain["delete"] = () => chain;
      chain["single"] = () => Promise.resolve({ data: null, error: null });
      return chain as Parameters<typeof getAccountDetail>[0];
    }

    const result = await getAccountDetail(mockSupabaseEmpty(), db, "acc-orph-1");

    expect(result.linkedHumans).toHaveLength(1);
    // human is undefined in allHumans → fallback values
    expect(result.linkedHumans[0]!.humanDisplayId).toBeNull();
    expect(result.linkedHumans[0]!.humanName).toBe("Unknown");
    expect(result.linkedHumans[0]!.humanStatus).toBeNull();
  });
});

// ─── getAccountDetail — human activity with orphaned humanId (L186) ──────────

describe("getAccountDetail — human activity with orphaned humanId falls back to 'Unknown'", () => {
  it("returns viaHumanName='Unknown' for human activity whose humanId is not in allHumans", async () => {
    const db = getTestDb();
    const ts = now();

    await seedColleague(db, "col-hvn-1");
    await seedAccount(db, "acc-hvn-1", "ViaHuman Corp");
    await seedHuman(db, "h-hvn-1", "Real", "Person");

    // Link human to account
    await db.insert(schema.accountHumans).values({
      id: "ah-hvn-1", accountId: "acc-hvn-1", humanId: "h-hvn-1", createdAt: ts,
    });

    // Activity linked to humanId but we'll orphan the human
    await db.insert(schema.activities).values({
      id: "act-hvn-1", displayId: nextDisplayId("ACT"), type: "call",
      subject: "Orphan call", activityDate: ts,
      humanId: "h-hvn-1", colleagueId: "col-hvn-1", createdAt: ts, updatedAt: ts,
    });

    // Remove the human row via FK bypass so allHumans is empty
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(sql`DELETE FROM humans WHERE id = 'h-hvn-1'`);
    await db.execute(sql`SET session_replication_role = 'origin'`);

    function mockSupabaseEmpty() {
      const chain: Record<string, unknown> = {};
      chain["from"] = () => chain;
      chain["select"] = () => chain;
      chain["eq"] = () => Promise.resolve({ data: [], error: null });
      chain["update"] = () => chain;
      chain["delete"] = () => chain;
      chain["single"] = () => Promise.resolve({ data: null, error: null });
      return chain as Parameters<typeof getAccountDetail>[0];
    }

    const result = await getAccountDetail(mockSupabaseEmpty(), db, "acc-hvn-1");

    // humanActivitiesWithNames: human not found → viaHumanName = "Unknown"
    const humanAct = result.activities.find((a) => a.id === "act-hvn-1");
    expect(humanAct).toBeDefined();
    expect(humanAct!.viaHumanName).toBe("Unknown");
  });
});
