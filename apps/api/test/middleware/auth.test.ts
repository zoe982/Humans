/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie } from "../helpers";

describe("auth middleware", () => {
  it("returns 401 when no cookie is present", async () => {
    const res = await SELF.fetch("http://localhost/api/humans");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("returns 401 when session token is invalid", async () => {
    const res = await SELF.fetch("http://localhost/api/humans", {
      headers: { Cookie: sessionCookie("invalid-token-that-does-not-exist") },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("AUTH_INVALID_SESSION");
  });

  it("allows access with valid session", async () => {
    const { token } = await createUserAndSession("viewer");
    const res = await SELF.fetch("http://localhost/api/humans", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(200);
  });
});
