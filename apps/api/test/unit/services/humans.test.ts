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
  linkWebsiteBookingRequest,
  unlinkWebsiteBookingRequest,
  getLinkedHumansForBookingRequest,
  getHumanRelationships,
  createHumanRelationship,
  deleteHumanRelationship,
  getLinkedHumanForRouteSignup,
  updateHumanRelationship,
} from "../../../src/services/humans";
import { AppError } from "../../../src/lib/errors";
import * as schema from "@humans/db/schema";
import { eq, sql } from "drizzle-orm";

function mockSupabase() {
  const chain: Record<string, unknown> = {};
  chain["from"] = () => chain;
  chain["select"] = () => chain;
  chain["eq"] = () => Promise.resolve({ data: [], error: null });
  chain["in"] = () => Promise.resolve({ data: [], error: null });
  chain["delete"] = () => chain;
  chain["update"] = () => chain;
  chain["single"] = () => Promise.resolve({ data: null, error: null });
  return chain as any;
}

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
      id: "e-1", displayId: nextDisplayId("EML"), humanId: "h-1", email: "alice@test.com", isPrimary: true, createdAt: ts,
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
    await expect(getHumanDetail(mockSupabase(), db, "nonexistent")).rejects.toThrowError("Human not found");
  });

  it("returns human with all related data", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Jane", "Doe");

    await db.insert(schema.emails).values({
      id: "e-1", displayId: nextDisplayId("EML"), humanId: "h-1", email: "jane@test.com", isPrimary: true, createdAt: ts,
    });
    await db.insert(schema.humanTypes).values({
      id: "t-1", humanId: "h-1", type: "flight_broker", createdAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "p-1", displayId: nextDisplayId("FON"), humanId: "h-1", phoneNumber: "+1234567890", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    const result = await getHumanDetail(mockSupabase(), db, "h-1");
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

    const result = await getHumanDetail(mockSupabase(), db, "h-1");
    expect(result.geoInterestExpressions).toHaveLength(1);
    expect(result.geoInterestExpressions[0]!.city).toBe("Paris");
    expect(result.geoInterestExpressions[0]!.country).toBe("France");
  });

  it("resolves route-interest expressions with origin and destination data", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");
    await seedColleague(db);

    await db.insert(schema.routeInterests).values({
      id: "ri-1", displayId: nextDisplayId("ROI"),
      originCity: "NYC", originCountry: "US",
      destinationCity: "London", destinationCountry: "UK",
      createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-1", displayId: nextDisplayId("REX"),
      humanId: "h-1", routeInterestId: "ri-1",
      frequency: "one_time", createdAt: ts,
    });

    const result = await getHumanDetail(mockSupabase(), db, "h-1");
    expect(result.routeInterestExpressions).toHaveLength(1);
    expect(result.routeInterestExpressions[0]!.originCity).toBe("NYC");
    expect(result.routeInterestExpressions[0]!.destinationCity).toBe("London");
  });

  it("includes social IDs with platform names", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");

    await db.insert(schema.socialIdPlatformsConfig).values({
      id: "plat-1", name: "Instagram", createdAt: ts,
    });
    await db.insert(schema.socialIds).values({
      id: "soc-1", displayId: nextDisplayId("SOC"),
      handle: "@humantest", platformId: "plat-1", humanId: "h-1",
      createdAt: ts,
    });

    const result = await getHumanDetail(mockSupabase(), db, "h-1");
    expect(result.socialIds).toHaveLength(1);
    expect(result.socialIds[0]!.handle).toBe("@humantest");
    expect(result.socialIds[0]!.platformName).toBe("Instagram");
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

    const result = await getHumanDetail(mockSupabase(), db, "h-1");
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

describe("createHuman — duplicate name", () => {
  it("blocks exact-case duplicate", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");

    await expect(
      createHuman(db, { firstName: "John", lastName: "Doe", emails: [{ email: "j@test.com" }], types: [] }),
    ).rejects.toThrowError(/already exists/);
  });

  it("blocks case-insensitive duplicate", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");

    await expect(
      createHuman(db, { firstName: "john", lastName: "doe", emails: [{ email: "j@test.com" }], types: [] }),
    ).rejects.toThrowError(/already exists/);
  });

  it("allows when only first OR last name matches", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "John", "Doe");

    const result = await createHuman(db, { firstName: "John", lastName: "Smith", emails: [{ email: "j@test.com" }], types: [] });
    expect(result.id).toBeDefined();
  });
});

