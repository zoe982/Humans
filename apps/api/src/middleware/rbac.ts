import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { PERMISSIONS, type Permission } from "@humans/shared";
import type { AppContext } from "../types";
import type { MiddlewareHandler } from "hono";

function getAllowedRoles(permission: Permission): readonly string[] {
  switch (permission) {
    case "viewRecords":
      return PERMISSIONS.viewRecords;
    case "createEditRecords":
      return PERMISSIONS.createEditRecords;
    case "recordLeadEvents":
      return PERMISSIONS.recordLeadEvents;
    case "viewReports":
      return PERMISSIONS.viewReports;
    case "manageLeadSources":
      return PERMISSIONS.manageLeadSources;
    case "manageColleagues":
      return PERMISSIONS.manageColleagues;
    case "viewAuditLog":
      return PERMISSIONS.viewAuditLog;
    case "manageHumans":
      return PERMISSIONS.manageHumans;
    case "viewRouteSignups":
      return PERMISSIONS.viewRouteSignups;
    case "manageRouteSignups":
      return PERMISSIONS.manageRouteSignups;
    case "deleteRouteSignups":
      return PERMISSIONS.deleteRouteSignups;
  }
}

export function requirePermission(permission: Permission): MiddlewareHandler<AppContext> {
  return createMiddleware<AppContext>(async (c, next) => {
    const session = c.get("session");
    if (session == null) {
      throw new HTTPException(401, { message: "Authentication required" });
    }

    const allowedRoles = getAllowedRoles(permission);
    if (!allowedRoles.includes(session.role)) {
      throw new HTTPException(403, { message: "Insufficient permissions" });
    }

    await next();
  });
}
