import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { getTestDb } from "../setup";
import {
  listPhoneNumbers,
  listPhoneNumbersForHuman,
  getPhoneNumber,
  createPhoneNumber,
  updatePhoneNumber,
  deletePhoneNumber,
  listPhoneNumbersForEntity,
} from "../../../src/services/phone-numbers";
import { AppError } from "../../../src/lib/errors";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;

async function seedHuman(db: ReturnType<typeof getTestDb>, id = "h-1", first = "John", last = "Doe") {
  seedCounter++;
  const ts = now();
  await db.insert(schema.humans).values({
    id,
    displayId: `HUM-${String(seedCounter).padStart(6, "0")}`,
    firstName: first,
    lastName: last,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedAccount(db: ReturnType<typeof getTestDb>, id = "acc-1", name = "Test Corp") {
  seedCounter++;
  const ts = now();
  await db.insert(schema.accounts).values({
    id,
    displayId: `ACC-${String(seedCounter).padStart(6, "0")}`,
    name,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedGeneralLead(db: ReturnType<typeof getTestDb>, id: string, first: string, last: string) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.generalLeads).values({
    id,
    displayId: `LEA-${String(seedCounter).padStart(6, "0")}`,
    firstName: first,
    lastName: last,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedPhone(
  db: ReturnType<typeof getTestDb>,
  id: string,
  phoneNumber: string,
  opts: { humanId?: string; accountId?: string; generalLeadId?: string; labelId?: string | null } = {},
) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.phones).values({
    id,
    displayId: `FON-${String(seedCounter).padStart(6, "0")}`,
    humanId: opts.humanId ?? null,
    accountId: opts.accountId ?? null,
    generalLeadId: opts.generalLeadId ?? null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    phoneNumber,
    labelId: opts.labelId ?? null,
    hasWhatsapp: false,
    isPrimary: true,
    createdAt: ts,
  });
  return id;
}

async function seedHumanPhoneLabel(db: ReturnType<typeof getTestDb>, id: string, name: string) {
  await db.insert(schema.humanPhoneLabelsConfig).values({ id, name, createdAt: now() });
}

async function seedAccountPhoneLabel(db: ReturnType<typeof getTestDb>, id: string, name: string) {
  await db.insert(schema.accountPhoneLabelsConfig).values({ id, name, createdAt: now() });
}

describe("listPhoneNumbers", () => {
  it("returns empty list when no phone numbers", async () => {
    const db = getTestDb();
    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(0);
  });

  it("returns phone numbers with human names", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedPhone(db, "ph-1", "+1111111111", { humanId: "h-1" });

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.phoneNumber).toBe("+1111111111");
    expect(result[0]!.ownerName).toBe("Alice Smith");
  });

  it("filters phone numbers by query string", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedPhone(db, "ph-1", "+1111111111", { humanId: "h-1" });
    await seedPhone(db, "ph-2", "+2222222222", { humanId: "h-1" });

    const result = await listPhoneNumbers(db, "+111");
    expect(result).toHaveLength(1);
    expect(result[0]!.phoneNumber).toBe("+1111111111");
  });

  it("returns all phones when query is undefined", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedPhone(db, "ph-1", "+1111111111", { humanId: "h-1" });
    await seedPhone(db, "ph-2", "+2222222222", { humanId: "h-1" });

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(2);
  });

  it("returns multiple phone numbers across different humans", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedPhone(db, "ph-1", "+1111111111", { humanId: "h-1" });
    await seedPhone(db, "ph-2", "+2222222222", { humanId: "h-2" });

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(2);

    const alice = result.find((p) => p.humanId === "h-1");
    const bob = result.find((p) => p.humanId === "h-2");
    expect(alice!.ownerName).toBe("Alice Smith");
    expect(bob!.ownerName).toBe("Bob Jones");
  });

  it("returns phone numbers owned by an account with account name", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Acme Corp");
    await seedPhone(db, "ph-1", "+3333333333", { accountId: "acc-1" });

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.ownerName).toBe("Acme Corp");
    expect(result[0]!.ownerDisplayId).toMatch(/^ACC-/);
  });

  it("resolves labelName for human-owned phone", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHumanPhoneLabel(db, "lbl-1", "Mobile");
    await seedPhone(db, "ph-1", "+1111111111", { humanId: "h-1", labelId: "lbl-1" });

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.labelName).toBe("Mobile");
  });

  it("resolves labelName for account-owned phone", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Acme Corp");
    await seedAccountPhoneLabel(db, "lbl-2", "Office");
    await seedPhone(db, "ph-1", "+2222222222", { accountId: "acc-1", labelId: "lbl-2" });

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.labelName).toBe("Office");
  });
});

