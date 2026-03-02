import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listEmails,
  getEmail,
  updateEmail,
  createEmail,
  deleteEmail,
  listEmailsForEntity,
} from "../../../src/services/emails";
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

async function seedEmail(
  db: ReturnType<typeof getTestDb>,
  id: string,
  email: string,
  opts: { humanId?: string; accountId?: string; generalLeadId?: string; labelId?: string | null } = {},
) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.emails).values({
    id,
    displayId: `EML-${String(seedCounter).padStart(6, "0")}`,
    humanId: opts.humanId ?? null,
    accountId: opts.accountId ?? null,
    generalLeadId: opts.generalLeadId ?? null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    email,
    labelId: opts.labelId ?? null,
    isPrimary: true,
    createdAt: ts,
  });
  return id;
}

async function seedHumanEmailLabel(db: ReturnType<typeof getTestDb>, id: string, name: string) {
  await db.insert(schema.humanEmailLabelsConfig).values({ id, name, createdAt: now() });
}

async function seedAccountEmailLabel(db: ReturnType<typeof getTestDb>, id: string, name: string) {
  await db.insert(schema.accountEmailLabelsConfig).values({ id, name, createdAt: now() });
}

describe("listEmails", () => {
  it("returns empty list when no emails", async () => {
    const db = getTestDb();
    const result = await listEmails(db);
    expect(result).toHaveLength(0);
  });

  it("returns emails with human names", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedEmail(db, "em-1", "alice@test.com", { humanId: "h-1" });

    const result = await listEmails(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.email).toBe("alice@test.com");
    expect(result[0]!.ownerName).toBe("Alice Smith");
  });

  it("filters emails by query string", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedEmail(db, "em-1", "alice@test.com", { humanId: "h-1" });
    await seedEmail(db, "em-2", "bob@test.com", { humanId: "h-1" });

    const result = await listEmails(db, "alice");
    expect(result).toHaveLength(1);
    expect(result[0]!.email).toBe("alice@test.com");
  });

  it("returns all emails when query is undefined", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedEmail(db, "em-1", "alice@test.com", { humanId: "h-1" });
    await seedEmail(db, "em-2", "bob@test.com", { humanId: "h-1" });

    const result = await listEmails(db);
    expect(result).toHaveLength(2);
  });

  it("returns multiple emails across different humans", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedEmail(db, "em-1", "alice@test.com", { humanId: "h-1" });
    await seedEmail(db, "em-2", "bob@test.com", { humanId: "h-2" });

    const result = await listEmails(db);
    expect(result).toHaveLength(2);

    const alice = result.find((e) => e.humanId === "h-1");
    const bob = result.find((e) => e.humanId === "h-2");
    expect(alice!.ownerName).toBe("Alice Smith");
    expect(bob!.ownerName).toBe("Bob Jones");
  });

  it("returns emails owned by an account with account name", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Acme Corp");
    await seedEmail(db, "em-1", "acme@test.com", { accountId: "acc-1" });

    const result = await listEmails(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.ownerName).toBe("Acme Corp");
    expect(result[0]!.ownerDisplayId).toMatch(/^ACC-/);
  });

  it("resolves labelName for human-owned email", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHumanEmailLabel(db, "lbl-1", "Work");
    await seedEmail(db, "em-1", "alice@work.com", { humanId: "h-1", labelId: "lbl-1" });

    const result = await listEmails(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.labelName).toBe("Work");
  });

  it("resolves labelName for account-owned email", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Acme Corp");
    await seedAccountEmailLabel(db, "lbl-2", "Billing");
    await seedEmail(db, "em-1", "billing@acme.com", { accountId: "acc-1", labelId: "lbl-2" });

    const result = await listEmails(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.labelName).toBe("Billing");
  });

  it("returns emails with general lead owner names", async () => {
    const db = getTestDb();
    await seedGeneralLead(db, "gl-1", "Sam", "Wilson");
    await seedEmail(db, "em-1", "sam@test.com", { generalLeadId: "gl-1" });

    const result = await listEmails(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.ownerName).toBe("Sam Wilson");
    expect(result[0]!.ownerDisplayId).toMatch(/^LEA-/);
  });
});

// ---------------------------------------------------------------------------
// getEmail
// ---------------------------------------------------------------------------

