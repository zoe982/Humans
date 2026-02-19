import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { colleagues, auditLog } from "@humans/db/schema";
import { createId } from "@humans/db";
import { createColleagueSchema, updateColleagueSchema } from "@humans/shared";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { notFound, conflict } from "../lib/errors";
import type { AppContext } from "../types";

const adminRoutes = new Hono<AppContext>();

adminRoutes.use("/*", authMiddleware);

// Colleague management
adminRoutes.get("/api/admin/colleagues", requirePermission("manageColleagues"), async (c) => {
  const db = c.get("db");
  const allColleagues = await db.select().from(colleagues);
  return c.json({ data: allColleagues });
});

adminRoutes.get("/api/admin/colleagues/:id", requirePermission("manageColleagues"), async (c) => {
  const db = c.get("db");
  const colleague = await db.query.colleagues.findFirst({
    where: eq(colleagues.id, c.req.param("id")),
  });
  if (colleague == null) {
    throw notFound(ERROR_CODES.COLLEAGUE_NOT_FOUND, "Colleague not found");
  }
  return c.json({ data: colleague });
});

adminRoutes.post("/api/admin/colleagues", requirePermission("manageColleagues"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createColleagueSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();

  // Check for duplicate email
  const existing = await db.query.colleagues.findFirst({
    where: eq(colleagues.email, data.email),
  });
  if (existing != null) {
    throw conflict(ERROR_CODES.COLLEAGUE_EMAIL_EXISTS, "Colleague with this email already exists");
  }

  const displayName = [data.firstName, data.middleNames, data.lastName].filter(Boolean).join(" ");

  const newColleague = {
    id: createId(),
    email: data.email,
    firstName: data.firstName,
    middleNames: data.middleNames ?? null,
    lastName: data.lastName,
    name: displayName,
    avatarUrl: null,
    googleId: null,
    role: data.role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(colleagues).values(newColleague);
  return c.json({ data: newColleague }, 201);
});

adminRoutes.patch("/api/admin/colleagues/:id", requirePermission("manageColleagues"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateColleagueSchema.parse(body);
  const db = c.get("db");

  const existing = await db.query.colleagues.findFirst({
    where: eq(colleagues.id, c.req.param("id")),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.COLLEAGUE_NOT_FOUND, "Colleague not found");
  }

  // Build update, recalculate display name if name fields changed
  const updateFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.firstName !== undefined) updateFields["firstName"] = data.firstName;
  if (data.middleNames !== undefined) updateFields["middleNames"] = data.middleNames;
  if (data.lastName !== undefined) updateFields["lastName"] = data.lastName;
  if (data.role !== undefined) updateFields["role"] = data.role;
  if (data.isActive !== undefined) updateFields["isActive"] = data.isActive;

  // Recalculate display name
  const newFirst = data.firstName ?? existing.firstName;
  const newMiddle = data.middleNames !== undefined ? data.middleNames : existing.middleNames;
  const newLast = data.lastName ?? existing.lastName;
  updateFields["name"] = [newFirst, newMiddle, newLast].filter(Boolean).join(" ");

  await db
    .update(colleagues)
    .set(updateFields)
    .where(eq(colleagues.id, c.req.param("id")));

  const updated = await db.query.colleagues.findFirst({
    where: eq(colleagues.id, c.req.param("id")),
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
