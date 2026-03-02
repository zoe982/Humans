import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  getNextAction,
  updateNextAction,
  completeNextAction,
} from "../../../src/services/entity-next-actions";
import * as schema from "@humans/db/schema";
import { eq, and } from "drizzle-orm";

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
    email: `col${seedCounter}@test.com`,
    firstName: "Test",
    lastName: "User",
    name: "Test User",
    role: "admin",
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  });
}

async function seedNextAction(
  db: ReturnType<typeof getTestDb>,
  overrides: Partial<typeof schema.entityNextActions.$inferInsert> = {},
) {
  seedCounter++;
  const ts = now();
  const id = overrides.id ?? `ena-${seedCounter}`;
  await db.insert(schema.entityNextActions).values({
    id,
    entityType: "general_lead",
    entityId: "gl-1",
    ownerId: "col-1",
    description: "Follow up",
    type: "call",
    dueDate: "2025-01-15",
    startDate: ts,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  });
  return id;
}

describe("getNextAction", () => {
  it("returns the matching action by entityType and entityId", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    const id = await seedNextAction(db, {
      entityType: "general_lead",
      entityId: "gl-1",
      description: "Call them back",
    });

    const result = await getNextAction(db, "general_lead", "gl-1");

    expect(result).toBeDefined();
    expect(result?.id).toBe(id);
    expect(result?.entityType).toBe("general_lead");
    expect(result?.entityId).toBe("gl-1");
    expect(result?.description).toBe("Call them back");
  });

  it("returns undefined when no matching action exists", async () => {
    const db = getTestDb();

    const result = await getNextAction(db, "general_lead", "nonexistent-entity");

    expect(result).toBeUndefined();
  });

  it("returns undefined when entityType does not match", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedNextAction(db, {
      entityType: "general_lead",
      entityId: "gl-1",
    });

    const result = await getNextAction(db, "route_signup", "gl-1");

    expect(result).toBeUndefined();
  });
});

describe("updateNextAction", () => {
  it("creates a new action when none exists and logs a CREATE audit entry", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const result = await updateNextAction(
      db,
      "general_lead",
      "gl-new",
      {
        ownerId: "col-1",
        description: "Initial follow up",
        type: "email",
        dueDate: "2025-02-01",
        cadenceNote: "Weekly",
      },
      "col-1",
    );

    expect(result).toBeDefined();
    expect(result?.entityType).toBe("general_lead");
    expect(result?.entityId).toBe("gl-new");
    expect(result?.description).toBe("Initial follow up");
    expect(result?.type).toBe("email");
    expect(result?.dueDate).toBe("2025-02-01");
    expect(result?.cadenceNote).toBe("Weekly");

    const auditEntries = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.entityType, "general_lead"),
          eq(schema.auditLog.entityId, "gl-new"),
          eq(schema.auditLog.action, "CREATE"),
        ),
      );
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.colleagueId).toBe("col-1");
    expect(auditEntries[0]?.changes).toMatchObject({
      description: { old: null, new: "Initial follow up" },
    });
  });

  it("updates an existing action when values differ and logs an UPDATE audit entry", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedNextAction(db, {
      entityType: "general_lead",
      entityId: "gl-upd",
      description: "Old description",
      type: "call",
      dueDate: "2025-01-10",
      cadenceNote: null,
    });

    const result = await updateNextAction(
      db,
      "general_lead",
      "gl-upd",
      {
        ownerId: "col-1",
        description: "New description",
        type: "meeting",
        dueDate: "2025-03-01",
        cadenceNote: null,
      },
      "col-1",
    );

    expect(result).toBeDefined();
    expect(result?.description).toBe("New description");
    expect(result?.type).toBe("meeting");
    expect(result?.dueDate).toBe("2025-03-01");

    const auditEntries = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.entityType, "general_lead"),
          eq(schema.auditLog.entityId, "gl-upd"),
          eq(schema.auditLog.action, "UPDATE"),
        ),
      );
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.colleagueId).toBe("col-1");
    const changes = auditEntries[0]?.changes as Record<string, { old: unknown; new: unknown }>;
    expect(changes["description"]).toMatchObject({ old: "Old description", new: "New description" });
    expect(changes["type"]).toMatchObject({ old: "call", new: "meeting" });
    expect(changes["dueDate"]).toMatchObject({ old: "2025-01-10", new: "2025-03-01" });
  });

  it("does not log an audit entry when values are identical", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedNextAction(db, {
      entityType: "general_lead",
      entityId: "gl-same",
      description: "Same description",
      type: "call",
      dueDate: "2025-01-15",
      cadenceNote: null,
    });

    await updateNextAction(
      db,
      "general_lead",
      "gl-same",
      {
        ownerId: "col-1",
        description: "Same description",
        type: "call",
        dueDate: "2025-01-15",
        cadenceNote: undefined,
      },
      "col-1",
    );

    const auditEntries = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.entityType, "general_lead"),
          eq(schema.auditLog.entityId, "gl-same"),
        ),
      );
    expect(auditEntries).toHaveLength(0);
  });

  it("stores null for cadenceNote when undefined is passed", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const result = await updateNextAction(
      db,
      "general_lead",
      "gl-cadence",
      {
        ownerId: "col-1",
        description: "Check in",
        type: "call",
        dueDate: "2025-04-01",
        cadenceNote: undefined,
      },
      "col-1",
    );

    expect(result).toBeDefined();
    expect(result?.cadenceNote).toBeNull();
  });

  it("stores the provided cadenceNote string when given", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    const result = await updateNextAction(
      db,
      "route_signup",
      "rs-1",
      {
        ownerId: "col-1",
        description: "Send update",
        type: "email",
        dueDate: "2025-05-01",
        cadenceNote: "Bi-weekly",
      },
      "col-1",
    );

    expect(result).toBeDefined();
    expect(result?.cadenceNote).toBe("Bi-weekly");
  });
});

