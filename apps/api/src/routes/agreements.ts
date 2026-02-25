import { Hono } from "hono";
import { createAgreementSchema, updateAgreementSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listAgreements,
  getAgreement,
  createAgreement,
  updateAgreement,
  deleteAgreement,
} from "../services/agreements";
import type { AppContext } from "../types";

const agreementRoutes = new Hono<AppContext>();

agreementRoutes.use("/*", authMiddleware);

// List agreements
agreementRoutes.get("/api/agreements", requirePermission("viewRecords"), async (c) => {
  const page = parseInt(c.req.query("page") ?? "1", 10);
  const limit = parseInt(c.req.query("limit") ?? "50", 10);
  const filters: { humanId?: string; accountId?: string; status?: string } = {};
  const humanId = c.req.query("humanId");
  const accountId = c.req.query("accountId");
  const status = c.req.query("status");
  if (humanId != null) filters.humanId = humanId;
  if (accountId != null) filters.accountId = accountId;
  if (status != null) filters.status = status;

  const result = await listAgreements(c.get("db"), page, limit, filters);
  return c.json(result);
});

// Get single agreement
agreementRoutes.get("/api/agreements/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getAgreement(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Create agreement
agreementRoutes.post("/api/agreements", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createAgreementSchema.parse(body);
  const session = c.get("session");
  const result = await createAgreement(c.get("db"), data, session?.colleagueId ?? "system");
  return c.json({ data: result }, 201);
});

// Update agreement
agreementRoutes.patch("/api/agreements/:id", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateAgreementSchema.parse(body);
  const session = c.get("session");
  const result = await updateAgreement(
    c.get("db"),
    c.req.param("id"),
    data as Record<string, unknown>,
    session?.colleagueId ?? "system",
  );
  return c.json({ data: result });
});

// Delete agreement
agreementRoutes.delete("/api/agreements/:id", requirePermission("createEditRecords"), async (c) => {
  const session = c.get("session");
  await deleteAgreement(c.get("db"), c.req.param("id"), session?.colleagueId ?? "system", c.env.DOCUMENTS);
  return c.json({ success: true });
});

export { agreementRoutes };
