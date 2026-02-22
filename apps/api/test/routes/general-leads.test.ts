/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildGeneralLead, buildHuman, buildActivity, buildColleague } from "@humans/test-utils";

const BASE = "http://localhost/api/general-leads";

function jsonHeaders(token: string) {
  return { "Content-Type": "application/json", Cookie: sessionCookie(token) };
}

async function seedDisplayIdCounter() {
  const db = getDb();
  await db.insert(schema.displayIdCounters).values({ prefix: "LEA", counter: 0 }).onConflictDoNothing();
  await db.insert(schema.displayIdCounters).values({ prefix: "ACT", counter: 0 }).onConflictDoNothing();
}

// ─── CRUD ────────────────────────────────────────────────────────

describe("GET /api/general-leads", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(BASE);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no leads exist", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[]; meta: { total: number } };
    expect(body.data).toHaveLength(0);
    expect(body.meta.total).toBe(0);
  });

  it("returns list of general leads", async () => {
    const db = getDb();
    const l1 = buildGeneralLead({ source: "email" });
    const l2 = buildGeneralLead({ source: "whatsapp" });
    await db.insert(schema.generalLeads).values([l1, l2]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; source: string }[]; meta: { total: number } };
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
  });

  it("filters by status", async () => {
    const db = getDb();
    await db.insert(schema.generalLeads).values([
      buildGeneralLead({ status: "open" }),
      buildGeneralLead({ status: "qualified" }),
    ]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}?status=qualified`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.status).toBe("qualified");
  });

  it("filters by source", async () => {
    const db = getDb();
    await db.insert(schema.generalLeads).values([
      buildGeneralLead({ source: "whatsapp" }),
      buildGeneralLead({ source: "email" }),
    ]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}?source=whatsapp`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { source: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.source).toBe("whatsapp");
  });

  it("filters by search query on displayId", async () => {
    const db = getDb();
    const lead = buildGeneralLead({ displayId: "LEA-alpha-042" });
    await db.insert(schema.generalLeads).values([lead, buildGeneralLead()]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}?q=alpha-042`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.id).toBe(lead.id);
  });

  it("includes owner name", async () => {
    const db = getDb();
    const owner = buildColleague({ name: "Jane Smith" });
    await db.insert(schema.colleagues).values(owner);
    const lead = buildGeneralLead({ ownerId: owner.id });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { ownerName: string | null }[] };
    expect(body.data[0]!.ownerName).toBe("Jane Smith");
  });

  it("denies viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/general-leads/:id", () => {
  it("returns lead detail with activities", async () => {
    const db = getDb();
    const { user } = await createUserAndSession("agent");
    const lead = buildGeneralLead();
    await db.insert(schema.generalLeads).values(lead);

    const activity = buildActivity({ generalLeadId: lead.id, humanId: null, routeSignupId: null, colleagueId: user.id });
    await db.insert(schema.activities).values(activity);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; displayId: string; activities: { id: string }[] } };
    expect(body.data.id).toBe(lead.id);
    expect(body.data.displayId).toBe(lead.displayId);
    expect(body.data.activities).toHaveLength(1);
    expect(body.data.activities[0]!.id).toBe(activity.id);
  });

  it("returns 404 for non-existent lead", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/non-existent`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/general-leads", () => {
  it("creates a lead with display ID", async () => {
    await seedDisplayIdCounter();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ source: "email", notes: "Test lead" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; displayId: string } };
    expect(body.data.displayId).toMatch(/^LEA-/);
  });

  it("creates with correct defaults", async () => {
    await seedDisplayIdCounter();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ source: "whatsapp" }),
    });
    expect(res.status).toBe(201);

    // Verify the created lead
    const { data: created } = (await res.json()) as { data: { id: string } };
    const { token: t2 } = await createUserAndSession("agent");
    const detail = await SELF.fetch(`${BASE}/${created.id}`, {
      headers: { Cookie: sessionCookie(t2) },
    });
    const detailBody = (await detail.json()) as { data: { status: string; source: string } };
    expect(detailBody.data.status).toBe("open");
    expect(detailBody.data.source).toBe("whatsapp");
  });

  it("rejects invalid source", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ source: "invalid" }),
    });
    expect(res.status).toBe(400);
  });

  it("denies viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ source: "email" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/general-leads/:id", () => {
  it("updates notes", async () => {
    const db = getDb();
    const lead = buildGeneralLead();
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ notes: "Updated notes" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { notes: string } };
    expect(body.data.notes).toBe("Updated notes");
  });

  it("blocks owner change on closed lead", async () => {
    const db = getDb();
    const lead = buildGeneralLead({ status: "closed_rejected", rejectReason: "Not a fit" });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ ownerId: "some-id" }),
    });
    expect(res.status).toBe(400);
  });

  it("allows notes update on closed lead", async () => {
    const db = getDb();
    const lead = buildGeneralLead({ status: "closed_rejected", rejectReason: "Not a fit" });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ notes: "Additional context" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { notes: string } };
    expect(body.data.notes).toBe("Additional context");
  });
});

// ─── Status transitions ──────────────────────────────────────────