describe("updateHuman — duplicate name", () => {
  it("blocks rename that creates duplicate", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1", "John", "Doe");
    await seedHuman(db, "h-2", "Jane", "Smith");

    await expect(
      updateHuman(db, "h-2", { firstName: "John", lastName: "Doe" }, "col-1"),
    ).rejects.toThrowError(/already exists/);
  });

  it("allows keeping own name (self-exclusion)", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1", "John", "Doe");

    const result = await updateHuman(db, "h-1", { firstName: "John" }, "col-1");
    expect(result.data?.firstName).toBe("John");
  });

  it("blocks changing only lastName to match", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1", "John", "Doe");
    await seedHuman(db, "h-2", "John", "Smith");

    await expect(
      updateHuman(db, "h-2", { lastName: "Doe" }, "col-1"),
    ).rejects.toThrowError(/already exists/);
  });

  it("blocks case-insensitive duplicate on update", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1", "John", "Doe");
    await seedHuman(db, "h-2", "Jane", "Smith");

    await expect(
      updateHuman(db, "h-2", { firstName: "JOHN", lastName: "DOE" }, "col-1"),
    ).rejects.toThrowError(/already exists/);
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
      id: "e-1", displayId: nextDisplayId("EML"), humanId: "h-1", email: "old@test.com", isPrimary: true, createdAt: ts,
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
      types: ["trainer"],
    }, "col-1");

    const types = await db.select().from(schema.humanTypes);
    expect(types).toHaveLength(1);
    expect(types[0]!.type).toBe("trainer");
  });

  it("updates middleName and lastName", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1", "Maria", "Garcia");

    const result = await updateHuman(db, "h-1", {
      middleName: "Elena",
      lastName: "Lopez",
    }, "col-1");

    expect(result.data?.lastName).toBe("Lopez");
    expect(result.auditEntryId).toBeDefined();
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
    await expect(deleteHuman(mockSupabase(), db, "nonexistent")).rejects.toThrowError("Human not found");
  });

  it("deletes human and all related records", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");

    await db.insert(schema.emails).values({
      id: "e-1", displayId: nextDisplayId("EML"), humanId: "h-1", email: "test@test.com", isPrimary: true, createdAt: ts,
    });
    await db.insert(schema.humanTypes).values({
      id: "t-1", humanId: "h-1", type: "flight_broker", createdAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "p-1", displayId: nextDisplayId("FON"), humanId: "h-1", phoneNumber: "+1234567890", hasWhatsapp: false, isPrimary: true, createdAt: ts,
    });

    await deleteHuman(mockSupabase(), db, "h-1");

    expect(await db.select().from(schema.humans)).toHaveLength(0);
    expect((await db.select().from(schema.emails))[0]!.humanId).toBeNull();
    expect(await db.select().from(schema.humanTypes)).toHaveLength(0);
    expect((await db.select().from(schema.phones))[0]!.humanId).toBeNull();
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

describe("linkWebsiteBookingRequest", () => {
  it("throws notFound for missing human", async () => {
    const db = getTestDb();
    await expect(
      linkWebsiteBookingRequest(db, "nonexistent", "wbr-1"),
    ).rejects.toThrowError("Human not found");
  });

  it("creates link between human and website booking request", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const link = await linkWebsiteBookingRequest(db, "h-1", "wbr-1");
    expect(link.humanId).toBe("h-1");
    expect(link.websiteBookingRequestId).toBe("wbr-1");
    expect(link.id).toBeDefined();
    expect(link.linkedAt).toBeDefined();

    const links = await db.select().from(schema.humanWebsiteBookingRequests);
    expect(links).toHaveLength(1);
    expect(links[0]!.humanId).toBe("h-1");
    expect(links[0]!.websiteBookingRequestId).toBe("wbr-1");
  });

  it("can link multiple booking requests to the same human", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    await linkWebsiteBookingRequest(db, "h-1", "wbr-1");
    await linkWebsiteBookingRequest(db, "h-1", "wbr-2");

    const links = await db.select().from(schema.humanWebsiteBookingRequests);
    expect(links).toHaveLength(2);
  });
});

describe("unlinkWebsiteBookingRequest", () => {
  it("deletes the booking request link", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    const ts = now();

    await db.insert(schema.humanWebsiteBookingRequests).values({
      id: "link-1", humanId: "h-1", websiteBookingRequestId: "wbr-1", linkedAt: ts,
    });

    await unlinkWebsiteBookingRequest(db, "link-1");
    expect(await db.select().from(schema.humanWebsiteBookingRequests)).toHaveLength(0);
  });

  it("does nothing when link does not exist (no-op delete)", async () => {
    const db = getTestDb();
    await unlinkWebsiteBookingRequest(db, "nonexistent");
    expect(await db.select().from(schema.humanWebsiteBookingRequests)).toHaveLength(0);
  });
});