describe("getPhoneNumber", () => {
  it("throws notFound for missing phone number", async () => {
    const db = getTestDb();
    await expect(getPhoneNumber(db, "nonexistent")).rejects.toThrowError("Phone number not found");
  });

  it("returns phone enriched with human data", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Dan", "Brown");
    await seedPhone(db, "ph-1", "+4444444444", { humanId: "h-1" });

    const result = await getPhoneNumber(db, "ph-1");
    expect(result.id).toBe("ph-1");
    expect(result.phoneNumber).toBe("+4444444444");
    expect(result.ownerName).toBe("Dan Brown");
    expect(result.ownerDisplayId).toMatch(/^HUM-/);
    expect(result.labelName).toBeNull();
  });

  it("returns phone enriched with account data", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Global Corp");
    await seedPhone(db, "ph-1", "+5555555555", { accountId: "acc-1" });

    const result = await getPhoneNumber(db, "ph-1");
    expect(result.ownerName).toBe("Global Corp");
    expect(result.ownerDisplayId).toMatch(/^ACC-/);
  });

  it("resolves labelName for human-owned phone", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Dan", "Brown");
    await seedHumanPhoneLabel(db, "lbl-1", "Home");
    await seedPhone(db, "ph-1", "+4444444444", { humanId: "h-1", labelId: "lbl-1" });

    const result = await getPhoneNumber(db, "ph-1");
    expect(result.labelName).toBe("Home");
  });

  it("returns null labelName for orphaned labelId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Dan", "Brown");
    await seedPhone(db, "ph-1", "+4444444444", { humanId: "h-1", labelId: "nonexistent-label" });

    const result = await getPhoneNumber(db, "ph-1");
    expect(result.labelName).toBeNull();
  });

  it("returns per-entity resolved fields for human-owned phone", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Dan", "Brown");
    await seedPhone(db, "ph-1", "+4444444444", { humanId: "h-1" });

    const result = await getPhoneNumber(db, "ph-1");
    expect(result.humanDisplayId).toMatch(/^HUM-/);
    expect(result.humanName).toBe("Dan Brown");
    expect(result.accountDisplayId).toBeNull();
    expect(result.accountName).toBeNull();
    expect(result.generalLeadDisplayId).toBeNull();
    expect(result.generalLeadName).toBeNull();
    expect(result.websiteBookingRequestDisplayId).toBeNull();
    expect(result.websiteBookingRequestName).toBeNull();
    expect(result.routeSignupDisplayId).toBeNull();
    expect(result.routeSignupName).toBeNull();
  });

  it("returns per-entity resolved fields for account-owned phone", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Global Corp");
    await seedPhone(db, "ph-1", "+5555555555", { accountId: "acc-1" });

    const result = await getPhoneNumber(db, "ph-1");
    expect(result.humanDisplayId).toBeNull();
    expect(result.humanName).toBeNull();
    expect(result.accountDisplayId).toMatch(/^ACC-/);
    expect(result.accountName).toBe("Global Corp");
  });

  it("returns per-entity resolved fields for general-lead-owned phone", async () => {
    const db = getTestDb();
    await seedGeneralLead(db, "gl-1", "Sam", "Wilson");
    await seedPhone(db, "ph-1", "+6666666666", { generalLeadId: "gl-1" });

    const result = await getPhoneNumber(db, "ph-1");
    expect(result.generalLeadDisplayId).toMatch(/^LEA-/);
    expect(result.generalLeadName).toBe("Sam Wilson");
    expect(result.humanDisplayId).toBeNull();
    expect(result.accountDisplayId).toBeNull();
  });
});

