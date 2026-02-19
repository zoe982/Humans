import type { ErrorCode } from "@humans/shared";

/**
 * Structured application error.
 * Thrown from route handlers and caught by the global error handler.
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Standardized JSON error response shape. */
export interface ApiErrorResponse {
  error: string;
  code: ErrorCode;
  requestId: string;
  details: unknown | null;
}

// Factory functions

export function notFound(code: ErrorCode, message: string): AppError {
  return new AppError(code, 404, message);
}

export function badRequest(code: ErrorCode, message: string, details?: unknown): AppError {
  return new AppError(code, 400, message, details);
}

export function forbidden(code: ErrorCode, message: string): AppError {
  return new AppError(code, 403, message);
}

export function unauthorized(code: ErrorCode, message: string): AppError {
  return new AppError(code, 401, message);
}

export function conflict(code: ErrorCode, message: string): AppError {
  return new AppError(code, 409, message);
}

export function internal(code: ErrorCode, message: string): AppError {
  return new AppError(code, 500, message);
}
