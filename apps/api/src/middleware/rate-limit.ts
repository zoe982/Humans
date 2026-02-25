import { createMiddleware } from "hono/factory";
import type { AppContext, RateLimiter } from "../types";

function getRateLimiter(env: AppContext["Bindings"], path: string): RateLimiter | null {
  if (path === "/auth/me") return null;
  if (path.startsWith("/auth/")) return env.RL_AUTH;
  if (path === "/api/client-errors") return env.RL_CLIENT_ERRORS;
  if (path === "/api/search") return env.RL_SEARCH;
  if (path.startsWith("/api/")) return env.RL_API;
  return null;
}

export const rateLimitMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const limiter = getRateLimiter(c.env, c.req.path);
  if (limiter == null) {
    await next();
    return;
  }

  const ip = c.req.header("CF-Connecting-IP") ?? "unknown";

  try {
    const { success } = await limiter.limit({ key: ip });

    if (!success) {
      c.res = new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      });
      return;
    }
  } catch {
    // Rate limiter binding unavailable — degrade gracefully
  }

  await next();
});
