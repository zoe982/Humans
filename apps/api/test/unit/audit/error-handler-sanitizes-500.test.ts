import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { AppError } from "../../../src/lib/errors";
import { ERROR_CODES } from "@humans/shared";

/**
 * Audit test: the error handler must sanitize 500 responses.
 *
 * - `details` must be stripped (set to null) for 500 errors to prevent
 *   leaking internal state (stack traces, DB query details, host names, etc.)
 * - `error` message must be replaced with a generic string for unknown errors
 *   so real exception messages never reach the client.
 * - 4xx errors are NOT sanitized — field-level validation details must be
 *   preserved so the client can display helpful form errors.
 */

describe("error handler sanitizes 500 responses", () => {
  it("strips details from 500 AppError responses", async () => {
    const { errorHandler } = await import("../../../src/middleware/error-handler");
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("requestId", "test-req-id");
      c.set("session", null);
      await next();
    });
    app.get("/test", () => {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, 500, "DB connection failed", {
        host: "db.internal",
        port: 5432,
      });
    });
    app.onError(errorHandler);

    const res = await app.request("/test");
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.details).toBeNull();
    expect(body.error).toBe("An internal error occurred");
    expect(body.code).toBe("INTERNAL_ERROR");
  });

  it("preserves details on 400 AppError responses", async () => {
    const { errorHandler } = await import("../../../src/middleware/error-handler");
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("requestId", "test-req-id");
      c.set("session", null);
      await next();
    });
    app.get("/test", () => {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, 400, "Bad input", { field: "name" });
    });
    app.onError(errorHandler);

    const res = await app.request("/test");
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.details).toEqual({ field: "name" });
    expect(body.error).toBe("Bad input");
  });

  it("masks unknown errors as generic 500", async () => {
    const { errorHandler } = await import("../../../src/middleware/error-handler");
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("requestId", "test-req-id");
      c.set("session", null);
      await next();
    });
    app.get("/test", () => {
      throw new Error("Connection to db.internal:5432 refused");
    });
    app.onError(errorHandler);

    const res = await app.request("/test");
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.details).toBeNull();
    expect(body.error).toBe("An internal error occurred");
  });
});