describe("listPhoneNumbersForHuman", () => {
  it("returns only phones for the given human", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedPhone(db, "ph-1", "+1111111111", { humanId: "h-1" });
    await seedPhone(db, "ph-2", "+2222222222", { humanId: "h-2" });

    const result = await listPhoneNumbersForHuman(db, "h-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.phoneNumber).toBe("+1111111111");
  });

  it("returns empty list when human has no phones", async () => {
    const db = getTestDb();
    const result = await listPhoneNumbersForHuman(db, "h-nonexistent");
    expect(result).toHaveLength(0);
  });
});

describe("createPhoneNumber", () => {
  it("creates a phone number with defaults", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPhoneNumber(db, {
      humanId: "h-1",
      phoneNumber: "+9876543210",
    });

    expect(result.id).toBeDefined();
    expect(result.humanId).toBe("h-1");
    expect(result.phoneNumber).toBe("+9876543210");
    expect(result.hasWhatsapp).toBe(false);
    expect(result.isPrimary).toBe(false);
    expect(result.labelId).toBeNull();

    const rows = await db.select().from(schema.phones);
    expect(rows).toHaveLength(1);
  });

  it("creates a phone number with custom flags", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPhoneNumber(db, {
      humanId: "h-1",
      phoneNumber: "+5555555555",
      hasWhatsapp: true,
      isPrimary: true,
    });

    expect(result.hasWhatsapp).toBe(true);
    expect(result.isPrimary).toBe(true);
  });
});

describe("createPhoneNumber — duplicate detection", () => {
  it("throws 409 when creating phone with same normalized number", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");
    await seedHuman(db, "h-2", "Jane", "Smith");
    await seedPhone(db, "ph-1", "+15551234567", { humanId: "h-1" });

    await expect(
      createPhoneNumber(db, { humanId: "h-2", phoneNumber: "+15551234567" }),
    ).rejects.toThrowError("A phone number with this number already exists");
  });

  it("normalizes phone before duplicate check (strips formatting)", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");
    await seedHuman(db, "h-2", "Jane", "Smith");
    await seedPhone(db, "ph-1", "+15551234567", { humanId: "h-1" });

    await expect(
      createPhoneNumber(db, { humanId: "h-2", phoneNumber: "+1 (555) 123-4567" }),
    ).rejects.toThrowError("A phone number with this number already exists");
  });

  it("stores normalized phone value", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");

    const result = await createPhoneNumber(db, { humanId: "h-1", phoneNumber: "+1 (555) 999-8888" });

    expect(result.phoneNumber).toBe("+15559998888");
  });

  it("includes existingId and existingOwners in 409 details", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");
    await seedPhone(db, "ph-1", "+15551234567", { humanId: "h-1" });

    try {
      await createPhoneNumber(db, { phoneNumber: "+15551234567" });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.status).toBe(409);
      expect(appErr.code).toBe("PHONE_DUPLICATE");
      const details = appErr.details as { existingId: string; existingDisplayId: string; existingOwners: unknown[] };
      expect(details.existingId).toBe("ph-1");
      expect(details.existingDisplayId).toMatch(/^FON-/);
      expect(details.existingOwners).toEqual([
        expect.objectContaining({ type: "human", id: "h-1", name: "John Doe" }),
      ]);
    }
  });
});

describe("updatePhoneNumber — duplicate detection", () => {
  it("throws 409 when updating to a duplicate phone number", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");
    await seedPhone(db, "ph-1", "+15551234567", { humanId: "h-1" });
    await seedPhone(db, "ph-2", "+15559999999", { humanId: "h-1" });

    await expect(
      updatePhoneNumber(db, "ph-2", { phoneNumber: "+15551234567" }),
    ).rejects.toThrowError("A phone number with this number already exists");
  });

  it("allows updating to the same value (self-update)", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");
    await seedPhone(db, "ph-1", "+15551234567", { humanId: "h-1" });

    const result = await updatePhoneNumber(db, "ph-1", { phoneNumber: "+15551234567" });
    expect(result!.phoneNumber).toBe("+15551234567");
  });
});

