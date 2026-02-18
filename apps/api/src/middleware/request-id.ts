import { createMiddleware } from "hono/factory";
import type { AppContext } from "../types";

export const requestIdMiddleware = createMiddleware<AppContext>(async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
});
