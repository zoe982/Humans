import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listHumans,
  getHumanDetail,
  createHuman,
  updateHuman,
  updateHumanStatus,
  deleteHuman,
  linkRouteSignup,
  unlinkRouteSignup,
} from "../../../src/services/humans";
import { AppError } from "../../../src/lib/errors";
import * as schema from "@humans/db/schema";
import { eq } from "drizzle-orm";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;
function nextDisplayId(prefix: string) {
  seedCounter++;
  return `${prefix}-${String(seedCounter).padStart(6, "0")}`;
}

async function seedColleague(db: ReturnType<typeof getTestDb>, id = "col-1") {
  const ts = now();
  await db.insert(schema.colleagues).values({
    id,
    displayId: nextDisplayId("COL"),
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

async function seedHuman(db: ReturnType<typeof getTestDb>, id = "h-1", first = "John", last = "Doe") {
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

describe("listHumans", () => {
  it("returns empty list when no humans", async () => {
    const db = getTestDb();
    const result = await listHumans(db, 1, 25);
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it("returns paginated humans with emails and types", async () => {
    const db = getTestDb();
    const ts = now();

    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    await db.insert(schema.emails).values({
      id: "e-1", displayId: nextDisplayId("EML"), ownerType: "human", ownerId: "h-1", email: "alice@test.com", isPrimary: true, createdAt: ts,
    });
    await db.insert(schema.humanTypes).values({
      id: "t-1", humanId: "h-1", type: "flight_broker", createdAt: ts,
    });

    const result = await listHumans(db, 1, 25);
    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);

    const alice = result.data.find((h) => h.id === "h-1");
    expect(alice?.emails).toHaveLength(1);
    expect(alice?.types).toContain("flight_broker");
  });

  it("respects page and limit", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");
    await seedHuman(db, "h-3");

    const page1 = await listHumans(db, 1, 2);
    expect(page1.data).toHaveLength(2);
    expect(page1.meta.total).toBe(3);

    const page2 = await listHumans(db, 2, 2);
    expect(page2.data).toHaveLength(1);
  });
});

describe("getHumanDetail", () => {
  it("throws notFound for missing human", async () => {
    const db = getTestDb();
    await expect(getHumanDetail(db, "nonexistent")).rejects.toThrowError("Human not found");
  });

  it("returns human with all related data", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Jane", "Doe");

    await db.insert(schema.emails).values({
      id: "e-1", displayId: nextDisplayId("EML"), ownerType: "human", ownerId: "h-1", email: "jane@test.com", isPrimary: true, createdAt: ts,
    });
    await db.insert(schema.humanTypes).values({
      id: "t-1", humanId: "h-1", type: "flight_broker", createdAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "p-1", displayId: nextDisplayId("FON"), ownerType: "human", ownerId: "h-1", phoneNumber: "+1234567890", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    const result = await getHumanDetail(db, "h-1");
    expect(result.firstName).toBe("Jane");
    expect(result.emails).toHaveLength(1);
    expect(result.types).toContain("flight_broker");
    expect(result.phoneNumbers).toHaveLength(1);
    expect(result.linkedRouteSignups).toHaveLength(0);
    expect(result.pets).toHaveLength(0);
    expect(result.geoInterestExpressions).toHaveLength(0);
    expect(result.linkedAccounts).toHaveLength(0);
  });

  it("resolves geo-interest details on expressions", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");
    await seedColleague(db);

    await db.insert(schema.geoInterests).values({ id: "gi-1", displayId: nextDisplayId("GEO"), city: "Paris", country: "France", createdAt: ts });

    await db.insert(schema.activities).values({
      id: "act-1", displayId: nextDisplayId("ACT"), type: "email", subject: "Test", activityDate: ts,
      colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });

    await db.insert(schema.geoInterestExpressions).values({
      id: "expr-1", displayId: nextDisplayId("GEX"), humanId: "h-1", geoInterestId: "gi-1", activityId: "act-1", createdAt: ts,
    });

    const result = await getHumanDetail(db, "h-1");
    expect(result.geoInterestExpressions).toHaveLength(1);
    expect(result.geoInterestExpressions[0]!.city).toBe("Paris");
    expect(result.geoInterestExpressions[0]!.country).toBe("France");
  });

  it("resolves linked accounts with labels", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");

    await db.insert(schema.accounts).values({
      id: "acc-1", displayId: nextDisplayId("ACC"), name: "Acme Corp", status: "open", createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.accountHumanLabelsConfig).values({
      id: "lbl-1", name: "Primary Contact", createdAt: ts,
    });
    await db.insert(schema.accountHumans).values({
      id: "ah-1", accountId: "acc-1", humanId: "h-1", labelId: "lbl-1", createdAt: ts,
    });

    const result = await getHumanDetail(db, "h-1");
    expect(result.linkedAccounts).toHaveLength(1);
    expect(result.linkedAccounts[0]!.accountName).toBe("Acme Corp");
    expect(result.linkedAccounts[0]!.labelName).toBe("Primary Contact");
  });
});

describe("createHuman", () => {
  it("creates human with emails and types", async () => {
    const db = getTestDb();
    const result = await createHuman(db, {
      firstName: "New",
      lastName: "Human",
      emails: [{ email: "new@test.com", isPrimary: true }],
      types: ["flight_broker"],
    });

    expect(result.id).toBeDefined();

    const humanRows = await db.select().from(schema.humans);
    expect(humanRows).toHaveLength(1);
    expect(humanRows[0]!.firstName).toBe("New");

    const emailRows = await db.select().from(schema.emails);
    expect(emailRows).toHaveLength(1);

    const types = await db.select().from(schema.humanTypes);
    expect(types).toHaveLength(1);
    expect(types[0]!.type).toBe("flight_broker");
  });

  it("defaults status to open", async () => {
    const db = getTestDb();
    await createHuman(db, {
      firstName: "Test",
      lastName: "Human",
      emails: [{ email: "t@test.com" }],
      types: [],
    });

    const humanRows = await db.select().from(schema.humans);
    expect(humanRows[0]!.status).toBe("open");
  });

  it("supports custom status", async () => {
    const db = getTestDb();
    await createHuman(db, {
      firstName: "Test",
      lastName: "Human",
      status: "closed",
      emails: [{ email: "t@test.com" }],
      types: [],
    });

    const humanRows = await db.select().from(schema.humans);
    expect(humanRows[0]!.status).toBe("closed");
  });
});

describe("updateHuman", () => {
  it("throws notFound for missing human", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await expect(
      updateHuman(db, "nonexistent", { firstName: "X" }, "col-1"),
    ).rejects.toThrowError("Human not found");
  });

  it("updates scalar fields and creates audit entry", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1", "Old", "Name");

    const result = await updateHuman(db, "h-1", { firstName: "New" }, "col-1");
    expect(result.data?.firstName).toBe("New");
    expect(result.auditEntryId).toBeDefined();

    const auditEntries = await db.select().from(schema.auditLog);
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]!.action).toBe("UPDATE");
  });

  it("replaces emails when provided", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-1");

    await db.insert(schema.emails).values({
      id: "e-1", displayId: nextDisplayId("EML"), ownerType: "human", ownerId: "h-1", email: "old@test.com", isPrimary: true, createdAt: ts,
    });

    await updateHuman(db, "h-1", {
      emails: [{ email: "new@test.com", isPrimary: false }],
    }, "col-1");

    const emailRows = await db.select().from(schema.emails);
    expect(emailRows).toHaveLength(1);
    expect(emailRows[0]!.email).toBe("new@test.com");
  });

  it("replaces types when provided", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-1");

    await db.insert(schema.humanTypes).values({
      id: "t-1", humanId: "h-1", type: "flight_broker", createdAt: ts,
    });

    await updateHuman(db, "h-1", {
      types: ["pet_shipper"],
    }, "col-1");

    const types = await db.select().from(schema.humanTypes);
    expect(types).toHaveLength(1);
    expect(types[0]!.type).toBe("pet_shipper");
  });

  it("skips audit when no changes detected", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1", "John", "Doe");

    const result = await updateHuman(db, "h-1", { firstName: "John" }, "col-1");
    expect(result.auditEntryId).toBeUndefined();
  });
});

