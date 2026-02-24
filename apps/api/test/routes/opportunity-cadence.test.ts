/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";

async function seedCadenceConfig(id: string, stage: string, cadenceHours: number, displayText: string) {
  const db = getDb();
  const ts = new Date().toISOString();
  await db.insert(schema.opportunityStageCadenceConfig).values({
    id,
    stage,
    cadenceHours,
    displayText,
    createdAt: ts,
    updatedAt: ts,
  });
}

describe("GET /api/opportunity-cadence", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/opportunity-cadence");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no configs exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/opportunity-cadence", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns list of cadence configs", async () => {
    await seedCadenceConfig("cad-1", "discovery", 48, "Follow up within 2 days");
    await seedCadenceConfig("cad-2", "proposal", 72, "Follow up within 3 days");

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/opportunity-cadence", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; stage: string; cadenceHours: number }[] };
    expect(body.data).toHaveLength(2);
    expect(body.data[0]!.stage).toBe("discovery");
    expect(body.data[0]!.cadenceHours).toBe(48);
  });
});

describe("PATCH /api/admin/opportunity-cadence/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/admin/opportunity-cadence/cad-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cadenceHours: 24, displayText: "1 day" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/admin/opportunity-cadence/cad-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ cadenceHours: 24, displayText: "1 day" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent config", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/opportunity-cadence/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ cadenceHours: 24, displayText: "1 day" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates cadence config and returns updated record", async () => {
    await seedCadenceConfig("cad-upd", "negotiation", 96, "Follow up within 4 days");

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch("http://localhost/api/admin/opportunity-cadence/cad-upd", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ cadenceHours: 24, displayText: "Follow up within 1 day" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; cadenceHours: number; displayText: string } };
    expect(body.data.id).toBe("cad-upd");
    expect(body.data.cadenceHours).toBe(24);
    expect(body.data.displayText).toBe("Follow up within 1 day");
  });
});
