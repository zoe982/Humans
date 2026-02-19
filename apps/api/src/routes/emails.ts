import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { humanEmails, humans } from "@humans/db/schema";
import { createId } from "@humans/db";
import { createEmailSchema, ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { notFound } from "../lib/errors";
import type { AppContext } from "../types";

const emailRoutes = new Hono<AppContext>();

emailRoutes.use("/*", authMiddleware);

// List all emails with human names
emailRoutes.get("/api/emails", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const allEmails = await db.select().from(humanEmails);
  const allHumans = await db.select().from(humans);

  const data = allEmails.map((e) => {
    const human = allHumans.find((h) => h.id === e.humanId);
    return {
      ...e,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
    };
  });

  return c.json({ data });
});

// Create email
emailRoutes.post("/api/emails", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createEmailSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();

  const email = {
    id: createId(),
    humanId: data.humanId,
    email: data.email,
    labelId: data.labelId ?? null,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(humanEmails).values(email);
  return c.json({ data: email }, 201);
});

// Delete email
emailRoutes.delete("/api/emails/:id", requirePermission("manageHumans"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.humanEmails.findFirst({
    where: eq(humanEmails.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.EMAIL_NOT_FOUND, "Email not found");
  }

  await db.delete(humanEmails).where(eq(humanEmails.id, id));
  return c.json({ success: true });
});

export { emailRoutes };