describe("getEmail", () => {
  it("throws notFound for missing email", async () => {
    const db = getTestDb();
    await expect(getEmail(db, "nonexistent")).rejects.toThrowError("Email not found");
  });

  it("returns email enriched with human data", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "King");
    await seedEmail(db, "em-1", "carol@test.com", { humanId: "h-1" });

    const result = await getEmail(db, "em-1");
    expect(result.id).toBe("em-1");
    expect(result.email).toBe("carol@test.com");
    expect(result.ownerName).toBe("Carol King");
    expect(result.ownerDisplayId).toMatch(/^HUM-/);
    expect(result.labelName).toBeNull();
  });

  it("returns email enriched with account data", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Widget Corp");
    await seedEmail(db, "em-1", "widgets@test.com", { accountId: "acc-1" });

    const result = await getEmail(db, "em-1");
    expect(result.ownerName).toBe("Widget Corp");
    expect(result.ownerDisplayId).toMatch(/^ACC-/);
  });

  it("resolves labelName for human-owned email", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "King");
    await seedHumanEmailLabel(db, "lbl-1", "Personal");
    await seedEmail(db, "em-1", "carol@home.com", { humanId: "h-1", labelId: "lbl-1" });

    const result = await getEmail(db, "em-1");
    expect(result.labelName).toBe("Personal");
  });

  it("returns null labelName for orphaned labelId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "King");
    await seedEmail(db, "em-1", "carol@test.com", { humanId: "h-1", labelId: "nonexistent-label" });

    const result = await getEmail(db, "em-1");
    expect(result.labelName).toBeNull();
  });

  it("returns per-entity resolved fields for human-owned email", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "King");
    await seedEmail(db, "em-1", "carol@test.com", { humanId: "h-1" });

    const result = await getEmail(db, "em-1");
    expect(result.humanDisplayId).toMatch(/^HUM-/);
    expect(result.humanName).toBe("Carol King");
    expect(result.accountDisplayId).toBeNull();
    expect(result.accountName).toBeNull();
    expect(result.generalLeadDisplayId).toBeNull();
    expect(result.generalLeadName).toBeNull();
    expect(result.websiteBookingRequestDisplayId).toBeNull();
    expect(result.websiteBookingRequestName).toBeNull();
    expect(result.routeSignupDisplayId).toBeNull();
    expect(result.routeSignupName).toBeNull();
  });

  it("returns per-entity resolved fields for account-owned email", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Widget Corp");
    await seedEmail(db, "em-1", "widgets@test.com", { accountId: "acc-1" });

    const result = await getEmail(db, "em-1");
    expect(result.humanDisplayId).toBeNull();
    expect(result.humanName).toBeNull();
    expect(result.accountDisplayId).toMatch(/^ACC-/);
    expect(result.accountName).toBe("Widget Corp");
  });

  it("returns per-entity resolved fields for general-lead-owned email", async () => {
    const db = getTestDb();
    await seedGeneralLead(db, "gl-1", "Sam", "Wilson");
    await seedEmail(db, "em-1", "sam@test.com", { generalLeadId: "gl-1" });

    const result = await getEmail(db, "em-1");
    expect(result.generalLeadDisplayId).toMatch(/^LEA-/);
    expect(result.generalLeadName).toBe("Sam Wilson");
    expect(result.humanDisplayId).toBeNull();
    expect(result.accountDisplayId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateEmail
// ---------------------------------------------------------------------------

describe("updateEmail", () => {
  it("throws notFound for missing email", async () => {
    const db = getTestDb();
    await expect(
      updateEmail(db, "nonexistent", { email: "new@test.com" }),
    ).rejects.toThrowError("Email not found");
  });

  it("updates the email address", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedEmail(db, "em-1", "old@test.com", { humanId: "h-1" });

    const result = await updateEmail(db, "em-1", { email: "new@test.com" });
    expect(result!.email).toBe("new@test.com");
  });

  it("updates the isPrimary flag", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedEmail(db, "em-1", "old@test.com", { humanId: "h-1" });

    const result = await updateEmail(db, "em-1", { isPrimary: true });
    expect(result!.isPrimary).toBe(true);
  });

  it("persists updated value to the database", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedEmail(db, "em-1", "before@test.com", { humanId: "h-1" });

    await updateEmail(db, "em-1", { email: "after@test.com" });

    const rows = await db.select().from(schema.emails);
    expect(rows[0]!.email).toBe("after@test.com");
  });
});

