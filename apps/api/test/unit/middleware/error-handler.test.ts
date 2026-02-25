import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { ZodError } from "zod";
import { errorHandler } from "../../../src/middleware/error-handler";
import { AppError } from "../../../src/lib/errors";
import type { ApiErrorResponse } from "../../../src/lib/errors";

// Minimal context type for testing
type TestContext = {
  Bindings: Record<string, never>;
  Variables: {
    requestId: string;
    session: null;
    db: unknown;
  };
};

function createTestApp() {
  const app = new Hono<TestContext>();
  app.use("/*", async (c, next) => {
    c.set("requestId", "test-req-id");
    c.set("session", null);
    await next();
  });
  app.onError(errorHandler);
  return app;
}

describe("error handler — information disclosure hardening", () => {
  it("returns generic message for unknown 500 errors instead of real error", async () => {
    const app = createTestApp();
    app.get("/boom", () => {
      throw new Error("SQLITE_CONSTRAINT: UNIQUE constraint failed: humans.email");
    });

    const res = await app.request("/boom");
    expect(res.status).toBe(500);
    const body = (await res.json()) as ApiErrorResponse;
    // Must NOT contain the real DB error
    expect(body.error).toBe("An internal error occurred");
    expect(body.error).not.toContain("SQLITE");
    expect(body.error).not.toContain("constraint");
  });

  it("returns generic message for generic Error with sensitive stack info", async () => {
    const app = createTestApp();
    app.get("/boom", () => {
      throw new TypeError("Cannot read properties of undefined (reading 'password')");
    });

    const res = await app.request("/boom");
    expect(res.status).toBe(500);
    const body = (await res.json()) as ApiErrorResponse;
    expect(body.error).toBe("An internal error occurred");
    expect(body.error).not.toContain("password");
  });

  it("preserves AppError message (these are intentional user-facing messages)", async () => {
    const app = createTestApp();
    app.get("/not-found", () => {
      throw new AppError("HUMAN_NOT_FOUND", 404, "Human not found");
    });

    const res = await app.request("/not-found");
    expect(res.status).toBe(404);
    const body = (await res.json()) as ApiErrorResponse;
    expect(body.error).toBe("Human not found");
  });

  it("preserves Zod validation message", async () => {
    const app = createTestApp();
    app.get("/bad", () => {
      throw new ZodError([
        {
          code: "too_small",
          minimum: 1,
          type: "string",
          inclusive: true,
          exact: false,
          message: "String must contain at least 1 character(s)",
          path: ["name"],
        },
      ]);
    });

    const res = await app.request("/bad");
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiErrorResponse;
    expect(body.error).toBe("Validation failed");
    expect(body.code).toBe("VALIDATION_FAILED");
  });
});