describe("updatePhoneNumber", () => {
  it("throws not found for missing phone number", async () => {
    const db = getTestDb();
    await expect(
      updatePhoneNumber(db, "nonexistent", { phoneNumber: "+000" }),
    ).rejects.toThrowError("Phone number not found");
  });

  it("updates phone number fields", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedPhone(db, "ph-1", "+1111111111", { humanId: "h-1" });

    const result = await updatePhoneNumber(db, "ph-1", {
      phoneNumber: "+9999999999",
      hasWhatsapp: true,
    });

    expect(result!.phoneNumber).toBe("+9999999999");
    expect(result!.hasWhatsapp).toBe(true);
  });
});

describe("deletePhoneNumber", () => {
  it("throws not found for missing phone number", async () => {
    const db = getTestDb();
    await expect(
      deletePhoneNumber(db, "nonexistent"),
    ).rejects.toThrowError("Phone number not found");
  });

  it("deletes an existing phone number", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedPhone(db, "ph-1", "+1234567890", { humanId: "h-1" });

    await deletePhoneNumber(db, "ph-1");

    const rows = await db.select().from(schema.phones);
    expect(rows).toHaveLength(0);
  });
});

describe("listPhoneNumbers — label fallback for phone with no humanId (account labels used)", () => {
  it("uses accountPhoneLabels (not humanPhoneLabels) for phone with no humanId", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Widget Corp");
    await seedAccountPhoneLabel(db, "lbl-acc-1", "Reception");
    // Also seed a human label with the same ID to confirm account labels win
    await seedHumanPhoneLabel(db, "lbl-hum-1", "Mobile");
    // Phone has no humanId — it belongs to an account, so account labels are consulted
    await seedPhone(db, "ph-acc", "+7777777777", { accountId: "acc-1", labelId: "lbl-acc-1" });

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.labelName).toBe("Reception");
  });

  it("returns null labelName when phone has no humanId and no accountId (orphan)", async () => {
    const db = getTestDb();
    // Orphan phone with a labelId pointing at a humanPhoneLabel
    await seedHumanPhoneLabel(db, "lbl-human", "Personal");
    // Phone is not linked to human or account — falls into account labels bucket
    await seedPhone(db, "ph-orphan", "+8888888888", { labelId: "lbl-human" });

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(1);
    // Since phone.humanId is null we look in accountLabels, which has no "lbl-human"
    expect(result[0]!.labelName).toBeNull();
  });
});

describe("updatePhoneNumber — no phoneNumber field (L189 else branch)", () => {
  it("updates non-phone fields without normalizing or checking duplicates", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedPhone(db, "ph-1", "+1111111111", { humanId: "h-1" });

    // Update only labelId — no phoneNumber field in the update payload
    const result = await updatePhoneNumber(db, "ph-1", { labelId: null });

    expect(result!.phoneNumber).toBe("+1111111111");
    expect(result!.labelId).toBeNull();
  });

  it("updates hasWhatsapp flag without touching phoneNumber", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedPhone(db, "ph-1", "+2222222222", { humanId: "h-1" });

    const result = await updatePhoneNumber(db, "ph-1", { hasWhatsapp: true });

    expect(result!.hasWhatsapp).toBe(true);
    expect(result!.phoneNumber).toBe("+2222222222");
  });
});

describe("createPhoneNumber — label and flag branches", () => {
  it("stores provided labelId when given", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedHumanPhoneLabel(db, "lbl-mobile", "Mobile");

    const result = await createPhoneNumber(db, {
      humanId: "h-1",
      phoneNumber: "+3333333333",
      labelId: "lbl-mobile",
    });

    expect(result.labelId).toBe("lbl-mobile");
  });

  it("stores hasWhatsapp=true when explicitly set", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPhoneNumber(db, {
      humanId: "h-1",
      phoneNumber: "+4444444444",
      hasWhatsapp: true,
    });

    expect(result.hasWhatsapp).toBe(true);
  });

  it("stores isPrimary=true when explicitly set", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createPhoneNumber(db, {
      humanId: "h-1",
      phoneNumber: "+5555555555",
      isPrimary: true,
    });

    expect(result.isPrimary).toBe(true);
  });
});

