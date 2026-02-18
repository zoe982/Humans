import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { users, auditLog } from "@humans/db/schema";
import { createId } from "@humans/db";
import { createUserSchema, updateUserSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import type { AppContext } from "../types";

const adminRoutes = new Hono<AppContext>();

adminRoutes.use("/*", authMiddleware);

// User management
adminRoutes.get("/api/admin/users", requirePermission("manageUsers"), async (c) => {
  const db = c.get("db");
  const allUsers = await db.select().from(users);
  return c.json({ data: allUsers });
});

adminRoutes.get("/api/admin/users/:id", requirePermission("manageUsers"), async (c) => {
  const db = c.get("db");
  const user = await db.query.users.findFirst({
    where: eq(users.id, c.req.param("id")),
  });
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json({ data: user });
});

adminRoutes.post("/api/admin/users", requirePermission("manageUsers"), async (c) => {
  const body = await c.req.json();
  const data = createUserSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();

  // Check for duplicate email
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });
  if (existing) {
    return c.json({ error: "User with this email already exists" }, 409);
  }

  const newUser = {
    id: createId(),
    ...data,
    avatarUrl: null,
    googleId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(users).values(newUser);
  return c.json({ data: newUser }, 201);
});

adminRoutes.patch("/api/admin/users/:id", requirePermission("manageUsers"), async (c) => {
  const body = await c.req.json();
  const data = updateUserSchema.parse(body);
  const db = c.get("db");

  const existing = await db.query.users.findFirst({
    where: eq(users.id, c.req.param("id")),
  });
  if (!existing) {
    return c.json({ error: "User not found" }, 404);
  }

  await db
    .update(users)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(users.id, c.req.param("id")));

  const updated = await db.query.users.findFirst({
    where: eq(users.id, c.req.param("id")),
  });
  return c.json({ data: updated });
});

// Audit log
adminRoutes.get("/api/admin/audit-log", requirePermission("viewAuditLog"), async (c) => {
  const db = c.get("db");
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
  const offset = Number(c.req.query("offset") ?? 0);

  const logs = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ data: logs });
});

export { adminRoutes };
