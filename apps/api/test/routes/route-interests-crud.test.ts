/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildHuman } from "@humans/test-utils";
import { createId } from "@humans/db";

const BASE_RI = "http://localhost/api/route-interests";
const BASE_REX = "http://localhost/api/route-interest-expressions";

function jsonHeaders(token: string) {
  return { "Content-Type": "application/json", Cookie: sessionCookie(token) };
}

async function seedDisplayIdCounters() {
  const db = getDb();
  await db.insert(schema.displayIdCounters).values({ prefix: "ROI", counter: 0 }).onConflictDoNothing();
  await db.insert(schema.displayIdCounters).values({ prefix: "REX", counter: 0 }).onConflictDoNothing();
}

function buildRouteInterest(overrides: Partial<{
  id: string;
  displayId: string;
  originCity: string;
  originCountry: string;
  destinationCity: string;
  destinationCountry: string;
  createdAt: string;
  updatedAt: string;
}> = {}) {
  const now = new Date().toISOString();
  return {
    id: createId(),
    displayId: `ROI-AAA-${String(Math.floor(Math.random() * 900) + 100)}`,
    originCity: "London",
    originCountry: "United Kingdom",
    destinationCity: "Paris",
    destinationCountry: "France",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildRouteInterestExpression(overrides: Partial<{
  id: string;
  displayId: string;
  humanId: string;
  routeInterestId: string;
  activityId: string | null;
  frequency: string;
  travelYear: number | null;
  travelMonth: number | null;
  travelDay: number | null;
  notes: string | null;
  createdAt: string;
}> = {}) {
  const now = new Date().toISOString();
  return {
    id: createId(),
    displayId: `REX-AAA-${String(Math.floor(Math.random() * 900) + 100)}`,
    humanId: createId(),
    routeInterestId: createId(),
    activityId: null,
    frequency: "one_time",
    travelYear: null,
    travelMonth: null,
    travelDay: null,
    notes: null,
    createdAt: now,
    ...overrides,
  };
}

// ─── GET /api/route-interests ─────────────────────────────────────

describe("GET /api/route-interests", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(BASE_RI);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no route interests exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE_RI, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns list of route interests with counts", async () => {
    const db = getDb();
    const ri = buildRouteInterest({ originCity: "Madrid", originCountry: "Spain", destinationCity: "Lisbon", destinationCountry: "Portugal" });
    await db.insert(schema.routeInterests).values(ri);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE_RI, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ id: string; originCity: string; humanCount: number; expressionCount: number }> };
    const found = body.data.find((r) => r.id === ri.id);
    expect(found).toBeDefined();
    expect(found!.originCity).toBe("Madrid");
    expect(found!.humanCount).toBe(0);
    expect(found!.expressionCount).toBe(0);
  });
});

// ─── GET /api/route-interests/cities ─────────────────────────────

describe("GET /api/route-interests/cities", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(`${BASE_RI}/cities?q=Lon`);
    expect(res.status).toBe(401);
  });

  it("returns empty array for empty query", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`${BASE_RI}/cities?q=`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns matching cities from route interests", async () => {
    const db = getDb();
    const ri = buildRouteInterest({ originCity: "Barcelona", originCountry: "Spain", destinationCity: "Rome", destinationCountry: "Italy" });
    await db.insert(schema.routeInterests).values(ri);

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`${BASE_RI}/cities?q=Barc`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ city: string; country: string }> };
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    const barcelona = body.data.find((c) => c.city === "Barcelona");
    expect(barcelona).toBeDefined();
    expect(barcelona!.country).toBe("Spain");
  });
});

// ─── GET /api/route-interests/:id ────────────────────────────────

describe("GET /api/route-interests/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(`${BASE_RI}/nonexistent`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent route interest", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`${BASE_RI}/nonexistent`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });

  it("returns route interest detail with expressions", async () => {
    const db = getDb();
    const human = buildHuman({ firstName: "Liu", lastName: "Wei" });
    await db.insert(schema.humans).values(human);

    const ri = buildRouteInterest({ originCity: "Tokyo", originCountry: "Japan", destinationCity: "Seoul", destinationCountry: "South Korea" });
    await db.insert(schema.routeInterests).values(ri);

    const expr = buildRouteInterestExpression({ humanId: human.id, routeInterestId: ri.id });
    await db.insert(schema.routeInterestExpressions).values(expr);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE_RI}/${ri.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; originCity: string; expressions: Array<{ id: string; humanName: string | null }> } };
    expect(body.data.id).toBe(ri.id);
    expect(body.data.originCity).toBe("Tokyo");
    expect(body.data.expressions).toHaveLength(1);
    expect(body.data.expressions[0].id).toBe(expr.id);
    expect(body.data.expressions[0].humanName).toBe("Liu Wei");
  });
});

// ─── POST /api/route-interests ────────────────────────────────────