describe("PATCH /api/general-leads/:id/status", () => {
  it("transitions open → qualified", async () => {
    const db = getDb();
    const lead = buildGeneralLead({ status: "open" });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}/status`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ status: "qualified" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string } };
    expect(body.data.status).toBe("qualified");
  });

  it("transitions to closed_rejected with reject reason", async () => {
    const db = getDb();
    const lead = buildGeneralLead({ status: "open" });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}/status`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ status: "closed_rejected", rejectReason: "Not a real lead" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string; rejectReason: string } };
    expect(body.data.status).toBe("closed_rejected");
    expect(body.data.rejectReason).toBe("Not a real lead");
  });

  it("rejects closed_rejected without reject reason", async () => {
    const db = getDb();
    const lead = buildGeneralLead({ status: "open" });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}/status`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ status: "closed_rejected" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects closed_converted via status endpoint", async () => {
    const db = getDb();
    const lead = buildGeneralLead({ status: "open" });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}/status`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ status: "closed_converted" }),
    });
    expect(res.status).toBe(400);
  });

  it("blocks transition from closed status", async () => {
    const db = getDb();
    const lead = buildGeneralLead({ status: "closed_rejected", rejectReason: "No" });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}/status`, {
      method: "PATCH",
      headers: jsonHeaders(token),
      body: JSON.stringify({ status: "open" }),
    });
    expect(res.status).toBe(400);
  });
});

// ─── Conversion ──────────────────────────────────────────────────

describe("POST /api/general-leads/:id/convert", () => {
  it("converts lead to human", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const lead = buildGeneralLead({ status: "open" });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}/convert`, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ humanId: human.id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string; convertedHumanId: string } };
    expect(body.data.status).toBe("closed_converted");
    expect(body.data.convertedHumanId).toBe(human.id);
  });

  it("converts qualified lead", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const lead = buildGeneralLead({ status: "qualified" });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}/convert`, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ humanId: human.id }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string } };
    expect(body.data.status).toBe("closed_converted");
  });

  it("rejects conversion of already closed lead", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);
    const lead = buildGeneralLead({ status: "closed_converted", convertedHumanId: human.id });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}/convert`, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ humanId: human.id }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects conversion with non-existent human", async () => {
    const db = getDb();
    const lead = buildGeneralLead({ status: "open" });
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}/convert`, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ humanId: "non-existent" }),
    });
    expect(res.status).toBe(404);
  });
});

// ─── Delete ──────────────────────────────────────────────────────

describe("DELETE /api/general-leads/:id", () => {
  it("deletes a lead (admin only)", async () => {
    const db = getDb();
    const lead = buildGeneralLead();
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch(`${BASE}/${lead.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);

    // Verify it's gone
    const { token: t2 } = await createUserAndSession("agent");
    const check = await SELF.fetch(`${BASE}/${lead.id}`, {
      headers: { Cookie: sessionCookie(t2) },
    });
    expect(check.status).toBe(404);
  });

  it("denies delete for agent role", async () => {
    const db = getDb();
    const lead = buildGeneralLead();
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}/${lead.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(403);
  });

  it("nullifies generalLeadId on linked activities", async () => {
    const db = getDb();
    const { user, token } = await createUserAndSession("admin");
    const lead = buildGeneralLead();
    await db.insert(schema.generalLeads).values(lead);
    const activity = buildActivity({ generalLeadId: lead.id, humanId: null, routeSignupId: null, colleagueId: user.id });
    await db.insert(schema.activities).values(activity);
    await SELF.fetch(`${BASE}/${lead.id}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(token) },
    });

    // Activity should still exist but with null generalLeadId
    const remaining = await db.select().from(schema.activities).where(
      eq(schema.activities.id, activity.id),
    );
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.generalLeadId).toBeNull();
  });
});

// ─── Activities linking ──────────────────────────────────────────

describe("Activities linked to general leads", () => {
  it("creates activity with generalLeadId via API", async () => {
    await seedDisplayIdCounter();
    const db = getDb();
    const lead = buildGeneralLead();
    await db.insert(schema.generalLeads).values(lead);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/activities", {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({
        type: "whatsapp_message",
        subject: "Initial enquiry",
        activityDate: new Date().toISOString(),
        generalLeadId: lead.id,
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { generalLeadId: string } };
    expect(body.data.generalLeadId).toBe(lead.id);
  });

  it("filters activities by generalLeadId", async () => {
    const db = getDb();
    const { user } = await createUserAndSession("agent");
    const lead = buildGeneralLead();
    await db.insert(schema.generalLeads).values(lead);
    const act1 = buildActivity({ generalLeadId: lead.id, humanId: null, routeSignupId: null, colleagueId: user.id });
    const act2 = buildActivity({ humanId: null, routeSignupId: null, colleagueId: user.id });
    await db.insert(schema.activities).values([act1, act2]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`http://localhost/api/activities?generalLeadId=${lead.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]!.id).toBe(act1.id);
  });
});

// ─── Display ID generation ───────────────────────────────────────

describe("Lead code generation", () => {
  it("generates LEA-alpha-001 as first code", async () => {
    await seedDisplayIdCounter();
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ source: "email" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { displayId: string } };
    expect(body.data.displayId).toBe("LEA-alpha-001");
  });

  it("increments codes correctly", async () => {
    await seedDisplayIdCounter();
    const { token } = await createUserAndSession("agent");

    // Create first
    await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ source: "email" }),
    });

    // Create second
    const res2 = await SELF.fetch(BASE, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ source: "whatsapp" }),
    });
    expect(res2.status).toBe(201);
    const body2 = (await res2.json()) as { data: { displayId: string } };
    expect(body2.data.displayId).toBe("LEA-alpha-002");
  });
});