describe("getHumanRelationships", () => {
  it("returns empty array when human has no relationships", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");

    const result = await getHumanRelationships(db, "h-1");
    expect(result).toHaveLength(0);
  });

  it("returns relationships where human is humanId1", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    await db.insert(schema.humanRelationships).values({
      id: "rel-1",
      displayId: nextDisplayId("REL"),
      humanId1: "h-1",
      humanId2: "h-2",
      labelId: null,
      createdAt: ts,
    });

    const result = await getHumanRelationships(db, "h-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.otherHumanId).toBe("h-2");
    expect(result[0]!.otherHumanName).toBe("Bob Jones");
  });

  it("returns relationships where human is humanId2", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    await db.insert(schema.humanRelationships).values({
      id: "rel-1",
      displayId: nextDisplayId("REL"),
      humanId1: "h-1",
      humanId2: "h-2",
      labelId: null,
      createdAt: ts,
    });

    // Queried from h-2's perspective
    const result = await getHumanRelationships(db, "h-2");
    expect(result).toHaveLength(1);
    expect(result[0]!.otherHumanId).toBe("h-1");
    expect(result[0]!.otherHumanName).toBe("Alice Smith");
  });

  it("resolves labelName when a label is set", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    await db.insert(schema.humanRelationshipLabelsConfig).values({
      id: "lbl-1", name: "Spouse", createdAt: ts,
    });
    await db.insert(schema.humanRelationships).values({
      id: "rel-1",
      displayId: nextDisplayId("REL"),
      humanId1: "h-1",
      humanId2: "h-2",
      labelId: "lbl-1",
      createdAt: ts,
    });

    const result = await getHumanRelationships(db, "h-1");
    expect(result[0]!.labelId).toBe("lbl-1");
    expect(result[0]!.labelName).toBe("Spouse");
  });

  it("sets labelName to null when no label is set", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    await db.insert(schema.humanRelationships).values({
      id: "rel-1",
      displayId: nextDisplayId("REL"),
      humanId1: "h-1",
      humanId2: "h-2",
      labelId: null,
      createdAt: ts,
    });

    const result = await getHumanRelationships(db, "h-1");
    expect(result[0]!.labelId).toBeNull();
    expect(result[0]!.labelName).toBeNull();
  });

  it("includes displayId and otherHumanDisplayId in returned rows", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    await db.insert(schema.humanRelationships).values({
      id: "rel-1",
      displayId: "REL-AAA-001",
      humanId1: "h-1",
      humanId2: "h-2",
      labelId: null,
      createdAt: ts,
    });

    const result = await getHumanRelationships(db, "h-1");
    expect(result[0]!.displayId).toBe("REL-AAA-001");
    expect(result[0]!.otherHumanDisplayId).toMatch(/^HUM-/);
  });
});

describe("createHumanRelationship", () => {
  it("creates a new relationship between two humans", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");

    const result = await createHumanRelationship(db, "h-1", "h-2");
    expect(result.id).toBeDefined();
    expect(result.displayId).toMatch(/^REL-/);

    const rows = await db.select().from(schema.humanRelationships);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.humanId1).toBe("h-1");
    expect(rows[0]!.humanId2).toBe("h-2");
  });

  it("creates relationship with a label", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");

    await db.insert(schema.humanRelationshipLabelsConfig).values({
      id: "lbl-1", name: "Friend", createdAt: ts,
    });

    await createHumanRelationship(db, "h-1", "h-2", "lbl-1");

    const rows = await db.select().from(schema.humanRelationships);
    expect(rows[0]!.labelId).toBe("lbl-1");
  });

  it("creates relationship with no label (null)", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");

    await createHumanRelationship(db, "h-1", "h-2");

    const rows = await db.select().from(schema.humanRelationships);
    expect(rows[0]!.labelId).toBeNull();
  });

  it("throws conflict when the relationship already exists (same direction)", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");

    await db.insert(schema.humanRelationships).values({
      id: "rel-1",
      displayId: nextDisplayId("REL"),
      humanId1: "h-1",
      humanId2: "h-2",
      labelId: null,
      createdAt: ts,
    });

    await expect(
      createHumanRelationship(db, "h-1", "h-2"),
    ).rejects.toThrowError("already exists");
  });

  it("throws conflict when the relationship already exists (reverse direction)", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");

    await db.insert(schema.humanRelationships).values({
      id: "rel-1",
      displayId: nextDisplayId("REL"),
      humanId1: "h-2",
      humanId2: "h-1",
      labelId: null,
      createdAt: ts,
    });

    await expect(
      createHumanRelationship(db, "h-1", "h-2"),
    ).rejects.toThrowError("already exists");
  });
});

describe("deleteHumanRelationship", () => {
  it("deletes an existing relationship", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");
    await seedHuman(db, "h-2");

    await db.insert(schema.humanRelationships).values({
      id: "rel-1",
      displayId: nextDisplayId("REL"),
      humanId1: "h-1",
      humanId2: "h-2",
      labelId: null,
      createdAt: ts,
    });

    await deleteHumanRelationship(db, "rel-1");

    expect(await db.select().from(schema.humanRelationships)).toHaveLength(0);
  });

  it("does nothing when relationship does not exist (no-op delete)", async () => {
    const db = getTestDb();
    await deleteHumanRelationship(db, "nonexistent");
    expect(await db.select().from(schema.humanRelationships)).toHaveLength(0);
  });
});