describe("POST /api/route-interests", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(BASE_RI, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originCity: "Berlin", originCountry: "Germany", destinationCity: "Vienna", destinationCountry: "Austria" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    await seedDisplayIdCounters();
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE_RI, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ originCity: "Berlin", originCountry: "Germany", destinationCity: "Vienna", destinationCountry: "Austria" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates route interest and returns 201", async () => {
    await seedDisplayIdCounters();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE_RI, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ originCity: "Amsterdam", originCountry: "Netherlands", destinationCity: "Brussels", destinationCountry: "Belgium" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; originCity: string; destinationCity: string } };
    expect(body.data.id).toBeDefined();
    expect(body.data.originCity).toBe("Amsterdam");
    expect(body.data.destinationCity).toBe("Brussels");
  });

  it("returns 200 (not 201) when route interest already exists (idempotent)", async () => {
    await seedDisplayIdCounters();
    const db = getDb();
    const ri = buildRouteInterest({ originCity: "Prague", originCountry: "Czech Republic", destinationCity: "Budapest", destinationCountry: "Hungary" });
    await db.insert(schema.routeInterests).values(ri);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE_RI, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ originCity: "Prague", originCountry: "Czech Republic", destinationCity: "Budapest", destinationCountry: "Hungary" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe(ri.id);
  });

  it("returns 400 for invalid data (missing fields)", async () => {
    await seedDisplayIdCounters();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE_RI, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ originCity: "Oslo" }), // missing other required fields
    });
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/route-interests/:id ─────────────────────────────

describe("DELETE /api/route-interests/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(`${BASE_RI}/nonexistent`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for agent role (admin only)", async () => {
    const db = getDb();
    const ri = buildRouteInterest();
    await db.insert(schema.routeInterests).values(ri);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE_RI}/${ri.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent route interest", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch(`${BASE_RI}/nonexistent`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
  });

  it("deletes route interest and cascades expressions", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const ri = buildRouteInterest({ originCity: "Zurich", originCountry: "Switzerland", destinationCity: "Geneva", destinationCountry: "Switzerland" });
    await db.insert(schema.routeInterests).values(ri);

    const expr = buildRouteInterestExpression({ humanId: human.id, routeInterestId: ri.id });
    await db.insert(schema.routeInterestExpressions).values(expr);

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch(`${BASE_RI}/${ri.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // Verify route interest is gone
    const getRes = await SELF.fetch(`${BASE_RI}/${ri.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(getRes.status).toBe(404);
  });
});

// ─── GET /api/route-interest-expressions ─────────────────────────

describe("GET /api/route-interest-expressions", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(BASE_REX);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no expressions exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE_REX, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns all expressions with resolved details", async () => {
    const db = getDb();
    const human = buildHuman({ firstName: "Sofia", lastName: "Andersen" });
    await db.insert(schema.humans).values(human);

    const ri = buildRouteInterest({ originCity: "Copenhagen", originCountry: "Denmark", destinationCity: "Stockholm", destinationCountry: "Sweden" });
    await db.insert(schema.routeInterests).values(ri);

    const expr = buildRouteInterestExpression({ humanId: human.id, routeInterestId: ri.id });
    await db.insert(schema.routeInterestExpressions).values(expr);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE_REX, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ id: string; humanName: string | null; originCity: string | null; destinationCity: string | null }> };
    const found = body.data.find((e) => e.id === expr.id);
    expect(found).toBeDefined();
    expect(found!.humanName).toBe("Sofia Andersen");
    expect(found!.originCity).toBe("Copenhagen");
    expect(found!.destinationCity).toBe("Stockholm");
  });

  it("filters by humanId", async () => {
    const db = getDb();
    const human1 = buildHuman();
    const human2 = buildHuman();
    await db.insert(schema.humans).values([human1, human2]);

    const ri = buildRouteInterest();
    await db.insert(schema.routeInterests).values(ri);

    const expr1 = buildRouteInterestExpression({ humanId: human1.id, routeInterestId: ri.id });
    const expr2 = buildRouteInterestExpression({ humanId: human2.id, routeInterestId: ri.id });
    await db.insert(schema.routeInterestExpressions).values([expr1, expr2]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE_REX}?humanId=${human1.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ id: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(expr1.id);
  });
});

// ─── GET /api/route-interest-expressions/:id ─────────────────────

