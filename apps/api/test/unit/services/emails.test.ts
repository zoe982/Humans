import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listEmails,
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

async function seedEmail(
  db: ReturnType<typeof getTestDb>,
  id = "em-1",
  ownerId = "h-1",
  email = "test@example.com",
) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.emails).values({
    id,
    displayId: `EML-${String(seedCounter).padStart(6, "0")}`,
    ownerType: "human",
    ownerId,
    email,
    isPrimary: true,
    createdAt: ts,
  });
  return id;
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