describe("getLinkedHumansForBookingRequest", () => {
  it("returns empty array when no humans are linked", async () => {
    const db = getTestDb();
    const result = await getLinkedHumansForBookingRequest(db, "wbr-1");
    expect(result).toHaveLength(0);
  });

  it("returns linked human with correct fields", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Alice", "Smith");

    await db.insert(schema.humanWebsiteBookingRequests).values({
      id: "link-1",
      humanId: "h-1",
      websiteBookingRequestId: "wbr-1",
      linkedAt: ts,
    });

    const result = await getLinkedHumansForBookingRequest(db, "wbr-1");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "link-1",
      humanId: "h-1",
      humanFirstName: "Alice",
      humanLastName: "Smith",
      linkedAt: ts,
    });
    expect(result[0]!.humanDisplayId).toMatch(/^HUM-/);
  });

  it("does not return links for other booking requests", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");

    await db.insert(schema.humanWebsiteBookingRequests).values({
      id: "link-1",
      humanId: "h-1",
      websiteBookingRequestId: "wbr-other",
      linkedAt: ts,
    });

    const result = await getLinkedHumansForBookingRequest(db, "wbr-1");
    expect(result).toHaveLength(0);
  });

  it("includes opportunityId in response", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await db.insert(schema.opportunities).values({
      id: "opp-123",
      displayId: "OPP-AAA-001",
      stage: "open",
      seatsRequested: 1,
      passengerSeats: 1,
      petSeats: 0,
      createdAt: ts,
      updatedAt: ts,
    });

    await db.insert(schema.humanWebsiteBookingRequests).values({
      id: "link-1",
      humanId: "h-1",
      websiteBookingRequestId: "wbr-1",
      opportunityId: "opp-123",
      linkedAt: ts,
    });

    const result = await getLinkedHumansForBookingRequest(db, "wbr-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.opportunityId).toBe("opp-123");
  });

  it("returns null opportunityId when no opportunity is linked", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1");

    await db.insert(schema.humanWebsiteBookingRequests).values({
      id: "link-1",
      humanId: "h-1",
      websiteBookingRequestId: "wbr-1",
      linkedAt: ts,
    });

    const result = await getLinkedHumansForBookingRequest(db, "wbr-1");
    expect(result[0]!.opportunityId).toBeNull();
  });
});

describe("getLinkedHumanForRouteSignup", () => {
  it("returns linked human when a link exists", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Carol", "Williams");

    await db.insert(schema.humanRouteSignups).values({
      id: "link-1",
      humanId: "h-1",
      routeSignupId: "rs-1",
      linkedAt: ts,
    });

    const result = await getLinkedHumanForRouteSignup(db, "rs-1");
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: "link-1",
      humanId: "h-1",
      humanFirstName: "Carol",
      humanLastName: "Williams",
      linkedAt: ts,
    });
    expect(result!.humanDisplayId).toMatch(/^HUM-/);
  });

  it("returns null when no link exists for the route signup", async () => {
    const db = getTestDb();
    const result = await getLinkedHumanForRouteSignup(db, "rs-nonexistent");
    expect(result).toBeNull();
  });
});

// ─── Branch coverage: toHumanStatus invalid input ─────────────────────────

describe("createHuman — toHumanStatus invalid fallback", () => {
  it("defaults status to open when an unrecognized status is provided", async () => {
    const db = getTestDb();
    await createHuman(db, {
      firstName: "Branch",
      lastName: "Status",
      status: "totally_invalid",
      emails: [{ email: "branch@test.com" }],
      types: [],
    });

    const humanRows = await db.select().from(schema.humans);
    expect(humanRows).toHaveLength(1);
    expect(humanRows[0]!.status).toBe("open");
  });
});

// ─── Branch coverage: toHumanType invalid input ────────────────────────────

describe("createHuman — toHumanType invalid fallback", () => {
  it("defaults type to client when an unrecognized type value is provided", async () => {
    const db = getTestDb();
    await createHuman(db, {
      firstName: "Type",
      lastName: "Fallback",
      emails: [{ email: "typefallback@test.com" }],
      types: ["invalid_type_value"],
    });

    const types = await db.select().from(schema.humanTypes);
    expect(types).toHaveLength(1);
    expect(types[0]!.type).toBe("client");
  });
});

// ─── Branch coverage: listHumans with search parameter ────────────────────

