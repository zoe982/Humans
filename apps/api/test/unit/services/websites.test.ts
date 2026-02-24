import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listWebsites,
  getWebsite,
  createWebsite,
  updateWebsite,
  deleteWebsite,
} from "../../../src/services/websites";
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

async function seedAccount(
  db: ReturnType<typeof getTestDb>,
  id = "acc-1",
  name = "Test Corp",
) {
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

async function seedWebsite(
  db: ReturnType<typeof getTestDb>,
  id = "web-1",
  url = "https://example.com",
  overrides: Partial<{
    humanId: string | null;
    accountId: string | null;
  }> = {},
) {
  const ts = now();
  await db.insert(schema.websites).values({
    id,
    displayId: nextDisplayId("WEB"),
    url,
    humanId: overrides.humanId ?? null,
    accountId: overrides.accountId ?? null,
    createdAt: ts,
  });
  return id;
}

// ---------------------------------------------------------------------------
// listWebsites
// ---------------------------------------------------------------------------

describe("listWebsites", () => {
  it("returns empty list when no websites exist", async () => {
    const db = getTestDb();
    const result = await listWebsites(db);
    expect(result).toHaveLength(0);
  });

  it("returns websites with null enrichment when no owner", async () => {
    const db = getTestDb();
    await seedWebsite(db, "web-1", "https://example.com");

    const result = await listWebsites(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.url).toBe("https://example.com");
    expect(result[0]!.humanName).toBeNull();
    expect(result[0]!.humanDisplayId).toBeNull();
    expect(result[0]!.accountName).toBeNull();
    expect(result[0]!.accountDisplayId).toBeNull();
  });

  it("enriches website with human name and displayId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedWebsite(db, "web-1", "https://alice.com", { humanId: "h-1" });

    const result = await listWebsites(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.humanName).toBe("Alice Smith");
    expect(result[0]!.humanDisplayId).toMatch(/^HUM-/);
    expect(result[0]!.accountName).toBeNull();
    expect(result[0]!.accountDisplayId).toBeNull();
  });

  it("enriches website with account name and displayId", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Acme Corp");
    await seedWebsite(db, "web-1", "https://acme.com", { accountId: "acc-1" });

    const result = await listWebsites(db);
    expect(result).toHaveLength(1);
    expect(result[0]!.accountName).toBe("Acme Corp");
    expect(result[0]!.accountDisplayId).toMatch(/^ACC-/);
    expect(result[0]!.humanName).toBeNull();
    expect(result[0]!.humanDisplayId).toBeNull();
  });

  it("returns multiple websites with mixed enrichment", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Bob", "Jones");
    await seedAccount(db, "acc-1", "Big Co");

    await seedWebsite(db, "web-1", "https://bob.com", { humanId: "h-1" });
    await seedWebsite(db, "web-2", "https://bigco.com", { accountId: "acc-1" });
    await seedWebsite(db, "web-3", "https://orphan.com");

    const result = await listWebsites(db);
    expect(result).toHaveLength(3);

    const bob = result.find((w) => w.id === "web-1");
    expect(bob!.humanName).toBe("Bob Jones");
    expect(bob!.accountName).toBeNull();

    const bigco = result.find((w) => w.id === "web-2");
    expect(bigco!.accountName).toBe("Big Co");
    expect(bigco!.humanName).toBeNull();

    const orphan = result.find((w) => w.id === "web-3");
    expect(orphan!.humanName).toBeNull();
    expect(orphan!.accountName).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getWebsite
// ---------------------------------------------------------------------------

describe("getWebsite", () => {
  it("throws notFound for missing website", async () => {
    const db = getTestDb();
    await expect(getWebsite(db, "nonexistent")).rejects.toThrowError("Website not found");
  });

  it("returns website with null enrichment when no owner", async () => {
    const db = getTestDb();
    await seedWebsite(db, "web-1", "https://bare.com");

    const result = await getWebsite(db, "web-1");
    expect(result.id).toBe("web-1");
    expect(result.url).toBe("https://bare.com");
    expect(result.humanName).toBeNull();
    expect(result.humanDisplayId).toBeNull();
    expect(result.accountName).toBeNull();
    expect(result.accountDisplayId).toBeNull();
  });

  it("returns website enriched with human data", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "King");
    await seedWebsite(db, "web-1", "https://carol.dev", { humanId: "h-1" });

    const result = await getWebsite(db, "web-1");
    expect(result.humanName).toBe("Carol King");
    expect(result.humanDisplayId).toMatch(/^HUM-/);
    expect(result.accountName).toBeNull();
  });

  it("returns website enriched with account data", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Widget Corp");
    await seedWebsite(db, "web-1", "https://widget.io", { accountId: "acc-1" });

    const result = await getWebsite(db, "web-1");
    expect(result.accountName).toBe("Widget Corp");
    expect(result.accountDisplayId).toMatch(/^ACC-/);
    expect(result.humanName).toBeNull();
  });

  it("returns website enriched with both human and account data", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Dan", "Brown");
    await seedAccount(db, "acc-1", "Dan's Biz");
    await seedWebsite(db, "web-1", "https://danbiz.com", {
      humanId: "h-1",
      accountId: "acc-1",
    });

    const result = await getWebsite(db, "web-1");
    expect(result.humanName).toBe("Dan Brown");
    expect(result.accountName).toBe("Dan's Biz");
  });
});

