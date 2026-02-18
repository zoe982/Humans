import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { PERMISSIONS, type Permission } from "@humans/shared";
import type { AppContext } from "../types";

export function requirePermission(permission: Permission) {
  return createMiddleware<AppContext>(async (c, next) => {
    const session = c.get("session");
    if (!session) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    const allowedRoles = PERMISSIONS[permission] as readonly string[];
    if (!allowedRoles.includes(session.role)) {
      throw new HTTPException(403, { message: "Insufficient permissions" });
    }

    await next();
  });
}
