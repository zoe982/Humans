export const SESSION_COOKIE_NAME = "humans_session";
export const SESSION_TTL_SECONDS = 86400; // 24 hours
export const OAUTH_STATE_TTL_SECONDS = 600; // 10 minutes

export const ROLES = ["admin", "manager", "agent", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  agent: 1,
  manager: 2,
  admin: 3,
};

export const PERMISSIONS = {
  viewRecords: ["viewer", "agent", "manager", "admin"],
  createEditRecords: ["agent", "manager", "admin"],
  recordLeadEvents: ["agent", "manager", "admin"],
  viewReports: ["manager", "admin"],
  manageLeadSources: ["manager", "admin"],
  manageUsers: ["admin"],
  viewAuditLog: ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;
