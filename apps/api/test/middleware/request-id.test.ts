/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie } from "../helpers";

describe("request-id middleware", () => {
  it("sets X-Request-Id header on response", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/health", {
      headers: { Cookie: sessionCookie(token) },
    });
    const requestId = res.headers.get("X-Request-Id");
    expect(requestId).not.toBeNull();
    expect(typeof requestId).toBe("string");
  });

  it("generates unique request IDs", async () => {
    const { token } = await createUserAndSession("viewer");
    const res1 = await SELF.fetch("http://localhost/api/health", {
      headers: { Cookie: sessionCookie(token) },
    });
    const res2 = await SELF.fetch("http://localhost/api/health", {
      headers: { Cookie: sessionCookie(token) },
    });
    const id1 = res1.headers.get("X-Request-Id");
    const id2 = res2.headers.get("X-Request-Id");
    expect(id1).not.toBe(id2);
  });

  it("includes request ID in error responses", async () => {
    const res = await SELF.fetch("http://localhost/api/humans");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { requestId: string };
    expect(body.requestId).toBeDefined();
    expect(typeof body.requestId).toBe("string");
  });
});
