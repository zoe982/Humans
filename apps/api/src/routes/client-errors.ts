import { Hono } from "hono";
import { z } from "zod";
import { errorLog } from "@humans/db/schema";
import { nextDisplayId } from "../lib/display-id";
import type { AppContext } from "../types";

const clientErrorSchema = z.object({
  message: z.string().min(1).max(500),
  url: z.string().max(500).optional(),
  errors: z.array(z.object({
    type: z.string().max(50).optional(),
    message: z.string().max(500).optional(),
    stack: z.string().max(3000).optional(),
  })).max(10).optional(),
});

const clientErrorRoutes = new Hono<AppContext>();

// POST /api/client-errors — accept client-side error reports (no auth required)
clientErrorRoutes.post("/api/client-errors", async (c) => {
  // Accept both application/json and text/plain (sendBeacon uses text/plain for CORS)
  let body: unknown;
  try {
    const text = await c.req.text();
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  if (body == null || typeof body !== "object") {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const parsed = clientErrorSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid payload" }, 400);
  }

  const { message, url, errors: errorList } = parsed.data;

  // Defense-in-depth truncation (Zod already enforces max lengths)
  const safeMessage = message.slice(0, 500);
  const safePath = url != null ? url.slice(0, 500) : null;
  const safeDetails = (errorList ?? []).map((e) => ({
    type: (e.type ?? "unknown").slice(0, 50),
    message: (e.message ?? "").slice(0, 500),
    stack: (e.stack ?? "").slice(0, 3000),
  }));

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