describe("completeNextAction", () => {
  it("deletes the action and creates a NEXT_ACTION_DONE audit entry when description is non-null", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedNextAction(db, {
      entityType: "general_lead",
      entityId: "gl-done",
      description: "Close the deal",
    });

    await completeNextAction(db, "general_lead", "gl-done", "col-1");

    const remaining = await db
      .select()
      .from(schema.entityNextActions)
      .where(
        and(
          eq(schema.entityNextActions.entityType, "general_lead"),
          eq(schema.entityNextActions.entityId, "gl-done"),
        ),
      );
    expect(remaining).toHaveLength(0);

    const auditEntries = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.entityType, "general_lead"),
          eq(schema.auditLog.entityId, "gl-done"),
          eq(schema.auditLog.action, "NEXT_ACTION_DONE"),
        ),
      );
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.colleagueId).toBe("col-1");
    expect(auditEntries[0]?.changes).toMatchObject({
      description: { old: "Close the deal", new: null },
    });
  });

  it("returns early without deleting or auditing when no existing action is found", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");

    await expect(
      completeNextAction(db, "general_lead", "gl-missing", "col-1"),
    ).resolves.toBeUndefined();

    const auditEntries = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.entityType, "general_lead"),
          eq(schema.auditLog.entityId, "gl-missing"),
        ),
      );
    expect(auditEntries).toHaveLength(0);
  });

  it("returns early without deleting or auditing when the existing action has a null description", async () => {
    const db = getTestDb();
    await seedColleague(db, "col-1");
    await seedNextAction(db, {
      entityType: "general_lead",
      entityId: "gl-nulldesc",
      description: null,
    });

    await expect(
      completeNextAction(db, "general_lead", "gl-nulldesc", "col-1"),
    ).resolves.toBeUndefined();

    const remaining = await db
      .select()
      .from(schema.entityNextActions)
      .where(
        and(
          eq(schema.entityNextActions.entityType, "general_lead"),
          eq(schema.entityNextActions.entityId, "gl-nulldesc"),
        ),
      );
    expect(remaining).toHaveLength(1);

    const auditEntries = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.entityType, "general_lead"),
          eq(schema.auditLog.entityId, "gl-nulldesc"),
        ),
      );
    expect(auditEntries).toHaveLength(0);
  });
});
