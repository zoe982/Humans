import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  rematchActivitiesByEmail,
  rematchActivitiesByPhone,
  rematchActivitiesBySocialId,
} from "../../../src/services/activity-rematch";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;

function nextDisplayId(prefix: string) {
  seedCounter++;
  return `${prefix}-AAA-${String(seedCounter).padStart(3, "0")}`;
}

async function seedHuman(db: ReturnType<typeof getTestDb>, id = "h-1") {
  const ts = now();
  await db.insert(schema.humans).values({
    id,
    displayId: nextDisplayId("HUM"),
    firstName: "Test",
    lastName: "Human",
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedActivity(
  db: ReturnType<typeof getTestDb>,
  opts: {
    id: string;
    frontContactHandle: string | null;
    humanId?: string | null;
    type?: schema.ActivityType;
  },
) {
  const ts = now();
  await db.insert(schema.activities).values({
    id: opts.id,
    displayId: nextDisplayId("ACT"),
    type: opts.type ?? "email",
    subject: "Test Subject",
    activityDate: ts,
    frontContactHandle: opts.frontContactHandle,
    humanId: opts.humanId ?? null,
    createdAt: ts,
    updatedAt: ts,
  });
}

// ---------------------------------------------------------------------------
// rematchActivitiesByEmail
// ---------------------------------------------------------------------------

describe("rematchActivitiesByEmail", () => {
  it("returns 0 when no activities exist", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    const count = await rematchActivitiesByEmail(db, "h-1", "test@example.com");
    expect(count).toBe(0);
  });

  it("returns 0 when no unmatched activities exist (all have humanId set)", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "test@example.com",
      humanId: "h-1",
    });
    const count = await rematchActivitiesByEmail(db, "h-1", "test@example.com");
    expect(count).toBe(0);
  });

  it("matches unmatched activity by exact email (case-insensitive)", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "TEST@EXAMPLE.COM",
      humanId: null,
    });

    const count = await rematchActivitiesByEmail(db, "h-1", "test@example.com");
    expect(count).toBe(1);

    const rows = await db.select().from(schema.activities);
    expect(rows[0]!.humanId).toBe("h-1");
  });

  it("nulls out routeSignupId, websiteBookingRequestId, generalLeadId on reparent", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const ts = now();
    await db.insert(schema.activities).values({
      id: "act-1",
      displayId: nextDisplayId("ACT"),
      type: "email",
      subject: "Test",
      activityDate: ts,
      frontContactHandle: "match@example.com",
      humanId: null,
      routeSignupId: "rs-1",
      websiteBookingRequestId: "wbr-1",
      generalLeadId: null,
      createdAt: ts,
      updatedAt: ts,
    });

    await rematchActivitiesByEmail(db, "h-1", "match@example.com");

    const rows = await db.select().from(schema.activities);
    expect(rows[0]!.humanId).toBe("h-1");
    expect(rows[0]!.routeSignupId).toBeNull();
    expect(rows[0]!.websiteBookingRequestId).toBeNull();
  });

  it("does not match activities whose frontContactHandle is a different email", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "other@example.com",
      humanId: null,
    });

    const count = await rematchActivitiesByEmail(db, "h-1", "test@example.com");
    expect(count).toBe(0);

    const rows = await db.select().from(schema.activities);
    expect(rows[0]!.humanId).toBeNull();
  });

  it("returns count of all matched activities when multiple qualify", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, { id: "act-1", frontContactHandle: "user@example.com", humanId: null });
    await seedActivity(db, { id: "act-2", frontContactHandle: "USER@EXAMPLE.COM", humanId: null });
    await seedActivity(db, { id: "act-3", frontContactHandle: "other@example.com", humanId: null });

    const count = await rematchActivitiesByEmail(db, "h-1", "user@example.com");
    expect(count).toBe(2);

    const rows = await db.select().from(schema.activities);
    const matched = rows.filter((r) => r.humanId === "h-1");
    expect(matched).toHaveLength(2);
    expect(matched.map((r) => r.id).sort()).toEqual(["act-1", "act-2"]);
  });

  it("does not reparent already-matched activities even if email matches", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");
    await seedActivity(db, {
      id: "act-already-matched",
      frontContactHandle: "shared@example.com",
      humanId: "h-2",
    });
    await seedActivity(db, {
      id: "act-unmatched",
      frontContactHandle: "shared@example.com",
      humanId: null,
    });

    const count = await rematchActivitiesByEmail(db, "h-1", "shared@example.com");
    expect(count).toBe(1);

    const rows = await db.select().from(schema.activities);
    const alreadyMatched = rows.find((r) => r.id === "act-already-matched");
    expect(alreadyMatched!.humanId).toBe("h-2");
  });
});

// ---------------------------------------------------------------------------
// rematchActivitiesByPhone
// ---------------------------------------------------------------------------

