/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../../helpers";
import * as schema from "@humans/db/schema";
import { buildColleague, buildOpportunity, buildGeneralLead } from "@humans/test-utils";

const BASE = "http://localhost/api/reports/next-actions";


async function seedDisplayIdCounters() {
  const db = getDb();
  await db.insert(schema.displayIdCounters).values({ prefix: "OPP", counter: 0 }).onConflictDoNothing();
  await db.insert(schema.displayIdCounters).values({ prefix: "LEA", counter: 0 }).onConflictDoNothing();
  await db.insert(schema.displayIdCounters).values({ prefix: "ACT", counter: 0 }).onConflictDoNothing();
}

async function seedEntityNextAction(
  overrides: Partial<typeof schema.entityNextActions.$inferInsert> = {},
) {
  const db = getDb();
  const id = overrides.id ?? `ena-${crypto.randomUUID()}`;
  const ts = new Date().toISOString();
  await db.insert(schema.entityNextActions).values({
    id,
    entityType: "general_lead",
    entityId: "gl-test-1",
    ownerId: null,
    description: "Follow up call",
    type: "phone_call",
    dueDate: null,
    startDate: null,
    completedAt: null,
    cadenceNote: null,
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  });
  return id;
}

describe("GET /api/reports/next-actions", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(BASE);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no next actions exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns entity_next_actions items for general leads", async () => {
    const db = getDb();
    await seedDisplayIdCounters();
    const lead = buildGeneralLead({ id: "gl-na-test", firstName: "Alice", lastName: "Smith" });
    await db.insert(schema.generalLeads).values(lead);
    await seedEntityNextAction({
      entityType: "general_lead",
      entityId: "gl-na-test",
      description: "Send email to Alice",
      type: "email",
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    const item = body.data.find((d) => d["entityId"] === "gl-na-test");
    expect(item).toBeDefined();
    expect(item?.["entityType"]).toBe("general_lead");
    expect(item?.["description"]).toBe("Send email to Alice");
    expect(item?.["type"]).toBe("email");
    expect(item?.["entityLabel"]).toBe("Alice Smith");
  });

  it("returns opportunity next actions", async () => {
    const db = getDb();
    await seedDisplayIdCounters();
    const opp = buildOpportunity({
      id: "opp-na-test",
      nextActionDescription: "Call client",
      nextActionType: "phone_call",
      nextActionDueDate: "2099-12-31T00:00:00.000Z",
      nextActionCompletedAt: null,
    });
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    const item = body.data.find((d) => d["entityId"] === "opp-na-test");
    expect(item).toBeDefined();
    expect(item?.["entityType"]).toBe("opportunity");
    expect(item?.["description"]).toBe("Call client");
    expect(item?.["isOverdue"]).toBe(false);
  });

  it("filters entity_next_actions by colleagueId", async () => {
    const db = getDb();
    const col1 = buildColleague({ id: "col-filter-1" });
    const col2 = buildColleague({ id: "col-filter-2" });
    await db.insert(schema.colleagues).values([col1, col2]);

    await seedEntityNextAction({
      id: "ena-col1",
      entityType: "general_lead",
      entityId: "gl-col-1",
      ownerId: "col-filter-1",
      description: "Action for col1",
    });
    await seedEntityNextAction({
      id: "ena-col2",
      entityType: "general_lead",
      entityId: "gl-col-2",
      ownerId: "col-filter-2",
      description: "Action for col2",
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}?colleagueId=col-filter-1`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    const ids = body.data.map((d) => d["entityId"]);
    expect(ids).toContain("gl-col-1");
    expect(ids).not.toContain("gl-col-2");
  });

  it("filters opportunities by colleagueId", async () => {
    const db = getDb();
    await seedDisplayIdCounters();
    const col1 = buildColleague({ id: "col-opp-filter-1" });
    const col2 = buildColleague({ id: "col-opp-filter-2" });
    await db.insert(schema.colleagues).values([col1, col2]);

    const opp1 = buildOpportunity({
      id: "opp-owner-1",
      nextActionOwnerId: "col-opp-filter-1",
      nextActionDescription: "Opp 1 action",
      nextActionCompletedAt: null,
    });
    const opp2 = buildOpportunity({
      id: "opp-owner-2",
      nextActionOwnerId: "col-opp-filter-2",
      nextActionDescription: "Opp 2 action",
      nextActionCompletedAt: null,
    });
    await db.insert(schema.opportunities).values([opp1, opp2]);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(`${BASE}?colleagueId=col-opp-filter-1`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    const ids = body.data.map((d) => d["entityId"]);
    expect(ids).toContain("opp-owner-1");
    expect(ids).not.toContain("opp-owner-2");
  });

  it("excludes completed entity_next_actions", async () => {
    await seedEntityNextAction({
      id: "ena-completed",
      entityType: "general_lead",
      entityId: "gl-completed",
      description: "Completed action",
      completedAt: "2026-01-01T00:00:00.000Z",
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    const ids = body.data.map((d) => d["entityId"]);
    expect(ids).not.toContain("gl-completed");
  });

  it("excludes completed opportunity next actions", async () => {
    const db = getDb();
    await seedDisplayIdCounters();
    const opp = buildOpportunity({
      id: "opp-completed-na",
      nextActionDescription: "Completed opp action",
      nextActionCompletedAt: "2026-01-01T00:00:00.000Z",
    });
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    const ids = body.data.map((d) => d["entityId"]);
    expect(ids).not.toContain("opp-completed-na");
  });

  it("excludes opportunities with null nextActionDescription", async () => {
    const db = getDb();
    await seedDisplayIdCounters();
    const opp = buildOpportunity({
      id: "opp-no-action",
      nextActionDescription: null,
      nextActionCompletedAt: null,
    });
    await db.insert(schema.opportunities).values(opp);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    const ids = body.data.map((d) => d["entityId"]);
    expect(ids).not.toContain("opp-no-action");
  });

  it("sets isOverdue=true when dueDate is in the past", async () => {
    await seedEntityNextAction({
      id: "ena-overdue",
      entityType: "general_lead",
      entityId: "gl-overdue",
      description: "Overdue action",
      dueDate: "2020-01-01T00:00:00.000Z",
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    const item = body.data.find((d) => d["entityId"] === "gl-overdue");
    expect(item?.["isOverdue"]).toBe(true);
  });

  it("sets isOverdue=false when dueDate is in the future", async () => {
    await seedEntityNextAction({
      id: "ena-future",
      entityType: "general_lead",
      entityId: "gl-future",
      description: "Future action",
      dueDate: "2099-12-31T00:00:00.000Z",
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    const item = body.data.find((d) => d["entityId"] === "gl-future");
    expect(item?.["isOverdue"]).toBe(false);
  });

  it("resolves colleague owner name in response", async () => {
    const db = getDb();
    const col = buildColleague({ id: "col-resolve", firstName: "Jane", lastName: "Doe", name: "Jane Doe" });
    await db.insert(schema.colleagues).values(col);

    await seedEntityNextAction({
      id: "ena-owner-name",
      entityType: "general_lead",
      entityId: "gl-owner-name",
      description: "Owned action",
      ownerId: "col-resolve",
    });

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    const item = body.data.find((d) => d["entityId"] === "gl-owner-name");
    expect(item?.["ownerName"]).toBe("Jane Doe");
    expect(item?.["ownerId"]).toBe("col-resolve");
  });
});
