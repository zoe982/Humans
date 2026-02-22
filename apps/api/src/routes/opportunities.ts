import { Hono } from "hono";
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  updateOpportunityStageSchema,
  updateNextActionSchema,
  linkOpportunityHumanSchema,
  updateOpportunityHumanSchema,
  linkOpportunityPetSchema,
} from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listOpportunities,
  getOpportunityDetail,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  updateOpportunityStage,
  linkOpportunityHuman,
  updateOpportunityHumanRole,
  unlinkOpportunityHuman,
  linkOpportunityPet,
  unlinkOpportunityPet,
  updateNextAction,
  completeNextAction,
} from "../services/opportunities";
import type { AppContext } from "../types";

const opportunityRoutes = new Hono<AppContext>();

opportunityRoutes.use("/*", authMiddleware);

// GET /api/opportunities
opportunityRoutes.get("/api/opportunities", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 25));
  const q = c.req.query("q") || undefined;
  const stage = c.req.query("stage") || undefined;
  const ownerId = c.req.query("ownerId") || undefined;
  const overdueOnly = c.req.query("overdue") === "true";
  const result = await listOpportunities(db, page, limit, { q, stage, ownerId, overdueOnly });
  return c.json(result);
});

// GET /api/opportunities/:id
opportunityRoutes.get("/api/opportunities/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getOpportunityDetail(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// POST /api/opportunities
opportunityRoutes.post("/api/opportunities", requirePermission("manageOpportunities"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createOpportunitySchema.parse(body);
  const session = c.get("session")!;
  const result = await createOpportunity(c.get("db"), data, session.colleagueId);
  return c.json({ data: result }, 201);
});

// PATCH /api/opportunities/:id
opportunityRoutes.patch("/api/opportunities/:id", requirePermission("manageOpportunities"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateOpportunitySchema.parse(body);
  const session = c.get("session")!;
  const result = await updateOpportunity(c.get("db"), c.req.param("id"), data, session.colleagueId);
  return c.json(result);
});

// DELETE /api/opportunities/:id
opportunityRoutes.delete("/api/opportunities/:id", requirePermission("deleteOpportunities"), async (c) => {
  await deleteOpportunity(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

// PATCH /api/opportunities/:id/stage
opportunityRoutes.patch("/api/opportunities/:id/stage", requirePermission("manageOpportunities"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateOpportunityStageSchema.parse(body);
  const session = c.get("session")!;
  const result = await updateOpportunityStage(c.get("db"), c.req.param("id"), data, session.colleagueId);
  return c.json(result);
});

// PATCH /api/opportunities/:id/next-action
opportunityRoutes.patch("/api/opportunities/:id/next-action", requirePermission("manageOpportunities"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateNextActionSchema.parse(body);
  const session = c.get("session")!;
  const result = await updateNextAction(c.get("db"), c.req.param("id"), data, session.colleagueId);
  return c.json(result);
});

// POST /api/opportunities/:id/next-action/done
opportunityRoutes.post("/api/opportunities/:id/next-action/done", requirePermission("manageOpportunities"), async (c) => {
  const session = c.get("session")!;
  const result = await completeNextAction(c.get("db"), c.req.param("id"), session.colleagueId);
  return c.json(result);
});

// POST /api/opportunities/:id/humans
opportunityRoutes.post("/api/opportunities/:id/humans", requirePermission("manageOpportunities"), async (c) => {
  const body: unknown = await c.req.json();
  const data = linkOpportunityHumanSchema.parse(body);
  const link = await linkOpportunityHuman(c.get("db"), c.req.param("id"), data);
  return c.json({ data: link }, 201);
});

// PATCH /api/opportunities/:id/humans/:linkId
opportunityRoutes.patch("/api/opportunities/:id/humans/:linkId", requirePermission("manageOpportunities"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateOpportunityHumanSchema.parse(body);
  const result = await updateOpportunityHumanRole(c.get("db"), c.req.param("linkId"), data);
  return c.json({ data: result });
});

// DELETE /api/opportunities/:id/humans/:linkId
opportunityRoutes.delete("/api/opportunities/:id/humans/:linkId", requirePermission("manageOpportunities"), async (c) => {
  await unlinkOpportunityHuman(c.get("db"), c.req.param("linkId"));
  return c.json({ success: true });
});

// POST /api/opportunities/:id/pets
opportunityRoutes.post("/api/opportunities/:id/pets", requirePermission("manageOpportunities"), async (c) => {
  const body: unknown = await c.req.json();
  const data = linkOpportunityPetSchema.parse(body);
  const link = await linkOpportunityPet(c.get("db"), c.req.param("id"), data);
  return c.json({ data: link }, 201);
});

// DELETE /api/opportunities/:id/pets/:linkId
opportunityRoutes.delete("/api/opportunities/:id/pets/:linkId", requirePermission("manageOpportunities"), async (c) => {
  await unlinkOpportunityPet(c.get("db"), c.req.param("linkId"));
  return c.json({ success: true });
});

export { opportunityRoutes };
