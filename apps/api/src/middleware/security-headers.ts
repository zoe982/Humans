import { createMiddleware } from "hono/factory";
import type { AppContext } from "../types";

export const SECURITY_HEADER_MAP: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Permitted-Cross-Domain-Policies": "none",
};

export const securityHeaders = createMiddleware<AppContext>(async (c, next) => {
  await next();
  for (const [key, value] of Object.entries(SECURITY_HEADER_MAP)) {
    c.res.headers.set(key, value);
  }
});
