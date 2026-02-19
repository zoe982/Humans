/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildHuman, buildGeoInterest } from "@humans/test-utils";
import { createId } from "@humans/db";

describe("GET /api/geo-interests", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/geo-interests");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no geo-interests exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/geo-interests", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns list of geo-interests with counts", async () => {
    const db = getDb();
    const gi = buildGeoInterest({ city: "London", country: "United Kingdom" });
    await db.insert(schema.geoInterests).values(gi);

    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    await db.insert(schema.geoInterestExpressions).values({
      id: createId(),
      humanId: human.id,
      geoInterestId: gi.id,
      activityId: null,
      notes: null,
      createdAt: new Date().toISOString(),
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/geo-interests", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; humanCount: number; expressionCount: number }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].humanCount).toBe(1);
    expect(body.data[0].expressionCount).toBe(1);
  });
});

describe("GET /api/geo-interests/:id", () => {
  it("returns 404 for non-existent geo-interest", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/geo-interests/nonexistent", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });

  it("returns geo-interest by id with expressions", async () => {
    const db = getDb();
    const gi = buildGeoInterest({ city: "Paris", country: "France" });
    await db.insert(schema.geoInterests).values(gi);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/geo-interests/${gi.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; city: string; expressions: unknown[] } };
    expect(body.data.id).toBe(gi.id);
    expect(body.data.city).toBe("Paris");
    expect(body.data.expressions).toHaveLength(0);
  });
});

describe("POST /api/geo-interests", () => {
  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/geo-interests", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ city: "London", country: "United Kingdom" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates geo-interest and returns 201", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/geo-interests", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ city: "Berlin", country: "Germany" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; city: string; country: string } };
    expect(body.data.city).toBe("Berlin");
    expect(body.data.country).toBe("Germany");
  });

  it("returns existing geo-interest if city+country already exists (idempotent)", async () => {
    const db = getDb();
    const gi = buildGeoInterest({ city: "Rome", country: "Italy" });
    await db.insert(schema.geoInterests).values(gi);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/geo-interests", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ city: "Rome", country: "Italy" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe(gi.id);
  });

  it("returns 400 for missing city", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/geo-interests", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ city: "", country: "Germany" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/geo-interest-expressions", () => {
  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/geo-interest-expressions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ humanId: "some-id", city: "London", country: "UK" }),
    });
    expect(res.status).toBe(403);
  });

  it("creates expression with existing geoInterestId and returns 201", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const gi = buildGeoInterest({ city: "Tokyo", country: "Japan" });
    await db.insert(schema.geoInterests).values(gi);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/geo-interest-expressions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({
        humanId: human.id,
        geoInterestId: gi.id,
        notes: "Interested in Tokyo",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { humanId: string; geoInterestId: string; notes: string } };
    expect(body.data.humanId).toBe(human.id);
    expect(body.data.geoInterestId).toBe(gi.id);
    expect(body.data.notes).toBe("Interested in Tokyo");
  });

  it("creates expression with city+country (auto-creates geo-interest) and returns 201", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/geo-interest-expressions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({
        humanId: human.id,
        city: "Madrid",
        country: "Spain",
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { humanId: string; geoInterestId: string } };
    expect(body.data.humanId).toBe(human.id);
    expect(body.data.geoInterestId).toBeDefined();
  });

  it("returns 404 for non-existent human", async () => {
    const db = getDb();
    const gi = buildGeoInterest();
    await db.insert(schema.geoInterests).values(gi);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/geo-interest-expressions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({
        humanId: "nonexistent-human",
        geoInterestId: gi.id,
      }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/geo-interest-expressions/:id", () => {
  it("returns 404 for non-existent expression", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/geo-interest-expressions/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ notes: "Updated notes" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates expression notes successfully", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const gi = buildGeoInterest({ city: "Lisbon", country: "Portugal" });
    await db.insert(schema.geoInterests).values(gi);

    const expressionId = createId();
    await db.insert(schema.geoInterestExpressions).values({
      id: expressionId,
      humanId: human.id,
      geoInterestId: gi.id,
      activityId: null,
      notes: "Old notes",
      createdAt: new Date().toISOString(),
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/geo-interest-expressions/${expressionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ notes: "Updated notes" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { notes: string } };
    expect(body.data.notes).toBe("Updated notes");
  });
});

describe("DELETE /api/geo-interest-expressions/:id", () => {
  it("returns 404 for non-existent expression", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/geo-interest-expressions/nonexistent", {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
  });

  it("deletes expression successfully", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const gi = buildGeoInterest({ city: "Vienna", country: "Austria" });
    await db.insert(schema.geoInterests).values(gi);

    const expressionId = createId();
    await db.insert(schema.geoInterestExpressions).values({
      id: expressionId,
      humanId: human.id,
      geoInterestId: gi.id,
      activityId: null,
      notes: null,
      createdAt: new Date().toISOString(),
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/geo-interest-expressions/${expressionId}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
