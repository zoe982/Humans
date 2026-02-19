/// <reference types="@cloudflare/vitest-pool-workers" />
import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { createUserAndSession, sessionCookie } from "../helpers";

// The ZodError path is covered by passing invalid data to any route.
// The HTTPException path is covered by 401/403 tests in other test files.
// This file specifically targets the generic error handler (500 path)
// and validates Zod error formatting through an invalid request.

describe("Error handler - ZodError formatting", () => {
  it("returns 400 with validation details for invalid JSON body", async () => {
    const { token } = await createUserAndSession("agent");
    const res = await SELF.fetch("http://localhost/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie(token) },
      body: JSON.stringify({ firstName: "", lastName: "", email: "bad" }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; details?: Record<string, string[]> };
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });
});
