import { Hono } from "hono";
import { createEmailSchema, updateEmailSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listEmails,
  getEmail,
  createEmail,
  updateEmail,
  deleteEmail,
} from "../services/emails";
import type { AppContext } from "../types";

const emailRoutes = new Hono<AppContext>();

emailRoutes.use("/*", authMiddleware);

// List all emails with human names
emailRoutes.get("/api/emails", requirePermission("viewRecords"), async (c) => {
  const data = await listEmails(c.get("db"));
  return c.json({ data });
});

// Get single email
emailRoutes.get("/api/emails/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getEmail(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Update email
emailRoutes.patch("/api/emails/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateEmailSchema.parse(body);
  const result = await updateEmail(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

// Create email
emailRoutes.post("/api/emails", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createEmailSchema.parse(body);
  const result = await createEmail(c.get("db"), data);
  return c.json({ data: result }, 201);
});

// Delete email
emailRoutes.delete("/api/emails/:id", requirePermission("manageHumans"), async (c) => {
  await deleteEmail(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

export { emailRoutes };
