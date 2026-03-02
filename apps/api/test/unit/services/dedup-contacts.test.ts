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

async function seedAccount(db: ReturnType<typeof getTestDb>, id: string, name: string) {
  const ts = now();
  await db.insert(schema.accounts).values({
    id,
    displayId: nextDid("ACC"),
    name,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
}

async function seedGeneralLead(db: ReturnType<typeof getTestDb>, id: string) {
  const ts = now();
  await db.insert(schema.generalLeads).values({
    id,
    displayId: nextDid("LEA"),
    status: "open",
    firstName: "Test",
    lastName: "Lead",
    createdAt: ts,
    updatedAt: ts,
  });
}

async function seedPlatform(db: ReturnType<typeof getTestDb>, id: string, name: string) {
  await db.insert(schema.socialIdPlatformsConfig).values({
    id,
    name,
    createdAt: now(),
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

async function seedSocialId(
  db: ReturnType<typeof getTestDb>,
  id: string,
  handle: string,
  opts: { platformId?: string; humanId?: string; accountId?: string; generalLeadId?: string } = {},
  createdAt?: string,
) {
  await db.insert(schema.socialIds).values({
    id,
    displayId: nextDid("SOC"),
    handle,
    platformId: opts.platformId ?? null,
    humanId: opts.humanId ?? null,
    accountId: opts.accountId ?? null,
    generalLeadId: opts.generalLeadId ?? null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    createdAt: createdAt ?? now(),
  });
}

async function seedWebsite(
  db: ReturnType<typeof getTestDb>,
  id: string,
  url: string,
  opts: { humanId?: string; accountId?: string } = {},
  createdAt?: string,
) {
  await db.insert(schema.websites).values({
    id,
    displayId: nextDid("WEB"),
    url,
    humanId: opts.humanId ?? null,
    accountId: opts.accountId ?? null,
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

  it("merges duplicate social IDs keeping oldest and transferring owner FKs", async () => {
    const db = getTestDb();
    await dropUniqueConstraints(db);
    await seedHuman(db, "h-1", "John", "Doe");
    await seedAccount(db, "acc-1", "Acme Corp");
    await seedPlatform(db, "plat-1", "Instagram");

    // Older record has humanId but no accountId; newer has accountId but no humanId
    await seedSocialId(
      db,
      "soc-1",
      "@johndoe",
      { platformId: "plat-1", humanId: "h-1" },
      "2024-01-01T00:00:00.000Z",
    );
    await seedSocialId(
      db,
      "soc-2",
      "@johndoe",
      { platformId: "plat-1", accountId: "acc-1" },
      "2024-06-01T00:00:00.000Z",
    );

    const result = await deduplicateContacts(db);

    expect(result.socialIds.merged).toBe(1);

    const rows = await db.select().from(schema.socialIds);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("soc-1");
    // Keeper retains its own humanId and picks up accountId from the duplicate
    expect(rows[0]!.humanId).toBe("h-1");
    expect(rows[0]!.accountId).toBe("acc-1");
  });

  it("normalizes social ID handle by trimming whitespace", async () => {
    const db = getTestDb();
    // Handle with surrounding whitespace should be trimmed on normalization
    await seedSocialId(db, "soc-1", " @johndoe ");

    const result = await deduplicateContacts(db);

    expect(result.socialIds.normalized).toBeGreaterThanOrEqual(1);

    const rows = await db.select().from(schema.socialIds);
    expect(rows[0]!.handle).toBe("@johndoe");
  });

  it("merges duplicate websites keeping oldest and transferring owner FKs", async () => {
    const db = getTestDb();
    await dropUniqueConstraints(db);
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedAccount(db, "acc-1", "Acme Corp");

    // Older record has humanId; newer has accountId
    await seedWebsite(
      db,
      "web-1",
      "https://example.com",
      { humanId: "h-1" },
      "2024-01-01T00:00:00.000Z",
    );
    await seedWebsite(
      db,
      "web-2",
      "https://example.com",
      { accountId: "acc-1" },
      "2024-06-01T00:00:00.000Z",
    );

    const result = await deduplicateContacts(db);

    expect(result.websites.merged).toBe(1);

    const rows = await db.select().from(schema.websites);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("web-1");
    // Keeper retains its own humanId and picks up accountId from the duplicate
    expect(rows[0]!.humanId).toBe("h-1");
    expect(rows[0]!.accountId).toBe("acc-1");
  });

  it("normalizes website URL by stripping protocol and trailing slash", async () => {
    const db = getTestDb();
    // URL with protocol and trailing slash should be normalized
    await seedWebsite(db, "web-1", "HTTP://EXAMPLE.COM/");

    const result = await deduplicateContacts(db);

    expect(result.websites.normalized).toBeGreaterThanOrEqual(1);

    const rows = await db.select().from(schema.websites);
    expect(rows[0]!.url).toBe("example.com");
  });

  it("merges all three FKs (humanId, accountId, generalLeadId) from duplicate email onto keeper", async () => {
    const db = getTestDb();
    await dropUniqueConstraints(db);
    await seedAccount(db, "acc-1", "Widgets LLC");
    await seedGeneralLead(db, "lead-1");

    // Older record has no FKs; newer has accountId and generalLeadId
    await seedEmail(
      db,
      "em-1",
      "contact@widgets.com",
      {},
      "2024-01-01T00:00:00.000Z",
    );
    await seedEmail(
      db,
      "em-2",
      "contact@widgets.com",
      { accountId: "acc-1", generalLeadId: "lead-1" },
      "2024-06-01T00:00:00.000Z",
    );

    const result = await deduplicateContacts(db);

    expect(result.emails.merged).toBe(1);

    const rows = await db.select().from(schema.emails);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("em-1");
    // Both FKs from the duplicate should have been transferred to the keeper
    expect(rows[0]!.accountId).toBe("acc-1");
    expect(rows[0]!.generalLeadId).toBe("lead-1");
  });

  it("transfers FK from duplicate phone to keeper when keeper has no FK set", async () => {
    const db = getTestDb();
    await dropUniqueConstraints(db);
    await seedHuman(db, "h-dup", "Carol", "White");

    // Older record (keeper) has no humanId; newer (duplicate) has humanId set
    await seedPhone(db, "ph-keep", "+15559876543", {}, "2024-01-01T00:00:00.000Z");
    await seedPhone(db, "ph-dup", "+15559876543", { humanId: "h-dup" }, "2024-06-01T00:00:00.000Z");

    const result = await deduplicateContacts(db);

    expect(result.phones.merged).toBe(1);

    const rows = await db.select().from(schema.phones);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("ph-keep");
    // The humanId from the duplicate should be transferred to the keeper
    expect(rows[0]!.humanId).toBe("h-dup");
  });

  it("normalizes phone number in place when it differs from normalized form", async () => {
    const db = getTestDb();
    // Seed a phone with a non-normalized number (spaces stripped during normalization)
    await db.insert(schema.phones).values({
      id: "ph-norm",
      displayId: nextDid("FON"),
      phoneNumber: "+1 555 123 4567",
      humanId: null,
      accountId: null,
      generalLeadId: null,
      websiteBookingRequestId: null,
      routeSignupId: null,
      labelId: null,
      hasWhatsapp: false,
      isPrimary: false,
      createdAt: now(),
    });

    const result = await deduplicateContacts(db);

    expect(result.phones.normalized).toBeGreaterThanOrEqual(1);

    const rows = await db.select().from(schema.phones);
    // Spaces are stripped by normalizePhone → "+15551234567"
    expect(rows[0]!.phoneNumber).toBe("+15551234567");
  });

  // ─── L122 if[1]: socialIds fkUpdates empty (keeper already has all FKs) ───

  it("does not update keeper FK when both social IDs share the same humanId (no fkUpdates needed)", async () => {
    const db = getTestDb();
    await dropUniqueConstraints(db);
    await seedHuman(db, "h-shared", "Shared", "Owner");
    await seedPlatform(db, "plat-ig", "Instagram");

    // Both records have the same humanId — keeper.humanId is not null, so no FK transfer
    await seedSocialId(
      db,
      "soc-keep",
      "@handle",
      { platformId: "plat-ig", humanId: "h-shared" },
      "2024-01-01T00:00:00.000Z",
    );
    await seedSocialId(
      db,
      "soc-dupe",
      "@handle",
      { platformId: "plat-ig", humanId: "h-shared" },
      "2024-06-01T00:00:00.000Z",
    );

    const result = await deduplicateContacts(db);

    expect(result.socialIds.merged).toBe(1);

    const rows = await db.select().from(schema.socialIds);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("soc-keep");
    // humanId unchanged — fkUpdates was empty (if[1] false branch)
    expect(rows[0]!.humanId).toBe("h-shared");
  });

  // ─── L154 if[0]: website keeper has no humanId, dupe has one ──────────────

  it("transfers humanId from website dupe to keeper when keeper has no humanId", async () => {
    const db = getTestDb();
    await dropUniqueConstraints(db);
    await seedHuman(db, "h-web", "Web", "Owner");

    // Keeper has no humanId; dupe has one — FK should transfer
    await seedWebsite(
      db,
      "web-keep",
      "https://transfer.com",
      { humanId: undefined },
      "2024-01-01T00:00:00.000Z",
    );
    await seedWebsite(
      db,
      "web-dupe",
      "https://transfer.com",
      { humanId: "h-web" },
      "2024-06-01T00:00:00.000Z",
    );

    const result = await deduplicateContacts(db);

    expect(result.websites.merged).toBe(1);

    const rows = await db.select().from(schema.websites);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("web-keep");
    // humanId should have been transferred from the dupe (L154 if[0] true branch)
    expect(rows[0]!.humanId).toBe("h-web");
  });

  // ─── L155 if[1]: website keeper already has accountId (no transfer needed) ──

  it("does not overwrite keeper accountId when keeper already has one (L155 if[1] false branch)", async () => {
    const db = getTestDb();
    await dropUniqueConstraints(db);
    await seedAccount(db, "acc-keep", "Keeper Corp");
    await seedAccount(db, "acc-dupe", "Dupe Corp");

    // Keeper already has accountId — no FK update for accountId
    await seedWebsite(
      db,
      "web-k2",
      "https://keeper-acct.com",
      { accountId: "acc-keep" },
      "2024-01-01T00:00:00.000Z",
    );
    await seedWebsite(
      db,
      "web-d2",
      "https://keeper-acct.com",
      { accountId: "acc-dupe" },
      "2024-06-01T00:00:00.000Z",
    );

    const result = await deduplicateContacts(db);

    expect(result.websites.merged).toBe(1);

    const rows = await db.select().from(schema.websites);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("web-k2");
    // Keeper's accountId is preserved (dupe's accountId NOT transferred)
    expect(rows[0]!.accountId).toBe("acc-keep");
  });

  // ─── L156 if[1]: websites fkUpdates empty when keeper already has all FKs ──

  it("skips the fkUpdates DB write when website keeper already has both FKs set", async () => {
    const db = getTestDb();
    await dropUniqueConstraints(db);
    await seedHuman(db, "h-all", "Has", "All");
    await seedAccount(db, "acc-all", "Has All Corp");

    // Keeper has both humanId and accountId; dupe has same humanId and accountId
    // No FK transfer needed — fkUpdates will be empty (L156 if[1] false branch)
    await seedWebsite(
      db,
      "web-full-k",
      "https://fullset.com",
      { humanId: "h-all", accountId: "acc-all" },
      "2024-01-01T00:00:00.000Z",
    );
    await seedWebsite(
      db,
      "web-full-d",
      "https://fullset.com",
      { humanId: "h-all", accountId: "acc-all" },
      "2024-06-01T00:00:00.000Z",
    );

    const result = await deduplicateContacts(db);

    expect(result.websites.merged).toBe(1);

    const rows = await db.select().from(schema.websites);
    expect(rows).toHaveLength(1);
    // Both FKs still correct on keeper
    expect(rows[0]!.humanId).toBe("h-all");
    expect(rows[0]!.accountId).toBe("acc-all");
  });

  // ─── L163 if[1]: website URL already normalized (no normalized write needed) ──

  it("does not increment normalized count when website URL is already normalized", async () => {
    const db = getTestDb();
    // Already-normalized URL — normalizeUrl should return the same value
    await seedWebsite(db, "web-norm", "example.com");

    const result = await deduplicateContacts(db);

    // Since keeper.url === normalizedValue, the normalized branch is NOT taken
    expect(result.websites.normalized).toBe(0);

    const rows = await db.select().from(schema.websites);
    expect(rows[0]!.url).toBe("example.com");
  });

  it("does increment normalized count when website URL is not yet normalized", async () => {
    const db = getTestDb();
    // URL with trailing slash needs normalization
    await seedWebsite(db, "web-unnorm", "https://example.com/");

    const result = await deduplicateContacts(db);

    expect(result.websites.normalized).toBeGreaterThanOrEqual(1);

    const rows = await db.select().from(schema.websites);
    expect(rows[0]!.url).toBe("example.com");
  });

  it("merges three duplicate emails into one, incrementing merged count twice", async () => {
    const db = getTestDb();
    await dropUniqueConstraints(db);
    await seedHuman(db, "h-1", "Bob", "Jones");

    // Three records with the same email — oldest should survive
    await seedEmail(
      db,
      "em-1",
      "bob@example.com",
      { humanId: "h-1" },
      "2024-01-01T00:00:00.000Z",
    );
    await seedEmail(
      db,
      "em-2",
      "bob@example.com",
      {},
      "2024-04-01T00:00:00.000Z",
    );
    await seedEmail(
      db,
      "em-3",
      "bob@example.com",
      {},
      "2024-07-01T00:00:00.000Z",
    );

    const result = await deduplicateContacts(db);

    // Two duplicates eliminated — merged count must be 2
    expect(result.emails.merged).toBe(2);

    const rows = await db.select().from(schema.emails);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("em-1");
    expect(rows[0]!.humanId).toBe("h-1");
  });
});