describe("listHumans — with search filter", () => {
  it("returns only humans whose name or displayId match the search term", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Wonderland");
    await seedHuman(db, "h-2", "Bob", "Builder");

    const result = await listHumans(db, 1, 25, "Alice");
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe("h-1");
  });

  it("returns empty results when search term matches nothing", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Wonderland");

    const result = await listHumans(db, 1, 25, "Zzyzx");
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});

// ─── Branch coverage: updateHumanStatus same status → no audit ────────────

describe("updateHumanStatus — same status produces no audit entry", () => {
  it("returns auditEntryId undefined when new status equals old status", async () => {
    const db = getTestDb();
    await seedColleague(db);
    await seedHuman(db, "h-1");

    const result = await updateHumanStatus(db, "h-1", "open", "col-1");
    expect(result.id).toBe("h-1");
    expect(result.status).toBe("open");
    expect(result.auditEntryId).toBeUndefined();

    const auditEntries = await db.select().from(schema.auditLog);
    expect(auditEntries).toHaveLength(0);
  });
});

// ─── Branch coverage: unlinkRouteSignup with nonexistent link id ──────────

describe("unlinkRouteSignup — nonexistent link id", () => {
  it("completes without error when the link id does not exist", async () => {
    const db = getTestDb();
    await expect(unlinkRouteSignup(db, "nonexistent-link-id")).resolves.toBeUndefined();

    const links = await db.select().from(schema.humanRouteSignups);
    expect(links).toHaveLength(0);
  });
});

// ─── Branch coverage: createHuman emails with no labelId ──────────────────

describe("createHuman — email with no labelId", () => {
  it("stores null labelId when email is provided without a labelId field", async () => {
    const db = getTestDb();
    await createHuman(db, {
      firstName: "Label",
      lastName: "Absent",
      emails: [{ email: "nolabel@test.com" }],
      types: [],
    });

    const emailRows = await db.select().from(schema.emails);
    expect(emailRows).toHaveLength(1);
    expect(emailRows[0]!.email).toBe("nolabel@test.com");
    expect(emailRows[0]!.labelId).toBeNull();
  });

  it("stores null labelId when email has an explicit labelId of null", async () => {
    const db = getTestDb();
    await createHuman(db, {
      firstName: "Label",
      lastName: "Null",
      emails: [{ email: "nulllabel@test.com", labelId: null }],
      types: [],
    });

    const emailRows = await db.select().from(schema.emails);
    expect(emailRows).toHaveLength(1);
    expect(emailRows[0]!.labelId).toBeNull();
  });
});

// ─── Branch coverage: updateHuman emails with no labelId ──────────────────

describe("updateHuman — email replacement with no labelId", () => {
  it("stores null labelId when updating with an email that has no labelId", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-1");

    await db.insert(schema.emails).values({
      id: "e-old", displayId: nextDisplayId("EML"), humanId: "h-1",
      email: "old@test.com", isPrimary: true, createdAt: ts,
    });

    await updateHuman(db, "h-1", {
      emails: [{ email: "new@test.com" }],
    }, "col-1");

    const emailRows = await db.select().from(schema.emails);
    expect(emailRows).toHaveLength(1);
    expect(emailRows[0]!.email).toBe("new@test.com");
    expect(emailRows[0]!.labelId).toBeNull();
  });
});

// ─── Branch coverage: linkRouteSignup dual-associating records ────────────

