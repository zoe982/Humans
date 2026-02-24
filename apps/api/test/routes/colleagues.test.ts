/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie, getDb } from "../helpers";
import * as schema from "@humans/db/schema";
import { buildColleague } from "@humans/test-utils";

const BASE = "http://localhost/api/colleagues";

// ─── GET /api/colleagues ─────────────────────────────────────────

describe("GET /api/colleagues", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await SELF.fetch(BASE);
    expect(res.status).toBe(401);
  });

  it("returns list including the authenticated colleague", async () => {
    // createUserAndSession seeds one colleague into the DB
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    // At minimum the session colleague is present
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("returns all seeded colleagues", async () => {
    const db = getDb();
    const c1 = buildColleague({ firstName: "Alice", lastName: "Nguyen", role: "agent" });
    const c2 = buildColleague({ firstName: "Bob", lastName: "Chen", role: "manager" });
    await db.insert(schema.colleagues).values([c1, c2]);

    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ id: string; firstName: string; lastName: string }> };
    const ids = body.data.map((c) => c.id);
    expect(ids).toContain(c1.id);
    expect(ids).toContain(c2.id);
    const alice = body.data.find((c) => c.id === c1.id);
    expect(alice).toBeDefined();
    expect(alice!.firstName).toBe("Alice");
    expect(alice!.lastName).toBe("Nguyen");
  });

  it("viewer role can list colleagues", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
  });

  it("admin role can list colleagues", async () => {
    const { token } = await createUserAndSession("admin");
    const res = await SELF.fetch(BASE, {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
  });
});
