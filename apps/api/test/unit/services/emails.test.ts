import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listEmails,
  getEmail,
  updateEmail,
  createEmail,
  deleteEmail,
} from "../../../src/services/emails";
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

async function seedEmail(
  db: ReturnType<typeof getTestDb>,
  id = "em-1",
  ownerId = "h-1",
  email = "test@example.com",
  ownerType: "human" | "account" = "human",
  labelId: string | null = null,
) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.emails).values({
    id,
    displayId: `EML-${String(seedCounter).padStart(6, "0")}`,
    ownerType,
    ownerId,
    email,
    labelId,
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
    await seedEmail(db, "em-1", "h-1", "alice@test.com");

    const result = await listEmails(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.email).toBe("alice@test.com");
    expect(result[0]!.ownerName).toBe("Alice Smith");
  });

  it("returns multiple emails across different humans", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");
    await seedEmail(db, "em-1", "h-1", "alice@test.com");
    await seedEmail(db, "em-2", "h-2", "bob@test.com");

    const result = await listEmails(db);
    expect(result).toHaveLength(2);

    const alice = result.find((e) => e.ownerId === "h-1");
    const bob = result.find((e) => e.ownerId === "h-2");
    expect(alice!.ownerName).toBe("Alice Smith");
    expect(bob!.ownerName).toBe("Bob Jones");
  });

  it("returns emails owned by an account with account name", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Acme Corp");
    await seedEmail(db, "em-1", "acc-1", "acme@test.com", "account");

    const result = await listEmails(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.ownerName).toBe("Acme Corp");
    expect(result[0]!.ownerDisplayId).toMatch(/^ACC-/);
  });

  it("resolves labelName for human-owned email", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHumanEmailLabel(db, "lbl-1", "Work");
    await seedEmail(db, "em-1", "h-1", "alice@work.com", "human", "lbl-1");

    const result = await listEmails(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.labelName).toBe("Work");
  });

  it("resolves labelName for account-owned email", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Acme Corp");
    await seedAccountEmailLabel(db, "lbl-2", "Billing");
    await seedEmail(db, "em-1", "acc-1", "billing@acme.com", "account", "lbl-2");

    const result = await listEmails(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.labelName).toBe("Billing");
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
    await seedEmail(db, "em-1", "h-1", "carol@test.com");

    const result = await getEmail(db, "em-1");
    expect(result.id).toBe("em-1");
    expect(result.email).toBe("carol@test.com");
    expect(result.ownerName).toBe("Carol King");
    expect(result.humanDisplayId ?? result.ownerDisplayId).toMatch(/^HUM-/);
    expect(result.labelName).toBeNull();
  });

  it("returns email enriched with account data", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Widget Corp");
    await seedEmail(db, "em-1", "acc-1", "widgets@test.com", "account");

    const result = await getEmail(db, "em-1");
    expect(result.ownerName).toBe("Widget Corp");
    expect(result.ownerDisplayId).toMatch(/^ACC-/);
  });

  it("resolves labelName for human-owned email", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "King");
    await seedHumanEmailLabel(db, "lbl-1", "Personal");
    await seedEmail(db, "em-1", "h-1", "carol@home.com", "human", "lbl-1");

    const result = await getEmail(db, "em-1");
    expect(result.labelName).toBe("Personal");
  });

  it("returns null labelName for orphaned labelId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "King");
    await seedEmail(db, "em-1", "h-1", "carol@test.com", "human", "nonexistent-label");

    const result = await getEmail(db, "em-1");
    expect(result.labelName).toBeNull();
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
    await seedEmail(db, "em-1", "h-1", "old@test.com");

    const result = await updateEmail(db, "em-1", { email: "new@test.com" });
    expect(result!.email).toBe("new@test.com");
  });

  it("updates the isPrimary flag", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedEmail(db, "em-1", "h-1", "old@test.com");

    const result = await updateEmail(db, "em-1", { isPrimary: true });
    expect(result!.isPrimary).toBe(true);
  });

  it("persists updated value to the database", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedEmail(db, "em-1", "h-1", "before@test.com");

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
    expect(result.ownerId).toBe("h-1");
    expect(result.ownerType).toBe("human");
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
    await seedEmail(db, "em-1", "h-1");

    await deleteEmail(db, "em-1");

    const rows = await db.select().from(schema.emails);
    expect(rows).toHaveLength(0);
  });
});
