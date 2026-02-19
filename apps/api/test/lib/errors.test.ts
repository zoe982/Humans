import { describe, it, expect } from "vitest";
import { AppError, notFound, badRequest, forbidden, unauthorized, conflict, internal } from "../../src/lib/errors";

describe("AppError class", () => {
  it("extends Error with code, status, details", () => {
    const err = new AppError("HUMAN_NOT_FOUND", 404, "Human not found", { id: "abc" });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AppError");
    expect(err.code).toBe("HUMAN_NOT_FOUND");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Human not found");
    expect(err.details).toEqual({ id: "abc" });
  });
});

describe("Factory functions", () => {
  it("notFound creates 404 AppError", () => {
    const err = notFound("HUMAN_NOT_FOUND", "Human not found");
    expect(err.status).toBe(404);
    expect(err.code).toBe("HUMAN_NOT_FOUND");
  });

  it("badRequest creates 400 AppError with optional details", () => {
    const err = badRequest("VALIDATION_FAILED", "Invalid input", { name: ["required"] });
    expect(err.status).toBe(400);
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(err.details).toEqual({ name: ["required"] });
  });

  it("forbidden creates 403 AppError", () => {
    const err = forbidden("AUTH_ACCESS_DENIED", "Access denied");
    expect(err.status).toBe(403);
  });

  it("unauthorized creates 401 AppError", () => {
    const err = unauthorized("AUTH_REQUIRED", "Auth required");
    expect(err.status).toBe(401);
  });

  it("conflict creates 409 AppError", () => {
    const err = conflict("COLLEAGUE_EMAIL_EXISTS", "Already exists");
    expect(err.status).toBe(409);
  });

  it("internal creates 500 AppError", () => {
    const err = internal("INTERNAL_ERROR", "Something broke");
    expect(err.status).toBe(500);
  });
});
