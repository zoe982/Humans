/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildOpportunity, buildHuman, buildPet, buildConfigItem, buildColleague } from "@humans/test-utils";

const BASE = "http://localhost/api/opportunities";

function jsonHeaders(token: string) {
  return { "Content-Type": "application/json", Cookie: sessionCookie(token) };
}

// ─── Seed helpers ────────────────────────────────────────────────

async function seedRoleConfigs() {
  const db = getDb();
  const existing = await db.select().from(schema.opportunityHumanRolesConfig);
  if (existing.length > 0) return existing;
  const primary = buildConfigItem({ id: "role-primary", name: "primary" });
  const passenger = buildConfigItem({ id: "role-passenger", name: "passenger" });
  await db.insert(schema.opportunityHumanRolesConfig).values([primary, passenger]);
  return [primary, passenger];
}

async function seedDisplayIdCounter() {
  const db = getDb();
  await db.insert(schema.displayIdCounters).values({ prefix: "OPP", counter: 0 }).onConflictDoNothing();
  await db.insert(schema.displayIdCounters).values({ prefix: "ACT", counter: 0 }).onConflictDoNothing();
}

// ─── CRUD ────────────────────────────────────────────────────────

describe("GET /api/opportunities", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(BASE);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no opportunities exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[]; meta: { total: number } };
    expect(body.data).toHaveLength(0);
    expect(body.meta.total).toBe(0);
  });

  it("returns list of opportunities", async () => {
    const db = getDb();
    const o1 = buildOpportunity({ stage: "open" });
    const o2 = buildOpportunity({ stage: "qualified" });
    await db.insert(schema.opportunities).values([o1, o2]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; stage: string }[]; meta: { total: number } };
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
  });

  it("filters by stage", async () => {
    const db = getDb();
    await db.insert(schema.opportunities).values([
      buildOpportunity({ stage: "open" }),
      buildOpportunity({ stage: "qualified" }),
    ]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}?stage=qualified`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { stage: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].stage).toBe("qualified");
  });

  it("filters by search query on displayId", async () => {
    const db = getDb();
    const opp = buildOpportunity({ displayId: "OPP-alpha-042" });
    await db.insert(schema.opportunities).values([opp, buildOpportunity()]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}?q=alpha-042`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(opp.id);
  });
});

describe("GET /api/opportunities/:id", () => {
  it("returns 404 for non-existent opportunity", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`${BASE}/nonexistent`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
  });

  it("returns opportunity detail with linked humans and pets", async () => {
    const db = getDb();
    await seedRoleConfigs();
    const opp = buildOpportunity();
    await db.insert(schema.opportunities).values(opp);

    const human = buildHuman({ firstName: "Alice", lastName: "Smith" });
    await db.insert(schema.humans).values(human);
    await db.insert(schema.opportunityHumans).values({
      id: "oh-1",
      opportunityId: opp.id,
      humanId: human.id,
      roleId: "role-primary",
      createdAt: new Date().toISOString(),
    });

    const pet = buildPet({ humanId: human.id, name: "Rex" });
    await db.insert(schema.pets).values(pet);
    await db.insert(schema.opportunityPets).values({
      id: "op-1",
      opportunityId: opp.id,
      petId: pet.id,
      createdAt: new Date().toISOString(),
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; linkedHumans: { roleName: string }[]; linkedPets: { name: string }[]; activities: unknown[] } };
    expect(body.data.id).toBe(opp.id);
    expect(body.data.linkedHumans).toHaveLength(1);
    expect(body.data.linkedHumans[0].roleName).toBe("primary");
    expect(body.data.linkedPets).toHaveLength(1);
    expect(body.data.linkedPets[0].name).toBe("Rex");
  });
});

