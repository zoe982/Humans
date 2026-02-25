import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { ERROR_CODES, type ErrorCode } from "@humans/shared";
import { AppError, type ApiErrorResponse } from "../lib/errors";
import { logError } from "../lib/logger";
import { persistError } from "../lib/error-logger";
import type { AppContext } from "../types";
import type { StatusCode } from "hono/utils/http-status";

/** Map known HTTPException messages to error codes. */
const httpMessageToCode: ReadonlyMap<string, ErrorCode> = new Map([
  ["Authentication required", ERROR_CODES.AUTH_REQUIRED],
  ["Invalid or expired session", ERROR_CODES.AUTH_INVALID_SESSION],
  ["Insufficient permissions", ERROR_CODES.AUTH_INSUFFICIENT_PERMS],
]);

export const errorHandler: ErrorHandler<AppContext> = (err, c) => {
  const requestId = c.get("requestId");
  const method = c.req.method;
  const path = c.req.path;
  const userId = c.get("session")?.colleagueId;

  let code: ErrorCode;
  let status: StatusCode;
  let message: string;
  let details: unknown = null;
  let stack: string | undefined;

  if (err instanceof AppError) {
    code = err.code;
    status = err.status;
    message = err.message;
    details = err.details ?? null;
    stack = err.stack;
  } else if (err instanceof HTTPException) {
    status = err.status;
    message = err.message;
    code = httpMessageToCode.get(message) ?? ERROR_CODES.INTERNAL_ERROR;
    stack = err.stack;
  } else if (err instanceof ZodError) {
    code = ERROR_CODES.VALIDATION_FAILED;
    status = 400;
    message = "Validation failed";
    details = err.flatten().fieldErrors;
    stack = err.stack;
  } else {
    code = ERROR_CODES.INTERNAL_ERROR;
    status = 500;
    // Keep real message for logging, send generic to client
    message = err instanceof Error ? err.message : String(err);
    stack = err instanceof Error ? err.stack : undefined;
  }

  // Structured log (always uses the real message)
  logError(message, { requestId, method, path, userId, code, status, stack });

  // Persist to D1 (non-blocking, uses real message)
  persistError(c, { requestId, code, message, status, method, path, userId, details, stack });

  // For 500 errors, hide internal details from the client
  const clientMessage = status === 500 ? "An internal error occurred" : message;

  const body: ApiErrorResponse = { error: clientMessage, code, requestId, details };
  return c.json(body, status);
};
