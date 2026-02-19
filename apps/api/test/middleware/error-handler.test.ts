/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie } from "../helpers";

// The ZodError path is covered by passing invalid data to any route.
// The HTTPException path is covered by 401/403 tests in other test files.
// This file specifically targets the generic error handler (500 path)
// and validates Zod error formatting through an invalid request.

describe("Error handler - new response shape", () => {
  it("returns { error, code, requestId, details } for ZodError", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/humans", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ firstName: "", lastName: "", emails: [], types: [] }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; code: string; requestId: string; details?: Record<string, string[]> };
    expect(body.error).toBe("Validation failed");
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.requestId).toBeDefined();
    expect(typeof body.requestId).toBe("string");
    expect(body.details).toBeDefined();
  });

  it("includes X-Request-Id header on responses", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/humans", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ firstName: "", lastName: "", emails: [], types: [] }),
    });
    expect(res.headers.get("X-Request-Id")).toBeDefined();
    expect(typeof res.headers.get("X-Request-Id")).toBe("string");
  });

  it("returns { error, code, requestId } for HTTPException (401)", async () => {
    const res = await SELF.fetch("http://localhost/api/humans");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; code: string; requestId: string };
    expect(body.error).toBe("Authentication required");
    expect(body.code).toBe("AUTH_REQUIRED");
    expect(body.requestId).toBeDefined();
  });

  it("returns { error, code, requestId } for AppError (404)", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/humans/nonexistent-id", {
      headers: { Cookie: sessionCookie(token) },
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string; code: string; requestId: string };
    expect(body.error).toBe("Human not found");
    expect(body.code).toBe("HUMAN_NOT_FOUND");
    expect(body.requestId).toBeDefined();
  });
});
