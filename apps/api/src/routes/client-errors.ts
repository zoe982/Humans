import { Hono } from "hono";
import { errorLog } from "@humans/db/schema";
import { nextDisplayId } from "../lib/display-id";
import type { AppContext } from "../types";

const clientErrorRoutes = new Hono<AppContext>();

// POST /api/client-errors — accept client-side error reports (no auth required)
clientErrorRoutes.post("/api/client-errors", async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  if (body == null || typeof body !== "object") {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const { message, url, errors: errorList } = body as {
    message?: string;
    url?: string;
    errors?: { type?: string; message?: string; stack?: string }[];
  };

  if (typeof message !== "string" || message.length === 0) {
    return c.json({ error: "message is required" }, 400);
  }

  // Truncate fields to prevent abuse
  const safeMessage = message.slice(0, 500);
  const safePath = typeof url === "string" ? url.slice(0, 500) : null;
  const safeDetails = Array.isArray(errorList)
    ? errorList.slice(0, 10).map((e) => ({
        type: typeof e.type === "string" ? e.type.slice(0, 50) : "unknown",
        message: typeof e.message === "string" ? e.message.slice(0, 500) : "",
        stack: typeof e.stack === "string" ? e.stack.slice(0, 3000) : "",
      }))
    : [];

  const stack = safeDetails.map((e) => `[${e.type}] ${e.message}\n${e.stack}`).join("\n---\n");

  const db = c.get("db");
  const id = crypto.randomUUID();
  const displayId = await nextDisplayId(db, "ERR");
  const now = new Date().toISOString();

  const task = db.insert(errorLog).values({
    id,
    displayId,
    requestId: c.get("requestId"),
    code: "CLIENT_ERROR",
    message: safeMessage,
    status: 0,
    resolutionStatus: "open",
    method: "CLIENT",
    path: safePath,
    userId: null,
    details: safeDetails.length > 0 ? safeDetails : null,
    stack: stack.length > 0 ? stack.slice(0, 5000) : null,
    createdAt: now,
  });

  c.executionCtx.waitUntil(task);

  return c.json({ success: true });
});

export { clientErrorRoutes };