// ---------------------------------------------------------------------------
// createWebsite
// ---------------------------------------------------------------------------

describe("createWebsite", () => {
  it("creates a website with only a URL", async () => {
    const db = getTestDb();
    const result = await createWebsite(db, { url: "https://new.com" });

    expect(result.id).toBeDefined();
    expect(result.url).toBe("https://new.com");
    expect(result.displayId).toMatch(/^WEB-/);
    expect(result.humanId).toBeNull();
    expect(result.accountId).toBeNull();
    expect(result.createdAt).toBeDefined();

    const rows = await db.select().from(schema.websites);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.url).toBe("https://new.com");
  });

  it("creates a website linked to a human", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Eve", "Adams");

    const result = await createWebsite(db, { url: "https://eve.io", humanId: "h-1" });
    expect(result.humanId).toBe("h-1");
    expect(result.accountId).toBeNull();
  });

  it("creates a website linked to an account", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Speedy Ltd");

    const result = await createWebsite(db, { url: "https://speedy.biz", accountId: "acc-1" });
    expect(result.accountId).toBe("acc-1");
    expect(result.humanId).toBeNull();
  });

  it("creates a website linked to both a human and an account", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Frank", "Zappa");
    await seedAccount(db, "acc-1", "Frank's Label");

    const result = await createWebsite(db, {
      url: "https://frank.music",
      humanId: "h-1",
      accountId: "acc-1",
    });
    expect(result.humanId).toBe("h-1");
    expect(result.accountId).toBe("acc-1");
  });

  it("generates unique display IDs for multiple websites", async () => {
    const db = getTestDb();

    const r1 = await createWebsite(db, { url: "https://first.com" });
    const r2 = await createWebsite(db, { url: "https://second.com" });

    expect(r1.displayId).not.toBe(r2.displayId);
    expect(r1.displayId).toMatch(/^WEB-/);
    expect(r2.displayId).toMatch(/^WEB-/);
  });

  it("defaults humanId and accountId to null when not provided", async () => {
    const db = getTestDb();
    const result = await createWebsite(db, { url: "https://minimal.org" });
    expect(result.humanId).toBeNull();
    expect(result.accountId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateWebsite
// ---------------------------------------------------------------------------

describe("updateWebsite", () => {
  it("throws notFound for missing website", async () => {
    const db = getTestDb();
    await expect(
      updateWebsite(db, "nonexistent", { url: "https://new.com" }),
    ).rejects.toThrowError("Website not found");
  });

  it("updates the URL field", async () => {
    const db = getTestDb();
    await seedWebsite(db, "web-1", "https://old.com");

    const result = await updateWebsite(db, "web-1", { url: "https://new.com" });
    expect(result!.url).toBe("https://new.com");
  });

  it("updates humanId to link a human", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Grace", "Hopper");
    await seedWebsite(db, "web-1", "https://grace.dev");

    const result = await updateWebsite(db, "web-1", { humanId: "h-1" });
    expect(result!.humanId).toBe("h-1");
  });

  it("updates accountId to link an account", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Hopper Labs");
    await seedWebsite(db, "web-1", "https://hopper.dev");

    const result = await updateWebsite(db, "web-1", { accountId: "acc-1" });
    expect(result!.accountId).toBe("acc-1");
  });

  it("persists updated values in the database", async () => {
    const db = getTestDb();
    await seedWebsite(db, "web-1", "https://before.com");

    await updateWebsite(db, "web-1", { url: "https://after.com" });

    const rows = await db.select().from(schema.websites);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.url).toBe("https://after.com");
  });

  it("does not affect other websites when updating one", async () => {
    const db = getTestDb();
    await seedWebsite(db, "web-1", "https://one.com");
    await seedWebsite(db, "web-2", "https://two.com");

    await updateWebsite(db, "web-1", { url: "https://updated-one.com" });

    const rows = await db.select().from(schema.websites);
    const two = rows.find((r) => r.id === "web-2");
    expect(two!.url).toBe("https://two.com");
  });
});

// ---------------------------------------------------------------------------
// deleteWebsite
// ---------------------------------------------------------------------------

describe("deleteWebsite", () => {
  it("throws notFound for missing website", async () => {
    const db = getTestDb();
    await expect(deleteWebsite(db, "nonexistent")).rejects.toThrowError("Website not found");
  });

  it("deletes an existing website", async () => {
    const db = getTestDb();
    await seedWebsite(db, "web-1", "https://todelete.com");

    await deleteWebsite(db, "web-1");

    const rows = await db.select().from(schema.websites);
    expect(rows).toHaveLength(0);
  });

  it("deletes only the targeted website, leaving others intact", async () => {
    const db = getTestDb();
    await seedWebsite(db, "web-1", "https://keep.com");
    await seedWebsite(db, "web-2", "https://gone.com");

    await deleteWebsite(db, "web-2");

    const rows = await db.select().from(schema.websites);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("web-1");
  });
});
