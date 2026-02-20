import type { Context } from "hono";
import { errorLog } from "@humans/db/schema";
import type { AppContext } from "../types";
import { logError } from "./logger";
import { nextDisplayId } from "./display-id";

interface ErrorLogEntry {
  requestId: string;
  code: string;
  message: string;
  status: number;
  method: string;
  path: string;
  userId?: string | undefined;
  details?: unknown;
  stack?: string | undefined;
}

/**
 * Persist an error to the D1 error_log table via waitUntil (non-blocking).
 * Falls back to console.error if D1 write fails.
 */
export function persistError(c: Context<AppContext>, entry: ErrorLogEntry) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const task = (async () => {
    try {
      const db = c.get("db");
      const displayId = await nextDisplayId(db, "ERR");
      await db.insert(errorLog).values({
        id,
        displayId,
        requestId: entry.requestId,
        code: entry.code,
        message: entry.message,
        status: entry.status,
        resolutionStatus: "open",
        method: entry.method,
        path: entry.path,
        userId: entry.userId ?? null,
        details: entry.details ?? null,
        stack: entry.stack ?? null,
        createdAt: now,
      });
    } catch (writeErr) {
      logError("Failed to persist error to D1", {
        requestId: entry.requestId,
        message: writeErr instanceof Error ? writeErr.message : String(writeErr),
      });
    }
  })();

  try {
    c.executionCtx.waitUntil(task);
  } catch {
    // If waitUntil is not available (e.g. in tests), run it as fire-and-forget
  }
}
