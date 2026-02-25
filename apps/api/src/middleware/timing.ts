import { createMiddleware } from "hono/factory";
import type { AppContext } from "../types";
import { logWarn } from "../lib/logger";
import { persistError } from "../lib/error-logger";

const WARN_THRESHOLD_MS = 2000;
const PERSIST_THRESHOLD_MS = 5000;

export const timingMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const start = performance.now();
  await next();
  const durationMs = Math.round(performance.now() - start);

  c.header("X-Response-Time", `${String(durationMs)}ms`);

  if (durationMs >= WARN_THRESHOLD_MS) {
    const requestId = c.get("requestId");
    const method = c.req.method;
    const path = c.req.path;

    logWarn("Slow request", { requestId, method, path, durationMs });

    if (durationMs >= PERSIST_THRESHOLD_MS) {
      persistError(c, {
        requestId,
        code: "SLOW_REQUEST",
        message: `Request took ${String(durationMs)}ms`,
        status: c.res.status,
        method,
        path,
        details: { durationMs },
      });
    }
  }
});