describe("listPhoneNumbersForEntity", () => {
  it("returns phones for a general lead", async () => {
    const db = getTestDb();
    await seedGeneralLead(db, "gl-1", "Sam", "Wilson");
    await seedPhone(db, "ph-1", "+1234567890", { generalLeadId: "gl-1" });
    await seedPhone(db, "ph-2", "+0000000000");

    const result = await listPhoneNumbersForEntity(db, "generalLeadId", "gl-1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "ph-1",
      phoneNumber: "+1234567890",
    });
    expect(result[0]!.displayId).toMatch(/^FON-/);
  });

  it("returns empty list when no phones for entity", async () => {
    const db = getTestDb();
    const result = await listPhoneNumbersForEntity(db, "generalLeadId", "nonexistent");
    expect(result).toHaveLength(0);
  });
});

// ─── resolveOwner fallbacks — orphaned humanId (L20 if[1]) ───────────────────

describe("listPhoneNumbers — resolveOwner: humanId set but human not found", () => {
  it("returns ownerName=null and ownerDisplayId=null when humanId points to nonexistent human", async () => {
    const db = getTestDb();

    // Seed a real human so the phones table row can be inserted, then delete it
    await seedHuman(db, "h-ghost-1", "Ghost", "Human");
    await seedPhone(db, "ph-ghost-1", "+19998887771", { humanId: "h-ghost-1" });

    // Remove the human to orphan the phone's humanId
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(sql`DELETE FROM humans WHERE id = 'h-ghost-1'`);
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(1);
    // humanId is set but human not found in lookup → resolveOwner returns null
    expect(result[0]!.ownerName).toBeNull();
    expect(result[0]!.ownerDisplayId).toBeNull();
  });
});

// ─── resolveOwner fallbacks — orphaned accountId (L24 if[1]) ─────────────────

describe("listPhoneNumbers — resolveOwner: accountId set but account not found", () => {
  it("returns ownerName=null and ownerDisplayId=null when accountId points to nonexistent account", async () => {
    const db = getTestDb();

    // Seed a real account so the row can be inserted, then delete it
    await seedAccount(db, "acc-ghost-1", "Ghost Corp");
    await seedPhone(db, "ph-ghost-acc-1", "+19998887772", { accountId: "acc-ghost-1" });

    // Remove the account to orphan the phone's accountId
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(sql`DELETE FROM accounts WHERE id = 'acc-ghost-1'`);
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(1);
    // accountId is set but account not found → resolveOwner falls through to return null
    expect(result[0]!.ownerName).toBeNull();
    expect(result[0]!.ownerDisplayId).toBeNull();
  });
});

// ─── resolveOwner — generalLeadId: lead found (L39/L46 truthy branch) ────────

describe("listPhoneNumbers — resolveOwner: generalLeadId resolves correctly", () => {
  it("returns lead name as ownerName when generalLeadId points to an existing lead", async () => {
    const db = getTestDb();

    await seedGeneralLead(db, "gl-owner-1", "Sam", "Wilson");
    await seedPhone(db, "ph-gl-1", "+19998887773", { generalLeadId: "gl-owner-1" });

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(1);
    // generalLeadId is set and found → resolveOwner returns lead full name
    expect(result[0]!.ownerName).toBe("Sam Wilson");
    expect(result[0]!.ownerDisplayId).toMatch(/^LEA-/);
  });
});

// ─── resolveOwner fallbacks — orphaned generalLeadId (L28 if[1]) ─────────────

describe("listPhoneNumbers — resolveOwner: generalLeadId set but lead not found", () => {
  it("returns ownerName=null when generalLeadId points to nonexistent lead", async () => {
    const db = getTestDb();

    // Seed a lead so the phone can be inserted, then remove it
    await seedGeneralLead(db, "gl-ghost-1", "Ghost", "Lead");
    await seedPhone(db, "ph-gl-ghost-1", "+19998887774", { generalLeadId: "gl-ghost-1" });

    // Remove the lead to orphan the phone's generalLeadId
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(sql`DELETE FROM general_leads WHERE id = 'gl-ghost-1'`);
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await listPhoneNumbers(db);
    expect(result).toHaveLength(1);
    // generalLeadId is set but lead not found → resolveOwner returns null
    expect(result[0]!.ownerName).toBeNull();
    expect(result[0]!.ownerDisplayId).toBeNull();
  });
});
