import { createMiddleware } from "hono/factory";
import type { AppContext } from "../types";

interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

const RATE_LIMITS: { pattern: RegExp; config: RateLimitConfig }[] = [
  { pattern: /^\/auth\/(?:google|logout)/, config: { limit: 10, windowSeconds: 60 } },
  { pattern: /^\/api\/client-errors$/, config: { limit: 5, windowSeconds: 60 } },
  { pattern: /^\/api\/search$/, config: { limit: 30, windowSeconds: 60 } },
  { pattern: /^\/api\//, config: { limit: 100, windowSeconds: 60 } },
];

function getConfig(path: string): RateLimitConfig | null {
  for (const { pattern, config } of RATE_LIMITS) {
    if (pattern.test(path)) return config;
  }
  return null;
}

export const rateLimitMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const config = getConfig(c.req.path);
  if (config == null) {
    await next();
    return;
  }

  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
  const bucket = c.req.path.startsWith("/auth/")
    ? "auth"
    : c.req.path === "/api/client-errors"
      ? "client-errors"
      : c.req.path === "/api/search"
        ? "search"
        : "api";
  const minute = Math.floor(Date.now() / (config.windowSeconds * 1000));
  const key = `rl:${ip}:${bucket}:${String(minute)}`;

  const current = await c.env.SESSIONS.get(key);
  const count = current != null ? parseInt(current, 10) : 0;

  if (count >= config.limit) {
    c.res = new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(config.windowSeconds),
      },
    });
    return;
  }

  await c.env.SESSIONS.put(key, String(count + 1), {
    expirationTtl: config.windowSeconds * 2,
  });

  await next();
});
