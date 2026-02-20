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

async function seedColleague(db: ReturnType<typeof getTestDb>, id = "col-1") {
  const ts = now();
  await db.insert(schema.colleagues).values({
    id,
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

async function seedClient(db: ReturnType<typeof getTestDb>, id = "cl-1") {
  const ts = now();
  await db.insert(schema.clients).values({
    id,
    firstName: "Client",
    lastName: "One",
    email: "client@test.com",
    status: "active",
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
  const ts = now();
  await db.insert(schema.leadSources).values({
    id,
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
  clientId = "cl-1",
) {
  const ts = now();
  await db.insert(schema.leadEvents).values({
    id,
    clientId,
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
  it("returns all lead events when no clientId filter", async () => {
    const db = getTestDb();
    await seedClient(db, "cl-1");
    await seedClient(db, "cl-2");
    await seedLeadEvent(db, "le-1", "cl-1");
    await seedLeadEvent(db, "le-2", "cl-2");

    const result = await listLeadEvents(db);
    expect(result).toHaveLength(2);
  });

  it("filters lead events by clientId", async () => {
    const db = getTestDb();
    await seedClient(db, "cl-1");
    await seedClient(db, "cl-2");
    await seedLeadEvent(db, "le-1", "cl-1");
    await seedLeadEvent(db, "le-2", "cl-2");

    const result = await listLeadEvents(db, "cl-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.clientId).toBe("cl-1");
  });

  it("returns empty list for unknown clientId", async () => {
    const db = getTestDb();
    const result = await listLeadEvents(db, "cl-nonexistent");
    expect(result).toHaveLength(0);
  });
});

describe("createLeadEvent", () => {
  it("creates a lead event without colleagueId", async () => {
    const db = getTestDb();
    await seedClient(db, "cl-1");

    const result = await createLeadEvent(db, {
      clientId: "cl-1",
      eventType: "inquiry",
      notes: "Asked about pricing",
    });

    expect(result.id).toBeDefined();
    expect(result.clientId).toBe("cl-1");
    expect(result.notes).toBe("Asked about pricing");
    expect(result.createdByColleagueId).toBeNull();

    const rows = await db.select().from(schema.leadEvents);
    expect(rows).toHaveLength(1);
  });

  it("creates a lead event with colleagueId", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedClient(db, "cl-1");

    const result = await createLeadEvent(
      db,
      {
        clientId: "cl-1",
        eventType: "follow_up",
        notes: "Followed up via phone",
      },
      "col-1",
    );

    expect(result.createdByColleagueId).toBe("col-1");
  });

  it("defaults notes and metadata to null when not provided", async () => {
    const db = getTestDb();
    await seedClient(db, "cl-1");

    const result = await createLeadEvent(db, {
      clientId: "cl-1",
      eventType: "inquiry",
    });

    expect(result.notes).toBeNull();
    expect(result.metadata).toBeNull();
  });
});