describe("rematchActivitiesByPhone", () => {
  it("returns 0 when no activities exist", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    const count = await rematchActivitiesByPhone(db, "h-1", "+1 555 123 4567");
    expect(count).toBe(0);
  });

  it("returns 0 when phone normalizes to fewer than 9 digits", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "12345678",
      humanId: null,
    });
    // Phone with only 8 digits after normalization — too short
    const count = await rematchActivitiesByPhone(db, "h-1", "12345678");
    expect(count).toBe(0);
  });

  it("matches activity by last-9-digit suffix", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    // Both have the same last 9 digits: 555123456
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "+44 20 5551 23456",
      humanId: null,
    });

    const count = await rematchActivitiesByPhone(db, "h-1", "+1 555 123 456");
    expect(count).toBe(1);

    const rows = await db.select().from(schema.activities);
    expect(rows[0]!.humanId).toBe("h-1");
  });

  it("matches when different country codes share the same local number", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    // handle: 356791234567 -> last 9: 791234567
    // phone:  1791234567   -> last 9: 791234567
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "+356 79 123 4567",
      humanId: null,
    });

    const count = await rematchActivitiesByPhone(db, "h-1", "+1 791 234 567");
    expect(count).toBe(1);
  });

  it("does not match activities whose frontContactHandle is not a phone", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "user@example.com",
      humanId: null,
    });

    const count = await rematchActivitiesByPhone(db, "h-1", "+1 555 123 4567");
    expect(count).toBe(0);
  });

  it("does not match activities where last 9 digits differ", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "+1 555 999 9999",
      humanId: null,
    });

    const count = await rematchActivitiesByPhone(db, "h-1", "+1 555 123 4567");
    expect(count).toBe(0);
  });

  it("does not match already-matched activities", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");
    await seedActivity(db, {
      id: "act-matched",
      frontContactHandle: "+1 555 123 4567",
      humanId: "h-2",
    });

    const count = await rematchActivitiesByPhone(db, "h-1", "+1 555 123 4567");
    expect(count).toBe(0);
  });

  it("returns count of all matched activities", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    // All share last 9 digits: 551234567
    await seedActivity(db, { id: "act-1", frontContactHandle: "+1 5551234567", humanId: null });
    await seedActivity(db, { id: "act-2", frontContactHandle: "+44 5551234567", humanId: null });
    await seedActivity(db, { id: "act-3", frontContactHandle: "+1 9999999999", humanId: null });

    const count = await rematchActivitiesByPhone(db, "h-1", "5551234567");
    expect(count).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// rematchActivitiesBySocialId
// ---------------------------------------------------------------------------

describe("rematchActivitiesBySocialId", () => {
  it("returns 0 when no activities exist", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    const count = await rematchActivitiesBySocialId(db, "h-1", "@johndoe");
    expect(count).toBe(0);
  });

  it("returns 0 for empty handle after stripping @", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    const count = await rematchActivitiesBySocialId(db, "h-1", "@");
    expect(count).toBe(0);
  });

  it("returns 0 for completely empty handle", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    const count = await rematchActivitiesBySocialId(db, "h-1", "");
    expect(count).toBe(0);
  });

  it("matches case-insensitively and strips leading @", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "@JohnDoe",
      humanId: null,
    });

    const count = await rematchActivitiesBySocialId(db, "h-1", "johndoe");
    expect(count).toBe(1);

    const rows = await db.select().from(schema.activities);
    expect(rows[0]!.humanId).toBe("h-1");
  });

  it("matches when search handle has @ prefix and stored handle has @ prefix", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "@myhandle",
      humanId: null,
    });

    const count = await rematchActivitiesBySocialId(db, "h-1", "@myhandle");
    expect(count).toBe(1);
  });

  it("matches when search handle has @ prefix but stored handle does not", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "myhandle",
      humanId: null,
    });

    const count = await rematchActivitiesBySocialId(db, "h-1", "@myhandle");
    expect(count).toBe(1);
  });

  it("matches without @ prefix when stored handle has @", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "@myhandle",
      humanId: null,
    });

    const count = await rematchActivitiesBySocialId(db, "h-1", "myhandle");
    expect(count).toBe(1);
  });

  it("does not match activities with a different handle", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, {
      id: "act-1",
      frontContactHandle: "@otherhandle",
      humanId: null,
    });

    const count = await rematchActivitiesBySocialId(db, "h-1", "@myhandle");
    expect(count).toBe(0);
  });

  it("does not match already-matched activities", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");
    await seedActivity(db, {
      id: "act-matched",
      frontContactHandle: "@commonhandle",
      humanId: "h-2",
    });

    const count = await rematchActivitiesBySocialId(db, "h-1", "@commonhandle");
    expect(count).toBe(0);

    const rows = await db.select().from(schema.activities);
    expect(rows[0]!.humanId).toBe("h-2");
  });

  it("returns count of all matched activities and nulls out lead IDs", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedActivity(db, { id: "act-1", frontContactHandle: "@HANDLE", humanId: null });
    await seedActivity(db, { id: "act-2", frontContactHandle: "handle", humanId: null });
    await seedActivity(db, { id: "act-3", frontContactHandle: "@other", humanId: null });

    const count = await rematchActivitiesBySocialId(db, "h-1", "@handle");
    expect(count).toBe(2);

    const rows = await db.select().from(schema.activities);
    const matched = rows.filter((r) => r.humanId === "h-1");
    expect(matched).toHaveLength(2);
    expect(matched.map((r) => r.id).sort()).toEqual(["act-1", "act-2"]);
  });
});
