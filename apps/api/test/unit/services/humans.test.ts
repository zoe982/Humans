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
} from "../../../src/services/humans";
import { AppError } from "../../../src/lib/errors";
import * as schema from "@humans/db/schema";
import { eq } from "drizzle-orm";

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
      types: ["pet_shipper"],
    }, "col-1");

    const types = await db.select().from(schema.humanTypes);
    expect(types).toHaveLength(1);
    expect(types[0]!.type).toBe("pet_shipper");
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
