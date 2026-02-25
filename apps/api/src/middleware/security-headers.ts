import { createMiddleware } from "hono/factory";
import type { AppContext } from "../types";

export const securityHeaders = createMiddleware<AppContext>(async (c, next) => {
  await next();
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  c.res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
});
