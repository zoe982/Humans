import { describe, it, expect } from "vitest";
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
    await expect(getAccountDetail(db, "nonexistent")).rejects.toThrowError("Account not found");
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
      id: "he-1", displayId: nextDisplayId("EML"), ownerType: "human", ownerId: "h-1", email: "jane@test.com", isPrimary: true, createdAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "hp-1", displayId: nextDisplayId("FON"), ownerType: "human", ownerId: "h-1", phoneNumber: "+1234567890", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    // Account emails
    await db.insert(schema.emailLabelsConfig).values({
      id: "elbl-1", name: "Work", createdAt: ts,
    });
    await db.insert(schema.emails).values({
      id: "ae-1", displayId: nextDisplayId("EML"), ownerType: "account", ownerId: "acc-1", email: "info@acme.com", labelId: "elbl-1", isPrimary: true, createdAt: ts,
    });

    // Account phones
    await db.insert(schema.phoneLabelsConfig).values({
      id: "plbl-1", name: "Office", createdAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "ap-1", displayId: nextDisplayId("FON"), ownerType: "account", ownerId: "acc-1", phoneNumber: "+9876543210", labelId: "plbl-1", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    // Direct activity on account
    await db.insert(schema.activities).values({
      id: "act-1", displayId: nextDisplayId("ACT"), type: "email", subject: "Account Meeting", activityDate: ts,
      accountId: "acc-1", createdByColleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    // Activity on linked human
    await db.insert(schema.activities).values({
      id: "act-2", displayId: nextDisplayId("ACT"), type: "call", subject: "Follow-up", activityDate: ts,
      humanId: "h-1", createdByColleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    const result = await getAccountDetail(db, "acc-1");

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

    expect(result.activities).toHaveLength(1);
    expect(result.activities[0]!.subject).toBe("Account Meeting");

    expect(result.humanActivities).toHaveLength(1);
    expect(result.humanActivities[0]!.viaHumanName).toBe("Jane Smith");
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
    await expect(deleteAccount(db, "nonexistent")).rejects.toThrowError("Account not found");
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
      id: "ae-1", displayId: nextDisplayId("EML"), ownerType: "account", ownerId: "acc-1", email: "info@acme.com", isPrimary: true, createdAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "ap-1", displayId: nextDisplayId("FON"), ownerType: "account", ownerId: "acc-1", phoneNumber: "+1234567890", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    await deleteAccount(db, "acc-1");

    expect(await db.select().from(schema.accounts)).toHaveLength(0);
    expect(await db.select().from(schema.accountTypes)).toHaveLength(0);
    expect(await db.select().from(schema.accountHumans)).toHaveLength(0);
    expect(await db.select().from(schema.emails)).toHaveLength(0);
    expect(await db.select().from(schema.phones)).toHaveLength(0);
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
    expect(result.ownerId).toBe("acc-1");
    expect(result.ownerType).toBe("account");
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
      id: "ae-1", displayId: nextDisplayId("EML"), ownerType: "account", ownerId: "acc-1", email: "del@acme.com", isPrimary: false, createdAt: ts,
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
    expect(result.ownerId).toBe("acc-1");
    expect(result.ownerType).toBe("account");
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
      id: "ap-1", displayId: nextDisplayId("FON"), ownerType: "account", ownerId: "acc-1", phoneNumber: "+1234567890", hasWhatsapp: false, isPrimary: false, createdAt: ts,
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