describe("linkRouteSignup — dual-associates linked activities, emails, phones, and socialIds", () => {
  it("propagates humanId to records that were linked to the route signup with null humanId", async () => {
    const db = getTestDb();
    const ts = now();
    await seedColleague(db);
    await seedHuman(db, "h-1", "Link", "Human");

    // Seed an activity, email, phone, and social ID linked to the route signup (no humanId yet)
    await db.insert(schema.activities).values({
      id: "act-1", displayId: nextDisplayId("ACT"), type: "email", subject: "Route act",
      activityDate: ts, routeSignupId: "rs-link-1", humanId: null,
      createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.emails).values({
      id: "e-1", displayId: nextDisplayId("EML"), email: "rslink@test.com",
      routeSignupId: "rs-link-1", humanId: null,
      accountId: null, generalLeadId: null, websiteBookingRequestId: null,
      labelId: null, isPrimary: false, createdAt: ts,
    });
    await db.insert(schema.phones).values({
      id: "ph-1", displayId: nextDisplayId("FON"), phoneNumber: "+10000000001",
      routeSignupId: "rs-link-1", humanId: null,
      accountId: null, generalLeadId: null, websiteBookingRequestId: null,
      labelId: null, hasWhatsapp: false, isPrimary: false, createdAt: ts,
    });
    await db.insert(schema.socialIds).values({
      id: "soc-1", displayId: nextDisplayId("SOC"), handle: "@rslink",
      routeSignupId: "rs-link-1", humanId: null,
      accountId: null, generalLeadId: null, websiteBookingRequestId: null,
      platformId: null, createdAt: ts,
    });

    const link = await linkRouteSignup(db, "h-1", "rs-link-1");

    expect(link.humanId).toBe("h-1");
    expect(link.routeSignupId).toBe("rs-link-1");
    expect(link.id).toBeDefined();
    expect(link.linkedAt).toBeDefined();

    const links = await db.select().from(schema.humanRouteSignups);
    expect(links).toHaveLength(1);

    // Verify dual-association propagated humanId
    const acts = await db.select().from(schema.activities);
    expect(acts[0]!.humanId).toBe("h-1");
    expect(acts[0]!.routeSignupId).toBe("rs-link-1");

    const emailRows = await db.select().from(schema.emails);
    expect(emailRows[0]!.humanId).toBe("h-1");
    expect(emailRows[0]!.routeSignupId).toBe("rs-link-1");

    const phoneRows = await db.select().from(schema.phones);
    expect(phoneRows[0]!.humanId).toBe("h-1");

    const socialRows = await db.select().from(schema.socialIds);
    expect(socialRows[0]!.humanId).toBe("h-1");
  });
});

describe("updateHumanRelationship", () => {
  it("updates labelId on an existing relationship", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    await db.insert(schema.humanRelationshipLabelsConfig).values({
      id: "lbl-1", name: "Colleague", createdAt: ts,
    });
    await db.insert(schema.humanRelationships).values({
      id: "rel-1",
      displayId: nextDisplayId("REL"),
      humanId1: "h-1",
      humanId2: "h-2",
      labelId: null,
      createdAt: ts,
    });

    const result = await updateHumanRelationship(db, "rel-1", { labelId: "lbl-1" });
    expect(result.id).toBe("rel-1");
    expect(result.labelId).toBe("lbl-1");
  });

  it("throws not found for a non-existent relationship id", async () => {
    const db = getTestDb();
    await expect(
      updateHumanRelationship(db, "nonexistent", { labelId: null }),
    ).rejects.toThrowError("Relationship not found");
  });

  it("preserves existing labelId when labelId is undefined in data", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    await db.insert(schema.humanRelationshipLabelsConfig).values({
      id: "lbl-preserve", name: "Sibling", createdAt: ts,
    });
    await db.insert(schema.humanRelationships).values({
      id: "rel-preserve",
      displayId: nextDisplayId("REL"),
      humanId1: "h-1",
      humanId2: "h-2",
      labelId: "lbl-preserve",
      createdAt: ts,
    });

    // data.labelId === undefined → should keep the existing labelId
    const result = await updateHumanRelationship(db, "rel-preserve", {});
    expect(result.id).toBe("rel-preserve");
    expect(result.labelId).toBe("lbl-preserve");
  });
});

// ─── Branch coverage: getHumanDetail with Supabase returning null data ────────

describe("getHumanDetail — Supabase null data fallback", () => {
  it("treats referralCodes and discountCodes as empty arrays when Supabase returns null data", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-supa-null");

    // Supabase mock that returns null for both referral_codes and discount_codes queries
    const nullDataSupabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = await getHumanDetail(nullDataSupabase, db, "h-supa-null");

    expect(result.referralCodes).toEqual([]);
    expect(result.discountCodes).toEqual([]);
  });
});

// ─── Branch coverage: getHumanDetail — orphaned geo interest expression ───────

describe("getHumanDetail — orphaned geo interest expression", () => {
  it("returns city: null and country: null when expression's geoInterestId does not resolve", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-geo-orphan");
    await seedColleague(db);

    // Insert a real geo interest so the FK constraint is satisfied on insert
    await db.insert(schema.geoInterests).values({
      id: "gi-real", displayId: nextDisplayId("GEO"), city: "Berlin", country: "Germany", createdAt: ts,
    });
    await db.insert(schema.activities).values({
      id: "act-geo-orphan", displayId: nextDisplayId("ACT"), type: "email", subject: "Orphan test",
      activityDate: ts, colleagueId: "col-1", createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.geoInterestExpressions).values({
      id: "gex-orphan", displayId: nextDisplayId("GEX"),
      humanId: "h-geo-orphan", geoInterestId: "gi-real", activityId: "act-geo-orphan",
      createdAt: ts,
    });

    // Orphan the expression by updating its geoInterestId to a value that no longer exists
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(
      sql`UPDATE geo_interest_expressions SET geo_interest_id = 'orphan-gi-id' WHERE id = 'gex-orphan'`,
    );
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await getHumanDetail(mockSupabase(), db, "h-geo-orphan");

    expect(result.geoInterestExpressions).toHaveLength(1);
    const expr = result.geoInterestExpressions[0] as { city: string | null; country: string | null };
    expect(expr.city).toBeNull();
    expect(expr.country).toBeNull();
  });
});

