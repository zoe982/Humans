import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { getTestDb } from "../setup";
import { deduplicateContacts } from "../../../src/services/dedup-contacts";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;
function nextDid(prefix: string) {
  seedCounter++;
  return `${prefix}-${String(seedCounter).padStart(6, "0")}`;
}

async function seedHuman(db: ReturnType<typeof getTestDb>, id: string, first: string, last: string) {
  const ts = now();
  await db.insert(schema.humans).values({
    id,
    displayId: nextDid("HUM"),
    firstName: first,
    lastName: last,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
}

async function seedEmail(
  db: ReturnType<typeof getTestDb>,
  id: string,
  email: string,
  opts: { humanId?: string; accountId?: string; generalLeadId?: string } = {},
  createdAt?: string,
) {
  await db.insert(schema.emails).values({
    id,
    displayId: nextDid("EML"),
    email,
    humanId: opts.humanId ?? null,
    accountId: opts.accountId ?? null,
    generalLeadId: opts.generalLeadId ?? null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    labelId: null,
    isPrimary: false,
    createdAt: createdAt ?? now(),
  });
}

async function seedPhone(
  db: ReturnType<typeof getTestDb>,
  id: string,
  phoneNumber: string,
  opts: { humanId?: string } = {},
  createdAt?: string,
) {
  await db.insert(schema.phones).values({
    id,
    displayId: nextDid("FON"),
    phoneNumber,
    humanId: opts.humanId ?? null,
    accountId: null,
    generalLeadId: null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    labelId: null,
    hasWhatsapp: false,
    isPrimary: false,
    createdAt: createdAt ?? now(),
  });
}

/** Drop unique indexes so we can seed duplicate data (dedup runs BEFORE constraints are applied). */
async function dropUniqueConstraints(db: ReturnType<typeof getTestDb>) {
  await db.execute(sql`DROP INDEX IF EXISTS emails_email_unique`);
  await db.execute(sql`DROP INDEX IF EXISTS phones_phone_number_unique`);
  await db.execute(sql`DROP INDEX IF EXISTS social_ids_platform_handle_unique`);
  await db.execute(sql`DROP INDEX IF EXISTS websites_url_unique`);
}

describe("deduplicateContacts", () => {
  it("merges duplicate emails keeping oldest and transferring owner FKs", async () => {
    const db = getTestDb();
    await dropUniqueConstraints(db);
    await seedHuman(db, "h-1", "John", "Doe");
    await seedHuman(db, "h-2", "Jane", "Smith");

    // Same email, different owners — older should be kept
    await seedEmail(db, "em-1", "john@example.com", { humanId: "h-1" }, "2024-01-01T00:00:00.000Z");
    await seedEmail(db, "em-2", "john@example.com", { humanId: "h-2" }, "2024-06-01T00:00:00.000Z");

    const result = await deduplicateContacts(db);

    expect(result.emails.merged).toBe(1);

    const rows = await db.select().from(schema.emails);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("em-1");
    // The older record should still have its original humanId
    expect(rows[0]!.humanId).toBe("h-1");
  });

  it("normalizes email values in place", async () => {
    const db = getTestDb();
    await seedEmail(db, "em-1", "JOHN@EXAMPLE.COM");

    const result = await deduplicateContacts(db);

    expect(result.emails.normalized).toBeGreaterThanOrEqual(1);

    const rows = await db.select().from(schema.emails);
    expect(rows[0]!.email).toBe("john@example.com");
  });

  it("merges duplicate phones keeping oldest", async () => {
    const db = getTestDb();
    await dropUniqueConstraints(db);
    await seedHuman(db, "h-1", "John", "Doe");

    await seedPhone(db, "ph-1", "+15551234567", { humanId: "h-1" }, "2024-01-01T00:00:00.000Z");
    await seedPhone(db, "ph-2", "+15551234567", {}, "2024-06-01T00:00:00.000Z");

    const result = await deduplicateContacts(db);

    expect(result.phones.merged).toBe(1);

    const rows = await db.select().from(schema.phones);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("ph-1");
  });

  it("returns zero counts when no duplicates exist", async () => {
    const db = getTestDb();
    await seedEmail(db, "em-1", "a@test.com");
    await seedEmail(db, "em-2", "b@test.com");

    const result = await deduplicateContacts(db);

    expect(result.emails.merged).toBe(0);
    expect(result.phones.merged).toBe(0);
    expect(result.socialIds.merged).toBe(0);
    expect(result.websites.merged).toBe(0);
  });
});
