import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ApiErrorResponse is the documented contract shape
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ApiErrorResponse is the documented contract shape
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ApiErrorResponse is the documented contract shape
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ApiErrorResponse is the documented contract shape
    const body = (await res.json()) as ApiErrorResponse;
    expect(body.error).toBe("Validation failed");
    expect(body.code).toBe("VALIDATION_FAILED");
  });
});

describe("error handler — HTTPException code mapping", () => {
  it("maps 'Authentication required' to AUTH_REQUIRED", async () => {
    const app = createTestApp();
    app.get("/no-auth", () => {
      throw new HTTPException(401, { message: "Authentication required" });
    });

    const res = await app.request("/no-auth");
    expect(res.status).toBe(401);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ApiErrorResponse is the documented contract shape
    const body = (await res.json()) as ApiErrorResponse;
    expect(body.code).toBe("AUTH_REQUIRED");
    expect(body.error).toBe("Authentication required");
  });

  it("maps 'Invalid or expired session' to AUTH_INVALID_SESSION", async () => {
    const app = createTestApp();
    app.get("/bad-session", () => {
      throw new HTTPException(401, { message: "Invalid or expired session" });
    });

    const res = await app.request("/bad-session");
    expect(res.status).toBe(401);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ApiErrorResponse is the documented contract shape
    const body = (await res.json()) as ApiErrorResponse;
    expect(body.code).toBe("AUTH_INVALID_SESSION");
    expect(body.error).toBe("Invalid or expired session");
  });

  it("maps 'Insufficient permissions' to AUTH_INSUFFICIENT_PERMS", async () => {
    const app = createTestApp();
    app.get("/no-perms", () => {
      throw new HTTPException(403, { message: "Insufficient permissions" });
    });

    const res = await app.request("/no-perms");
    expect(res.status).toBe(403);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ApiErrorResponse is the documented contract shape
    const body = (await res.json()) as ApiErrorResponse;
    expect(body.code).toBe("AUTH_INSUFFICIENT_PERMS");
    expect(body.error).toBe("Insufficient permissions");
  });

  it("falls back to INTERNAL_ERROR for unmapped HTTPException messages", async () => {
    const app = createTestApp();
    app.get("/other", () => {
      throw new HTTPException(418, { message: "I'm a teapot" });
    });

    const res = await app.request("/other");
    expect(res.status).toBe(418);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ApiErrorResponse is the documented contract shape
    const body = (await res.json()) as ApiErrorResponse;
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.error).toBe("I'm a teapot");
  });
});
