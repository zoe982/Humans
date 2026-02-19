/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildHuman, buildAccount, buildActivity } from "@humans/test-utils";

describe("GET /api/activities", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch("http://localhost/api/activities");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no activities exist", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/activities", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });

  it("returns list of activities", async () => {
    const db = getDb();
    const { user, token } = await createUserAndSession("agent");
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const a1 = buildActivity({ humanId: human.id, createdByColleagueId: user.id, subject: "Activity 1" });
    const a2 = buildActivity({ humanId: human.id, createdByColleagueId: user.id, subject: "Activity 2" });
    await db.insert(schema.activities).values([a1, a2]);

    const res = await SELF.fetch("http://localhost/api/activities", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(2);
  });

  it("filters activities by humanId", async () => {
    const db = getDb();
    const { user, token } = await createUserAndSession("agent");
    const human1 = buildHuman({ firstName: "Alice" });
    const human2 = buildHuman({ firstName: "Bob" });
    await db.insert(schema.humans).values([human1, human2]);

    const a1 = buildActivity({ humanId: human1.id, createdByColleagueId: user.id, subject: "For Alice" });
    const a2 = buildActivity({ humanId: human2.id, createdByColleagueId: user.id, subject: "For Bob" });
    await db.insert(schema.activities).values([a1, a2]);

    const res = await SELF.fetch(`http://localhost/api/activities?humanId=${human1.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(1);
  });
});

describe("GET /api/activities/:id", () => {
  it("returns 404 for non-existent activity", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/activities/nonexistent", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found");
  });

  it("returns activity by id", async () => {
    const db = getDb();
    const { user, token } = await createUserAndSession("agent");
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const activity = buildActivity({
      humanId: human.id,
      createdByColleagueId: user.id,
      subject: "Find this",
    });
    await db.insert(schema.activities).values(activity);

    const res = await SELF.fetch(`http://localhost/api/activities/${activity.id}`, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string; subject: string } };
    expect(body.data.id).toBe(activity.id);
    expect(body.data.subject).toBe("Find this");
  });
});

describe("POST /api/activities", () => {
  it("returns 403 for viewer role", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({
        type: "email",
        subject: "Test",
        activityDate: new Date().toISOString(),
        humanId: "some-id",
      }),
    });
    expect(res.status).toBe(403);
  });

  it("creates activity with humanId and returns 201", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({
        type: "email",
        subject: "New email activity",
        activityDate: new Date().toISOString(),
        humanId: human.id,
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; humanId: string; subject: string } };
    expect(body.data.id).toBeDefined();
    expect(body.data.humanId).toBe(human.id);
    expect(body.data.subject).toBe("New email activity");
  });

  it("creates activity with accountId and returns 201", async () => {
    const db = getDb();
    const account = buildAccount();
    await db.insert(schema.accounts).values(account);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({
        type: "email",
        subject: "Account email activity",
        activityDate: new Date().toISOString(),
        accountId: account.id,
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string; accountId: string } };
    expect(body.data.accountId).toBe(account.id);
  });

  it("returns 400 when email type is missing subject", async () => {
    const db = getDb();
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({
        type: "email",
        activityDate: new Date().toISOString(),
        humanId: human.id,
      }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when no humanId, accountId, or routeSignupId provided", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({
        type: "phone_call",
        activityDate: new Date().toISOString(),
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/activities/:id", () => {
  it("returns 404 for non-existent activity", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/activities/nonexistent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ subject: "Updated" }),
    });
    expect(res.status).toBe(404);
  });

  it("updates activity successfully", async () => {
    const db = getDb();
    const { user, token } = await createUserAndSession("agent");
    const human = buildHuman();
    await db.insert(schema.humans).values(human);

    const activity = buildActivity({
      humanId: human.id,
      createdByColleagueId: user.id,
      subject: "Old subject",
    });
    await db.insert(schema.activities).values(activity);

    const res = await SELF.fetch(`http://localhost/api/activities/${activity.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ subject: "Updated subject" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { subject: string } };
    expect(body.data.subject).toBe("Updated subject");
  });
});
