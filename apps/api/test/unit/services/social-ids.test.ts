import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listSocialIds,
  getSocialId,
  createSocialId,
  updateSocialId,
  deleteSocialId,
} from "../../../src/services/social-ids";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;
function nextDisplayId(prefix: string) {
  seedCounter++;
  return `${prefix}-${String(seedCounter).padStart(6, "0")}`;
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

async function seedAccount(db: ReturnType<typeof getTestDb>, id = "acc-1", name = "Test Corp") {
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

async function seedPlatform(db: ReturnType<typeof getTestDb>, id = "plat-1", name = "Instagram") {
  const ts = now();
  await db.insert(schema.socialIdPlatformsConfig).values({
    id,
    name,
    createdAt: ts,
  });
  return id;
}

async function seedSocialId(
  db: ReturnType<typeof getTestDb>,
  id = "soc-1",
  handle = "@test_user",
  overrides: Partial<{
    platformId: string | null;
    humanId: string | null;
    accountId: string | null;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.socialIds).values({
    id,
    displayId: nextDisplayId("SOC"),
    handle,
    platformId: overrides.platformId ?? null,
    humanId: overrides.humanId ?? null,
    accountId: overrides.accountId ?? null,
    createdAt: ts,
  });
  return id;
}

// ---------------------------------------------------------------------------
// listSocialIds
// ---------------------------------------------------------------------------

describe("listSocialIds", () => {
  it("returns empty list when no social IDs exist", async () => {
    const db = getTestDb();
    const result = await listSocialIds(db);
    expect(result).toHaveLength(0);
  });

  it("returns social IDs with null enrichment when no related entities", async () => {
    const db = getTestDb();
    await seedSocialId(db, "soc-1", "@nobody");

    const result = await listSocialIds(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.handle).toBe("@nobody");
    expect(result[0]!.humanName).toBeNull();
    expect(result[0]!.humanDisplayId).toBeNull();
    expect(result[0]!.accountName).toBeNull();
    expect(result[0]!.accountDisplayId).toBeNull();
    expect(result[0]!.platformName).toBeNull();
  });

  it("enriches social ID with human name and displayId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedSocialId(db, "soc-1", "@alice", { humanId: "h-1" });

    const result = await listSocialIds(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.humanName).toBe("Alice Smith");
    expect(result[0]!.humanDisplayId).toMatch(/^HUM-/);
  });

  it("enriches social ID with account name and displayId", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Acme Corp");
    await seedSocialId(db, "soc-1", "@acme", { accountId: "acc-1" });

    const result = await listSocialIds(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.accountName).toBe("Acme Corp");
    expect(result[0]!.accountDisplayId).toMatch(/^ACC-/);
  });

  it("enriches social ID with platform name", async () => {
    const db = getTestDb();
    await seedPlatform(db, "plat-1", "Twitter");
    await seedSocialId(db, "soc-1", "@tweeter", { platformId: "plat-1" });

    const result = await listSocialIds(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.platformName).toBe("Twitter");
  });

  it("returns multiple social IDs with mixed enrichment", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Bob", "Jones");
    await seedAccount(db, "acc-1", "Big Co");
    await seedPlatform(db, "plat-1", "LinkedIn");

    await seedSocialId(db, "soc-1", "@bob_human", { humanId: "h-1", platformId: "plat-1" });
    await seedSocialId(db, "soc-2", "@bigco_account", { accountId: "acc-1" });
    await seedSocialId(db, "soc-3", "@orphan");

    const result = await listSocialIds(db);
    expect(result).toHaveLength(3);

    const bob = result.find((s) => s.id === "soc-1");
    expect(bob!.humanName).toBe("Bob Jones");
    expect(bob!.platformName).toBe("LinkedIn");
    expect(bob!.accountName).toBeNull();

    const bigco = result.find((s) => s.id === "soc-2");
    expect(bigco!.accountName).toBe("Big Co");
    expect(bigco!.humanName).toBeNull();
    expect(bigco!.platformName).toBeNull();

    const orphan = result.find((s) => s.id === "soc-3");
    expect(orphan!.humanName).toBeNull();
    expect(orphan!.accountName).toBeNull();
    expect(orphan!.platformName).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getSocialId
// ---------------------------------------------------------------------------

describe("getSocialId", () => {
  it("throws notFound for missing social ID", async () => {
    const db = getTestDb();
    await expect(getSocialId(db, "nonexistent")).rejects.toThrowError("Social ID not found");
  });

  it("returns social ID with null enrichment when no related entities", async () => {
    const db = getTestDb();
    await seedSocialId(db, "soc-1", "@bare");

    const result = await getSocialId(db, "soc-1");
    expect(result.id).toBe("soc-1");
    expect(result.handle).toBe("@bare");
    expect(result.humanName).toBeNull();
    expect(result.humanDisplayId).toBeNull();
    expect(result.accountName).toBeNull();
    expect(result.accountDisplayId).toBeNull();
    expect(result.platformName).toBeNull();
  });

  it("returns social ID enriched with human data", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Jane", "Doe");
    await seedSocialId(db, "soc-1", "@jane", { humanId: "h-1" });

    const result = await getSocialId(db, "soc-1");
    expect(result.humanName).toBe("Jane Doe");
    expect(result.humanDisplayId).toMatch(/^HUM-/);
  });

  it("returns social ID enriched with account data", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Widgets Inc");
    await seedSocialId(db, "soc-1", "@widgets", { accountId: "acc-1" });

    const result = await getSocialId(db, "soc-1");
    expect(result.accountName).toBe("Widgets Inc");
    expect(result.accountDisplayId).toMatch(/^ACC-/);
  });

  it("returns social ID enriched with platform data", async () => {
    const db = getTestDb();
    await seedPlatform(db, "plat-1", "Facebook");
    await seedSocialId(db, "soc-1", "@fb_page", { platformId: "plat-1" });

    const result = await getSocialId(db, "soc-1");
    expect(result.platformName).toBe("Facebook");
  });

  it("returns fully enriched social ID", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "White");
    await seedAccount(db, "acc-1", "Carol's Biz");
    await seedPlatform(db, "plat-1", "TikTok");
    await seedSocialId(db, "soc-1", "@carol_tiktok", {
      humanId: "h-1",
      accountId: "acc-1",
      platformId: "plat-1",
    });

    const result = await getSocialId(db, "soc-1");
    expect(result.humanName).toBe("Carol White");
    expect(result.accountName).toBe("Carol's Biz");
    expect(result.platformName).toBe("TikTok");
  });
});

