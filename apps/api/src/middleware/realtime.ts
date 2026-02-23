import { createMiddleware } from "hono/factory";
import type { AppContext } from "../types";
import { notifyRealtime } from "../realtime/notify";

const WRITE_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export const realtimeMiddleware = createMiddleware<AppContext>(async (c, next) => {
  await next();

  if (!WRITE_METHODS.has(c.req.method)) return;
  if (c.res.status < 200 || c.res.status >= 300) return;
  if (!c.req.path.startsWith("/api/")) return;

  notifyRealtime(c, { path: c.req.path, method: c.req.method });
});