// ─── Branch coverage: getHumanDetail — orphaned route interest expression ─────

describe("getHumanDetail — orphaned route interest expression", () => {
  it("returns all route fields as null when expression's routeInterestId does not resolve", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-route-orphan");

    // Insert a real route interest so FK is satisfied on insert
    await db.insert(schema.routeInterests).values({
      id: "ri-real", displayId: nextDisplayId("ROI"),
      originCity: "Paris", originCountry: "France",
      destinationCity: "Rome", destinationCountry: "Italy",
      createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.routeInterestExpressions).values({
      id: "rex-orphan", displayId: nextDisplayId("REX"),
      humanId: "h-route-orphan", routeInterestId: "ri-real",
      frequency: "one_time", createdAt: ts,
    });

    // Orphan the expression by updating its routeInterestId to a non-existent value
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(
      sql`UPDATE route_interest_expressions SET route_interest_id = 'orphan-ri-id' WHERE id = 'rex-orphan'`,
    );
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await getHumanDetail(mockSupabase(), db, "h-route-orphan");

    expect(result.routeInterestExpressions).toHaveLength(1);
    const expr = result.routeInterestExpressions[0] as {
      originCity: string | null;
      originCountry: string | null;
      destinationCity: string | null;
      destinationCountry: string | null;
    };
    expect(expr.originCity).toBeNull();
    expect(expr.originCountry).toBeNull();
    expect(expr.destinationCity).toBeNull();
    expect(expr.destinationCountry).toBeNull();
  });
});

// ─── Branch coverage: getHumanDetail — orphaned linked account ────────────────

describe("getHumanDetail — orphaned linked account", () => {
  it("returns accountName: 'Unknown' and accountDisplayId: null when accountId does not resolve", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-acc-orphan");

    // Insert a real account so FK is satisfied on insert
    await db.insert(schema.accounts).values({
      id: "acc-real-orphan", displayId: nextDisplayId("ACC"), name: "Real Corp", status: "open", createdAt: ts, updatedAt: ts,
    });
    await db.insert(schema.accountHumans).values({
      id: "ah-orphan", accountId: "acc-real-orphan", humanId: "h-acc-orphan", labelId: null, createdAt: ts,
    });

    // Orphan the link by updating accountId to a non-existent value
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(
      sql`UPDATE account_humans SET account_id = 'orphan-acc-id' WHERE id = 'ah-orphan'`,
    );
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await getHumanDetail(mockSupabase(), db, "h-acc-orphan");

    expect(result.linkedAccounts).toHaveLength(1);
    const linked = result.linkedAccounts[0] as {
      accountName: string;
      accountDisplayId: string | null;
      labelName: string | null;
    };
    expect(linked.accountName).toBe("Unknown");
    expect(linked.accountDisplayId).toBeNull();
    expect(linked.labelName).toBeNull();
  });
});

// ─── Branch coverage: getHumanDetail — linked account with non-resolving labelId ─

describe("getHumanDetail — linked account label not found", () => {
  it("returns labelName: null when the labelId does not resolve to any config entry", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-lbl-orphan");

    await db.insert(schema.accounts).values({
      id: "acc-lbl-orphan", displayId: nextDisplayId("ACC"), name: "Label Test Corp", status: "open", createdAt: ts, updatedAt: ts,
    });
    // Insert accountHuman with a labelId that points to a non-existent config entry
    // Use replica mode to bypass the FK on label_id
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(
      sql`INSERT INTO account_humans (id, account_id, human_id, label_id, created_at)
          VALUES ('ah-lbl-orphan', 'acc-lbl-orphan', 'h-lbl-orphan', 'nonexistent-label-id', ${ts})`,
    );
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await getHumanDetail(mockSupabase(), db, "h-lbl-orphan");

    expect(result.linkedAccounts).toHaveLength(1);
    const linked = result.linkedAccounts[0] as { accountName: string; labelId: string | null; labelName: string | null };
    expect(linked.accountName).toBe("Label Test Corp");
    expect(linked.labelId).toBe("nonexistent-label-id");
    expect(linked.labelName).toBeNull();
  });
});

// ─── Branch coverage: getHumanDetail — email with non-resolving labelId ───────

describe("getHumanDetail — email with non-resolving labelId", () => {
  it("returns labelName: null when email's labelId does not match any config entry", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-email-lbl-orphan");

    // Insert email with a labelId that doesn't exist in human_email_labels_config
    // emails.label_id has no FK so we can insert directly
    await db.insert(schema.emails).values({
      id: "e-lbl-orphan",
      displayId: nextDisplayId("EML"),
      humanId: "h-email-lbl-orphan",
      email: "orphan-label@test.com",
      labelId: "nonexistent-email-label",
      isPrimary: true,
      createdAt: ts,
    });

    const result = await getHumanDetail(mockSupabase(), db, "h-email-lbl-orphan");

    expect(result.emails).toHaveLength(1);
    const email = result.emails[0] as { labelId: string | null; labelName: string | null };
    expect(email.labelId).toBe("nonexistent-email-label");
    expect(email.labelName).toBeNull();
  });
});

