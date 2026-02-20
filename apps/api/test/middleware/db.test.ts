/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie } from "../helpers";

describe("db middleware", () => {
  it("sets drizzle instance enabling database operations", async () => {
    const { token } = await createUserAndSession("agent");
    // If db middleware didn't work, any route touching the DB would fail.
    // humans list is the simplest route that hits the DB.
    const res = await SELF.fetch("http://localhost/api/humans", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
  });
});