describe("createEmail", () => {
  it("creates an email with defaults", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createEmail(db, {
      humanId: "h-1",
      email: "new@test.com",
    });

    expect(result.id).toBeDefined();
    expect(result.humanId).toBe("h-1");
    expect(result.email).toBe("new@test.com");
    expect(result.isPrimary).toBe(false);
    expect(result.labelId).toBeNull();

    const rows = await db.select().from(schema.emails);
    expect(rows).toHaveLength(1);
  });

  it("creates an email with isPrimary flag", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createEmail(db, {
      humanId: "h-1",
      email: "primary@test.com",
      isPrimary: true,
    });

    expect(result.isPrimary).toBe(true);
  });
});

describe("createEmail — duplicate detection", () => {
  it("throws 409 when creating email with same normalized address", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");
    await seedHuman(db, "h-2", "Jane", "Smith");
    await seedEmail(db, "em-1", "john@example.com", { humanId: "h-1" });

    await expect(
      createEmail(db, { humanId: "h-2", email: "john@example.com" }),
    ).rejects.toThrowError("An email with this address already exists");
  });

  it("normalizes email before duplicate check (case-insensitive)", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");
    await seedHuman(db, "h-2", "Jane", "Smith");
    await seedEmail(db, "em-1", "john@example.com", { humanId: "h-1" });

    await expect(
      createEmail(db, { humanId: "h-2", email: "  JOHN@EXAMPLE.COM  " }),
    ).rejects.toThrowError("An email with this address already exists");
  });

  it("stores normalized email value", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");

    const result = await createEmail(db, { humanId: "h-1", email: "  Alice@EXAMPLE.COM  " });

    expect(result.email).toBe("alice@example.com");
  });

  it("includes existingId and existingOwners in 409 details", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");
    await seedEmail(db, "em-1", "john@example.com", { humanId: "h-1" });

    try {
      await createEmail(db, { email: "john@example.com" });
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.status).toBe(409);
      expect(appErr.code).toBe("EMAIL_DUPLICATE");
      const details = appErr.details as { existingId: string; existingDisplayId: string; existingOwners: unknown[] };
      expect(details.existingId).toBe("em-1");
      expect(details.existingDisplayId).toMatch(/^EML-/);
      expect(details.existingOwners).toEqual([
        expect.objectContaining({ type: "human", id: "h-1", name: "John Doe" }),
      ]);
    }
  });
});

describe("updateEmail — duplicate detection", () => {
  it("throws 409 when updating to a duplicate email address", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");
    await seedEmail(db, "em-1", "john@example.com", { humanId: "h-1" });
    await seedEmail(db, "em-2", "other@example.com", { humanId: "h-1" });

    await expect(
      updateEmail(db, "em-2", { email: "john@example.com" }),
    ).rejects.toThrowError("An email with this address already exists");
  });

  it("allows updating to the same value (self-update)", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");
    await seedEmail(db, "em-1", "john@example.com", { humanId: "h-1" });

    const result = await updateEmail(db, "em-1", { email: "john@example.com" });
    expect(result!.email).toBe("john@example.com");
  });
});

describe("deleteEmail", () => {
  it("throws not found for missing email", async () => {
    const db = getTestDb();
    await expect(
      deleteEmail(db, "nonexistent"),
    ).rejects.toThrowError("Email not found");
  });

  it("deletes an existing email", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedEmail(db, "em-1", "test@example.com", { humanId: "h-1" });

    await deleteEmail(db, "em-1");

    const rows = await db.select().from(schema.emails);
    expect(rows).toHaveLength(0);
  });
});

describe("listEmailsForEntity", () => {
  it("returns emails for a general lead", async () => {
    const db = getTestDb();
    await seedGeneralLead(db, "gl-1", "Sam", "Wilson");
    await seedEmail(db, "em-1", "sam@test.com", { generalLeadId: "gl-1" });
    await seedEmail(db, "em-2", "other@test.com");

    const result = await listEmailsForEntity(db, "generalLeadId", "gl-1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "em-1",
      email: "sam@test.com",
    });
    expect(result[0]!.displayId).toMatch(/^EML-/);
  });

  it("returns empty list when no emails for entity", async () => {
    const db = getTestDb();
    const result = await listEmailsForEntity(db, "generalLeadId", "nonexistent");
    expect(result).toHaveLength(0);
  });
});