// ─── Branch coverage: getHumanDetail — phone with non-resolving labelId ───────

describe("getHumanDetail — phone with non-resolving labelId", () => {
  it("returns labelName: null when phone's labelId does not match any config entry", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-phone-lbl-orphan");

    // Insert phone with a labelId that doesn't exist in human_phone_labels_config
    // phones.label_id has no FK so we can insert directly
    await db.insert(schema.phones).values({
      id: "ph-lbl-orphan",
      displayId: nextDisplayId("FON"),
      humanId: "h-phone-lbl-orphan",
      phoneNumber: "+19990000001",
      labelId: "nonexistent-phone-label",
      hasWhatsapp: false,
      isPrimary: true,
      createdAt: ts,
    });

    const result = await getHumanDetail(mockSupabase(), db, "h-phone-lbl-orphan");

    expect(result.phoneNumbers).toHaveLength(1);
    const phone = result.phoneNumbers[0] as { labelId: string | null; labelName: string | null };
    expect(phone.labelId).toBe("nonexistent-phone-label");
    expect(phone.labelName).toBeNull();
  });
});

// ─── Branch coverage: getHumanDetail — social ID with non-resolving platformId ─

describe("getHumanDetail — social ID with non-resolving platformId", () => {
  it("returns platformName: null when social ID's platformId does not match any config entry", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-soc-plat-orphan");

    // Insert social ID with a platformId that doesn't exist in social_id_platforms_config
    // Use replica mode to bypass the FK on platform_id
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(
      sql`INSERT INTO social_ids (id, display_id, handle, platform_id, human_id, created_at)
          VALUES ('soc-plat-orphan', ${nextDisplayId("SOC")}, '@orphan-platform', 'nonexistent-platform', 'h-soc-plat-orphan', ${ts})`,
    );
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await getHumanDetail(mockSupabase(), db, "h-soc-plat-orphan");

    expect(result.socialIds).toHaveLength(1);
    const social = result.socialIds[0] as { platformId: string | null; platformName: string | null };
    expect(social.platformId).toBe("nonexistent-platform");
    expect(social.platformName).toBeNull();
  });
});

// ─── Branch coverage: getHumanRelationships — orphaned other human ────────────

describe("getHumanRelationships — orphaned other human", () => {
  it("returns otherHumanName: 'Unknown' and otherHumanDisplayId: null when humanId2 does not exist", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-rel-main", "Main", "Human");

    // Insert a relationship where humanId2 references a human that will be removed
    await seedHuman(db, "h-rel-ghost", "Ghost", "Person");
    await db.insert(schema.humanRelationships).values({
      id: "rel-orphan",
      displayId: nextDisplayId("REL"),
      humanId1: "h-rel-main",
      humanId2: "h-rel-ghost",
      labelId: null,
      createdAt: ts,
    });

    // Orphan the relationship by updating humanId2 to a non-existent value
    await db.execute(sql`SET session_replication_role = 'replica'`);
    await db.execute(
      sql`UPDATE human_relationships SET human_id_2 = 'does-not-exist' WHERE id = 'rel-orphan'`,
    );
    await db.execute(sql`SET session_replication_role = 'origin'`);

    const result = await getHumanRelationships(db, "h-rel-main");

    expect(result).toHaveLength(1);
    expect(result[0]!.otherHumanName).toBe("Unknown");
    expect(result[0]!.otherHumanDisplayId).toBeNull();
  });
});

// ─── Branch coverage: updateHumanRelationship — explicit null labelId ─────────

describe("updateHumanRelationship — explicit null labelId clears the label", () => {
  it("sets labelId to null when data.labelId is explicitly null", async () => {
    const db = getTestDb();
    const ts = now();
    await seedHuman(db, "h-1", "Alice", "Smith");
    await seedHuman(db, "h-2", "Bob", "Jones");

    await db.insert(schema.humanRelationshipLabelsConfig).values({
      id: "lbl-clear", name: "Partner", createdAt: ts,
    });
    await db.insert(schema.humanRelationships).values({
      id: "rel-clear",
      displayId: nextDisplayId("REL"),
      humanId1: "h-1",
      humanId2: "h-2",
      labelId: "lbl-clear",
      createdAt: ts,
    });

    // data.labelId === null → exercises the `?? null` branch (not the undefined branch)
    const result = await updateHumanRelationship(db, "rel-clear", { labelId: null });
    expect(result.id).toBe("rel-clear");
    expect(result.labelId).toBeNull();
  });
});