// ---------------------------------------------------------------------------
// createSocialId
// ---------------------------------------------------------------------------

describe("createSocialId", () => {
  it("creates a social ID with only a handle", async () => {
    const db = getTestDb();
    const result = await createSocialId(db, { handle: "@new_user" });

    expect(result.id).toBeDefined();
    expect(result.handle).toBe("@new_user");
    expect(result.displayId).toMatch(/^SOC-/);
    expect(result.platformId).toBeNull();
    expect(result.humanId).toBeNull();
    expect(result.accountId).toBeNull();
    expect(result.createdAt).toBeDefined();

    const rows = await db.select().from(schema.socialIds);
    expect(rows).toHaveLength(1);
  });

  it("creates a social ID linked to a human", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createSocialId(db, { handle: "@human_linked", humanId: "h-1" });
    expect(result.humanId).toBe("h-1");
    expect(result.accountId).toBeNull();
  });

  it("creates a social ID linked to an account", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1");

    const result = await createSocialId(db, { handle: "@account_linked", accountId: "acc-1" });
    expect(result.accountId).toBe("acc-1");
    expect(result.humanId).toBeNull();
  });

  it("creates a social ID linked to a platform", async () => {
    const db = getTestDb();
    await seedPlatform(db, "plat-1", "YouTube");

    const result = await createSocialId(db, { handle: "@youtuber", platformId: "plat-1" });
    expect(result.platformId).toBe("plat-1");
  });

  it("creates a social ID with all fields", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Dan", "Brown");
    await seedAccount(db, "acc-1", "Dan's Agency");
    await seedPlatform(db, "plat-1", "Pinterest");

    const result = await createSocialId(db, {
      handle: "@dan_pins",
      humanId: "h-1",
      accountId: "acc-1",
      platformId: "plat-1",
    });

    expect(result.handle).toBe("@dan_pins");
    expect(result.humanId).toBe("h-1");
    expect(result.accountId).toBe("acc-1");
    expect(result.platformId).toBe("plat-1");
  });

  it("uses null for undefined optional fields", async () => {
    const db = getTestDb();
    const result = await createSocialId(db, {
      handle: "@minimal",
      platformId: undefined,
      humanId: undefined,
      accountId: undefined,
    });

    expect(result.platformId).toBeNull();
    expect(result.humanId).toBeNull();
    expect(result.accountId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateSocialId
// ---------------------------------------------------------------------------

describe("updateSocialId", () => {
  it("throws notFound for missing social ID", async () => {
    const db = getTestDb();
    await expect(
      updateSocialId(db, "nonexistent", { handle: "@new_handle" }),
    ).rejects.toThrowError("Social ID not found");
  });

  it("updates the handle on an existing social ID", async () => {
    const db = getTestDb();
    await seedSocialId(db, "soc-1", "@old_handle");

    const result = await updateSocialId(db, "soc-1", { handle: "@new_handle" });
    expect(result!.handle).toBe("@new_handle");
  });

  it("updates the humanId on an existing social ID", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Eve", "Adams");
    await seedSocialId(db, "soc-1", "@eve");

    const result = await updateSocialId(db, "soc-1", { humanId: "h-1" });
    expect(result!.humanId).toBe("h-1");
  });

  it("updates the platformId on an existing social ID", async () => {
    const db = getTestDb();
    await seedPlatform(db, "plat-1", "Snapchat");
    await seedSocialId(db, "soc-1", "@snapper");

    const result = await updateSocialId(db, "soc-1", { platformId: "plat-1" });
    expect(result!.platformId).toBe("plat-1");
  });

  it("returns updated record persisted in the database", async () => {
    const db = getTestDb();
    await seedSocialId(db, "soc-1", "@original");

    await updateSocialId(db, "soc-1", { handle: "@updated" });

    const rows = await db.select().from(schema.socialIds);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.handle).toBe("@updated");
  });
});

// ---------------------------------------------------------------------------
// deleteSocialId
// ---------------------------------------------------------------------------

describe("deleteSocialId", () => {
  it("throws notFound for missing social ID", async () => {
    const db = getTestDb();
    await expect(deleteSocialId(db, "nonexistent")).rejects.toThrowError("Social ID not found");
  });

  it("deletes an existing social ID", async () => {
    const db = getTestDb();
    await seedSocialId(db, "soc-1", "@to_delete");

    await deleteSocialId(db, "soc-1");

    const rows = await db.select().from(schema.socialIds);
    expect(rows).toHaveLength(0);
  });

  it("deletes only the targeted social ID, leaving others intact", async () => {
    const db = getTestDb();
    await seedSocialId(db, "soc-1", "@keep_me");
    await seedSocialId(db, "soc-2", "@delete_me");

    await deleteSocialId(db, "soc-2");

    const rows = await db.select().from(schema.socialIds);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("soc-1");
  });
});