describe("POST /api/opportunities", () => {
  it("returns 403 for viewer role", async () => {
    await seedDisplayIdCounter();
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(403);
  });

  it("creates opportunity with defaults and returns 201", async () => {
    await seedDisplayIdCounter();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; displayId: string } };
    expect(body.data.id).toBeDefined();
    expect(body.data.displayId).toMatch(/^OPP-/);
  });

  it("creates opportunity with explicit seats", async () => {
    await seedDisplayIdCounter();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ seatsRequested: 3 }),
    });
    expect(res.status).toBe(201);

    const body = (await res.json()) as { data: { id: string } };
    // Verify via GET
    const getRes = await SELF.fetch(`${BASE}/${body.data.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    const detail = (await getRes.json()) as { data: { seatsRequested: number } };
    expect(detail.data.seatsRequested).toBe(3);
  });
});

describe("PATCH /api/opportunities/:id", () => {
  it("updates seatsRequested", async () => {
    const db = getDb();
    const opp = buildOpportunity();
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ seatsRequested: 5 }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { seatsRequested: number }; auditEntryId: string };
    expect(body.data.seatsRequested).toBe(5);
    expect(body.auditEntryId).toBeDefined();
  });

  it("returns 404 for non-existent opportunity", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/nonexistent`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ seatsRequested: 2 }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/opportunities/:id", () => {
  it("returns 403 for non-admin", async () => {
    const db = getDb();
    const opp = buildOpportunity();
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("deletes opportunity and returns success", async () => {
    const db = getDb();
    const opp = buildOpportunity();
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch(`${BASE}/${opp.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // Verify deleted
    const getRes = await SELF.fetch(`${BASE}/${opp.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(getRes.status).toBe(404);
  });
});

// ─── Stage ───────────────────────────────────────────────────────

describe("PATCH /api/opportunities/:id/stage", () => {
  it("requires lossReason for closed_lost", async () => {
    const db = getDb();
    const opp = buildOpportunity({ nextActionDescription: "Follow up" });
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/stage`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ stage: "closed_lost" }),
    });
    expect(res.status).toBe(400);
  });

  it("accepts closed_lost with lossReason and clears next action", async () => {
    const db = getDb();
    const colleague = buildColleague();
    await db.insert(schema.colleagues).values(colleague);
    const opp = buildOpportunity({
      stage: "open",
      nextActionDescription: "Call client",
      nextActionOwnerId: colleague.id,
      nextActionType: "phone_call",
      nextActionDueDate: "2025-12-01T00:00:00.000Z",
    });
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/stage`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ stage: "closed_lost", lossReason: "Too expensive" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { stage: string; lossReason: string; nextActionDescription: string | null } };
    expect(body.data.stage).toBe("closed_lost");
    expect(body.data.lossReason).toBe("Too expensive");
    expect(body.data.nextActionDescription).toBeNull();
  });

  it("closed_flown auto-completes next action and creates activity", async () => {
    const db = getDb();
    await seedDisplayIdCounter();
    const colleague = buildColleague();
    await db.insert(schema.colleagues).values(colleague);

    const opp = buildOpportunity({
      stage: "docs_complete",
      nextActionDescription: "Final check",
      nextActionOwnerId: colleague.id,
      nextActionType: "email",
      nextActionDueDate: "2025-12-01T00:00:00.000Z",
    });
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/stage`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ stage: "closed_flown" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { stage: string; nextActionDescription: string | null } };
    expect(body.data.stage).toBe("closed_flown");
    expect(body.data.nextActionDescription).toBeNull();

    // Verify activity was created
    const activitiesRes = await db.select().from(schema.activities).where(
      schema.activities.opportunityId ? undefined : undefined,
    );
    const oppActivities = activitiesRes.filter((a) => a.opportunityId === opp.id);
    expect(oppActivities.length).toBeGreaterThanOrEqual(1);
    expect(oppActivities[0].subject).toContain("Final check");
  });
});

// ─── Human linking ───────────────────────────────────────────────

describe("POST /api/opportunities/:id/humans", () => {
  it("first human gets primary role automatically", async () => {
    const db = getDb();
    await seedRoleConfigs();
    const opp = buildOpportunity();
    await db.insert(schema.opportunities).values(opp);
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/humans`, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ humanId: human.id }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { roleId: string } };
    expect(body.data.roleId).toBe("role-primary");
  });

  it("second human defaults to passenger role", async () => {
    const db = getDb();
    await seedRoleConfigs();
    const opp = buildOpportunity();
    await db.insert(schema.opportunities).values(opp);
    const h1 = buildHuman({ firstName: "First" });
    const h2 = buildHuman({ firstName: "Second" });
    await db.insert(schema.humans).values([h1, h2]);

    // Link first
    await db.insert(schema.opportunityHumans).values({
      id: "oh-auto-1",
      opportunityId: opp.id,
      humanId: h1.id,
      roleId: "role-primary",
      createdAt: new Date().toISOString(),
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/humans`, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ humanId: h2.id }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { roleId: string } };
    expect(body.data.roleId).toBe("role-passenger");
  });
});

describe("PATCH /api/opportunities/:id/humans/:linkId", () => {
  it("setting as primary demotes existing primary", async () => {
    const db = getDb();
    await seedRoleConfigs();
    const opp = buildOpportunity();
    await db.insert(schema.opportunities).values(opp);
    const h1 = buildHuman();
    const h2 = buildHuman();
    await db.insert(schema.humans).values([h1, h2]);

    await db.insert(schema.opportunityHumans).values([
      { id: "oh-p1", opportunityId: opp.id, humanId: h1.id, roleId: "role-primary", createdAt: new Date().toISOString() },
      { id: "oh-p2", opportunityId: opp.id, humanId: h2.id, roleId: "role-passenger", createdAt: new Date().toISOString() },
    ]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/humans/oh-p2`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ roleId: "role-primary" }),
    });
    expect(res.status).toBe(200);

    // Verify old primary is demoted
    const rows = await db.select().from(schema.opportunityHumans).where(
      schema.opportunityHumans.opportunityId ? undefined : undefined,
    );
    const oppRows = rows.filter((r) => r.opportunityId === opp.id);
    const oldPrimary = oppRows.find((r) => r.id === "oh-p1");
    expect(oldPrimary?.roleId).toBe("role-passenger");
  });
});

