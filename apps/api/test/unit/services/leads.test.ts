import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listLeadSources,
  createLeadSource,
  listLeadEvents,
  createLeadEvent,
} from "../../../src/services/leads";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;

async function seedColleague(db: ReturnType<typeof getTestDb>, id = "col-1") {
  seedCounter++;
  const ts = now();
  await db.insert(schema.colleagues).values({
    id,
    displayId: `COL-${String(seedCounter).padStart(6, "0")}`,
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

async function seedHuman(db: ReturnType<typeof getTestDb>, id = "h-1") {
  seedCounter++;
  const ts = now();
  await db.insert(schema.humans).values({
    id,
    displayId: `HUM-${String(seedCounter).padStart(6, "0")}`,
    firstName: "Human",
    lastName: "One",
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedLeadSource(
  db: ReturnType<typeof getTestDb>,
  id = "ls-1",
  name = "Website",
) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.leadSources).values({
    id,
    displayId: `LES-${String(seedCounter).padStart(6, "0")}`,
    name,
    category: "online",
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedLeadEvent(
  db: ReturnType<typeof getTestDb>,
  id = "le-1",
  humanId = "h-1",
) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.leadEvents).values({
    id,
    displayId: `LED-${String(seedCounter).padStart(6, "0")}`,
    humanId,
    eventType: "inquiry",
    notes: "Initial inquiry",
    createdAt: ts,
  });
  return id;
}

describe("listLeadSources", () => {
  it("returns empty list when no sources", async () => {
    const db = getTestDb();
    const result = await listLeadSources(db);
    expect(result).toHaveLength(0);
  });

  it("returns all lead sources", async () => {
    const db = getTestDb();
    await seedLeadSource(db, "ls-1", "Website");
    await seedLeadSource(db, "ls-2", "Referral");

    const result = await listLeadSources(db);
    expect(result).toHaveLength(2);
  });
});

describe("createLeadSource", () => {
  it("creates a lead source", async () => {
    const db = getTestDb();

    const result = await createLeadSource(db, {
      name: "Social Media",
      category: "online",
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("Social Media");
    expect(result.isActive).toBe(true);

    const rows = await db.select().from(schema.leadSources);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("Social Media");
  });
});

describe("listLeadEvents", () => {
  it("returns all lead events when no humanId filter", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");
    await seedLeadEvent(db, "le-1", "h-1");
    await seedLeadEvent(db, "le-2", "h-2");

    const result = await listLeadEvents(db);
    expect(result).toHaveLength(2);
  });

  it("filters lead events by humanId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");
    await seedLeadEvent(db, "le-1", "h-1");
    await seedLeadEvent(db, "le-2", "h-2");

    const result = await listLeadEvents(db, "h-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.humanId).toBe("h-1");
  });

  it("returns empty list for unknown humanId", async () => {
    const db = getTestDb();
    const result = await listLeadEvents(db, "h-nonexistent");
    expect(result).toHaveLength(0);
  });
});

describe("createLeadEvent", () => {
  it("creates a lead event without colleagueId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createLeadEvent(db, {
      humanId: "h-1",
      eventType: "inquiry",
      notes: "Asked about pricing",
    });

    expect(result.id).toBeDefined();
    expect(result.humanId).toBe("h-1");
    expect(result.notes).toBe("Asked about pricing");
    expect(result.colleagueId).toBeNull();

    const rows = await db.select().from(schema.leadEvents);
    expect(rows).toHaveLength(1);
  });

  it("creates a lead event with colleagueId", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedHuman(db, "h-1");

    const result = await createLeadEvent(
      db,
      {
        humanId: "h-1",
        eventType: "follow_up",
        notes: "Followed up via phone",
      },
      "col-1",
    );

    expect(result.colleagueId).toBe("col-1");
  });

  it("defaults notes and metadata to null when not provided", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await createLeadEvent(db, {
      humanId: "h-1",
      eventType: "inquiry",
    });

    expect(result.notes).toBeNull();
    expect(result.metadata).toBeNull();
  });
});
