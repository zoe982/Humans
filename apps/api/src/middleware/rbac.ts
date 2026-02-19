import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { PERMISSIONS, type Permission } from "@humans/shared";
import type { AppContext } from "../types";
import type { MiddlewareHandler } from "hono";

export function requirePermission(permission: Permission): MiddlewareHandler<AppContext> {
  return createMiddleware<AppContext>(async (c, next) => {
    const session = c.get("session");
    if (session == null) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    const allowedRoles: readonly string[] = PERMISSIONS[permission];
    if (!allowedRoles.includes(session.role)) {
      throw new HTTPException(403, { message: "Insufficient permissions" });
    }

    await next();
  });
}
