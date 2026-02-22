import { Hono } from "hono";
import {
  createGeoInterestSchema,
  createGeoInterestExpressionSchema,
  updateGeoInterestExpressionSchema,
} from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listGeoInterests,
  searchGeoInterests,
  getGeoInterestDetail,
  createGeoInterest,
  deleteGeoInterest,
  listExpressions,
  getGeoInterestExpressionDetail,
  createExpression,
  updateExpression,
  deleteExpression,
} from "../services/geo-interests";
import type { AppContext } from "../types";

const geoInterestRoutes = new Hono<AppContext>();

geoInterestRoutes.use("/*", authMiddleware);

// List all geo-interests with counts
geoInterestRoutes.get("/api/geo-interests", requirePermission("viewRecords"), async (c) => {
  const data = await listGeoInterests(c.get("db"));
  return c.json({ data });
});

// Search geo-interests by city/country
geoInterestRoutes.get("/api/geo-interests/search", requirePermission("viewRecords"), async (c) => {
  const q = c.req.query("q");
  const data = await searchGeoInterests(c.get("db"), q ?? "");
  return c.json({ data });
});

// Get single geo-interest with expressions and human names
geoInterestRoutes.get("/api/geo-interests/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getGeoInterestDetail(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Create geo-interest (idempotent on city+country)
geoInterestRoutes.post("/api/geo-interests", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createGeoInterestSchema.parse(body);
  const result = await createGeoInterest(c.get("db"), data);
  return c.json({ data: result.data }, result.created ? 201 : 200);
});

// Delete geo-interest + cascade expressions
geoInterestRoutes.delete("/api/geo-interests/:id", requirePermission("deleteGeoInterests"), async (c) => {
  await deleteGeoInterest(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

// List expressions, filterable by humanId, geoInterestId, and activityId
geoInterestRoutes.get("/api/geo-interest-expressions", requirePermission("viewRecords"), async (c) => {
  const data = await listExpressions(c.get("db"), {
    humanId: c.req.query("humanId"),
    geoInterestId: c.req.query("geoInterestId"),
    activityId: c.req.query("activityId"),
  });
  return c.json({ data });
});

// Get single expression with parent geo-interest, human, and activity
geoInterestRoutes.get("/api/geo-interest-expressions/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getGeoInterestExpressionDetail(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Create expression (resolve geo-interest by city+country or use geoInterestId)
geoInterestRoutes.post("/api/geo-interest-expressions", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createGeoInterestExpressionSchema.parse(body);
  const result = await createExpression(c.get("db"), data);
  return c.json({ data: result }, 201);
});

// Update expression (notes only)
geoInterestRoutes.patch("/api/geo-interest-expressions/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateGeoInterestExpressionSchema.parse(body);
  const result = await updateExpression(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

// Delete expression
geoInterestRoutes.delete("/api/geo-interest-expressions/:id", requirePermission("manageHumans"), async (c) => {
  await deleteExpression(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

export { geoInterestRoutes };