describe("GET /api/route-interest-expressions/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(`${BASE_REX}/nonexistent`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent expression", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`${BASE_REX}/nonexistent`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });

  it("returns expression detail with resolved names", async () => {
    const db = getDb();
    const human = buildHuman({ firstName: "Mei", lastName: "Tanaka" });
    await db.insert(schema.humans).values(human);

    const ri = buildRouteInterest({ originCity: "Osaka", originCountry: "Japan", destinationCity: "Singapore", destinationCountry: "Singapore" });
    await db.insert(schema.routeInterests).values(ri);

    const expr = buildRouteInterestExpression({ humanId: human.id, routeInterestId: ri.id, frequency: "repeat" });
    await db.insert(schema.routeInterestExpressions).values(expr);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE_REX}/${expr.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        id: string;
        humanName: string | null;
        humanDisplayId: string | null;
        originCity: string | null;
        destinationCity: string | null;
        frequency: string;
      };
    };
    expect(body.data.id).toBe(expr.id);
    expect(body.data.humanName).toBe("Mei Tanaka");
    expect(body.data.originCity).toBe("Osaka");
    expect(body.data.destinationCity).toBe("Singapore");
    expect(body.data.frequency).toBe("repeat");
  });
});

// ─── POST /api/route-interest-expressions ────────────────────────

describe("POST /api/route-interest-expressions", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(BASE_REX, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ humanId: "h1", originCity: "X", originCountry: "Y", destinationCity: "A", destinationCountry: "B" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    await seedDisplayIdCounters();
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE_REX, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ humanId: "h1", originCity: "X", originCountry: "Y", destinationCity: "A", destinationCountry: "B" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates expression by routeInterestId and returns 201", async () => {
    await seedDisplayIdCounters();
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const ri = buildRouteInterest({ originCity: "Helsinki", originCountry: "Finland", destinationCity: "Tallinn", destinationCountry: "Estonia" });
    await db.insert(schema.routeInterests).values(ri);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE_REX, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ humanId: human.id, routeInterestId: ri.id }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; humanId: string; routeInterestId: string } };
    expect(body.data.id).toBeDefined();
    expect(body.data.humanId).toBe(human.id);
    expect(body.data.routeInterestId).toBe(ri.id);
  });

  it("creates expression and auto-creates route interest via city/country fields", async () => {
    await seedDisplayIdCounters();
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE_REX, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({
        humanId: human.id,
        originCity: "Reykjavik",
        originCountry: "Iceland",
        destinationCity: "Dublin",
        destinationCountry: "Ireland",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; routeInterestId: string } };
    expect(body.data.id).toBeDefined();
    expect(body.data.routeInterestId).toBeDefined();
  });

  it("returns 404 when human does not exist", async () => {
    await seedDisplayIdCounters();
    const db = getDb();
    const ri = buildRouteInterest();
    await db.insert(schema.routeInterests).values(ri);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE_REX, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ humanId: "nonexistent-human", routeInterestId: ri.id }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when neither routeInterestId nor city fields are provided", async () => {
    await seedDisplayIdCounters();
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE_REX, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ humanId: human.id }), // missing required route fields
    });
    expect(res.status).toBe(400);
  });
});

// ─── PATCH /api/route-interest-expressions/:id ───────────────────

describe("PATCH /api/route-interest-expressions/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(`${BASE_REX}/nonexistent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "updated" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const ri = buildRouteInterest();
    await db.insert(schema.routeInterests).values(ri);
    const expr = buildRouteInterestExpression({ humanId: human.id, routeInterestId: ri.id });
    await db.insert(schema.routeInterestExpressions).values(expr);

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`${BASE_REX}/${expr.id}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ notes: "blocked" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent expression", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE_REX}/nonexistent`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ notes: "updated" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates expression notes and frequency", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const ri = buildRouteInterest();
    await db.insert(schema.routeInterests).values(ri);
    const expr = buildRouteInterestExpression({ humanId: human.id, routeInterestId: ri.id, frequency: "one_time" });
    await db.insert(schema.routeInterestExpressions).values(expr);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE_REX}/${expr.id}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ notes: "Travels annually", frequency: "repeat" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; notes: string | null; frequency: string } };
    expect(body.data.id).toBe(expr.id);
    expect(body.data.notes).toBe("Travels annually");
    expect(body.data.frequency).toBe("repeat");
  });
});

// ─── DELETE /api/route-interest-expressions/:id ──────────────────

describe("DELETE /api/route-interest-expressions/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(`${BASE_REX}/nonexistent`, { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for viewer role", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const ri = buildRouteInterest();
    await db.insert(schema.routeInterests).values(ri);
    const expr = buildRouteInterestExpression({ humanId: human.id, routeInterestId: ri.id });
    await db.insert(schema.routeInterestExpressions).values(expr);

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(`${BASE_REX}/${expr.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent expression", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE_REX}/nonexistent`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
  });

  it("deletes expression successfully", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const ri = buildRouteInterest();
    await db.insert(schema.routeInterests).values(ri);
    const expr = buildRouteInterestExpression({ humanId: human.id, routeInterestId: ri.id });
    await db.insert(schema.routeInterestExpressions).values(expr);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE_REX}/${expr.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);

    // Verify it is gone
    const getRes = await SELF.fetch(`${BASE_REX}/${expr.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(getRes.status).toBe(404);
  });
});