describe("DELETE /api/opportunities/:id/humans/:linkId", () => {
  it("blocks removing primary when other humans exist on non-terminal opp", async () => {
    const db = getDb();
    await seedRoleConfigs();
    const opp = buildOpportunity({ stage: "open" });
    await db.insert(schema.opportunities).values(opp);
    const h1 = buildHuman();
    const h2 = buildHuman();
    await db.insert(schema.humans).values([h1, h2]);

    await db.insert(schema.opportunityHumans).values([
      { id: "oh-del-1", opportunityId: opp.id, humanId: h1.id, roleId: "role-primary", createdAt: new Date().toISOString() },
      { id: "oh-del-2", opportunityId: opp.id, humanId: h2.id, roleId: "role-passenger", createdAt: new Date().toISOString() },
    ]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/humans/oh-del-1`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(400);
  });

  it("allows removing the only human (sole human, no primary conflict)", async () => {
    const db = getDb();
    await seedRoleConfigs();
    const opp = buildOpportunity({ stage: "open" });
    await db.insert(schema.opportunities).values(opp);
    const h1 = buildHuman();
    await db.insert(schema.humans).values(h1);

    await db.insert(schema.opportunityHumans).values([
      { id: "oh-sole", opportunityId: opp.id, humanId: h1.id, roleId: "role-primary", createdAt: new Date().toISOString() },
    ]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/humans/oh-sole`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
  });
});

// ─── Pet linking ─────────────────────────────────────────────────

describe("POST /api/opportunities/:id/pets", () => {
  it("blocks linking pet if owner is not linked to opportunity", async () => {
    const db = getDb();
    const opp = buildOpportunity();
    await db.insert(schema.opportunities).values(opp);
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const pet = buildPet({ humanId: human.id });
    await db.insert(schema.pets).values(pet);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/pets`, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ petId: pet.id }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("OPPORTUNITY_PET_OWNER_NOT_LINKED");
  });

  it("links pet when owner is linked", async () => {
    const db = getDb();
    await seedRoleConfigs();
    const opp = buildOpportunity();
    await db.insert(schema.opportunities).values(opp);
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    await db.insert(schema.opportunityHumans).values({
      id: "oh-pet-link",
      opportunityId: opp.id,
      humanId: human.id,
      roleId: "role-primary",
      createdAt: new Date().toISOString(),
    });
    const pet = buildPet({ humanId: human.id });
    await db.insert(schema.pets).values(pet);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/pets`, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ petId: pet.id }),
    });
    expect(res.status).toBe(201);
  });
});

// ─── Next Action ─────────────────────────────────────────────────

describe("PATCH /api/opportunities/:id/next-action", () => {
  it("sets next action fields", async () => {
    const db = getDb();
    const colleague = buildColleague();
    await db.insert(schema.colleagues).values(colleague);
    const opp = buildOpportunity();
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/next-action`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({
        ownerId: colleague.id,
        description: "Send deposit request",
        type: "email",
        dueDate: "2025-12-15T10:00:00.000Z",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { nextActionDescription: string; nextActionType: string } };
    expect(body.data.nextActionDescription).toBe("Send deposit request");
    expect(body.data.nextActionType).toBe("email");
  });
});

describe("POST /api/opportunities/:id/next-action/done", () => {
  it("completes next action and creates activity", async () => {
    const db = getDb();
    await seedDisplayIdCounter();
    const colleague = buildColleague();
    await db.insert(schema.colleagues).values(colleague);
    const opp = buildOpportunity({
      nextActionOwnerId: colleague.id,
      nextActionDescription: "Follow up call",
      nextActionType: "phone_call",
      nextActionDueDate: "2025-12-15T10:00:00.000Z",
    });
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/next-action/done`, {
      method: "POST",
      headers: jsonHeaders(token),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { nextActionDescription: string | null } };
    expect(body.data.nextActionDescription).toBeNull();

    // Verify activity was created
    const oppActivities = await db.select().from(schema.activities);
    const forOpp = oppActivities.filter((a) => a.opportunityId === opp.id);
    expect(forOpp).toHaveLength(1);
    expect(forOpp[0].subject).toBe("Follow up call");
    expect(forOpp[0].type).toBe("phone_call");
  });

  it("returns 400 when no next action exists", async () => {
    const db = getDb();
    const opp = buildOpportunity();
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${opp.id}/next-action/done`, {
      method: "POST",
      headers: jsonHeaders(token),
    });
    expect(res.status).toBe(400);
  });
});