describe("updateHumanStatus", () => {
  it("throws notFound for missing human", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await expect(
      updateHumanStatus(db, "nonexistent", "closed", "col-1"),
    ).rejects.toThrowError("Human not found");
  });

  it("updates status and creates audit entry", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1");

    const result = await updateHumanStatus(db, "h-1", "closed", "col-1");
    expect(result.status).toBe("closed");
    expect(result.auditEntryId).toBeDefined();
  });

  it("skips audit when status unchanged", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1");

    const result = await updateHumanStatus(db, "h-1", "open", "col-1");
    expect(result.auditEntryId).toBeUndefined();
  });
});

describe("deleteHuman", () => {
  it("throws notFound for missing human", async () => {
    const db = getTestDb();
    await expect(deleteHuman(db, "nonexistent")).rejects.toThrowError("Human not found");
  });

  it("deletes human and all related records", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");

    await db.insert(schema.emails).values({
      id: "e-1", displayId: nextDisplayId("EML"), ownerType: "human", ownerId: "h-1", email: "test@test.com", isPrimary: true, createdAt: ts,
    });
    await db.insert(schema.humanTypes).values({
      id: "t-1", humanId: "h-1", type: "flight_broker", createdAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "p-1", displayId: nextDisplayId("FON"), ownerType: "human", ownerId: "h-1", phoneNumber: "+1234567890", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    await deleteHuman(db, "h-1");

    expect(await db.select().from(schema.humans)).toHaveLength(0);
    expect(await db.select().from(schema.emails)).toHaveLength(0);
    expect(await db.select().from(schema.humanTypes)).toHaveLength(0);
    expect(await db.select().from(schema.phones)).toHaveLength(0);
  });
});

describe("linkRouteSignup", () => {
  it("throws notFound for missing human", async () => {
    const db = getTestDb();
    await expect(linkRouteSignup(db, "nonexistent", "rs-1")).rejects.toThrowError("Human not found");
  });

  it("creates link between human and route signup", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const link = await linkRouteSignup(db, "h-1", "rs-1");
    expect(link.humanId).toBe("h-1");
    expect(link.routeSignupId).toBe("rs-1");
    expect(link.id).toBeDefined();
    expect(link.linkedAt).toBeDefined();

    const links = await db.select().from(schema.humanRouteSignups);
    expect(links).toHaveLength(1);
  });
});

describe("unlinkRouteSignup", () => {
  it("deletes link", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.humanRouteSignups).values({
      id: "link-1", humanId: "h-1", routeSignupId: "rs-1", linkedAt: ts,
    });

    await unlinkRouteSignup(db, "link-1");
    expect(await db.select().from(schema.humanRouteSignups)).toHaveLength(0);
  });
});
