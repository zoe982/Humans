import { Hono } from "hono";
import {
  createRouteInterestSchema,
  createRouteInterestExpressionSchema,
  updateRouteInterestExpressionSchema,
} from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  listRouteInterests,
  getRouteInterestDetail,
  createRouteInterest,
  deleteRouteInterest,
  listRouteInterestExpressions,
  createRouteInterestExpression,
  updateRouteInterestExpression,
  deleteRouteInterestExpression,
  listCities,
} from "../services/route-interests";
import type { AppContext } from "../types";

const routeInterestRoutes = new Hono<AppContext>();

routeInterestRoutes.use("/*", authMiddleware);

// List all route interests with counts
routeInterestRoutes.get("/api/route-interests", requirePermission("viewRecords"), async (c) => {
  const data = await listRouteInterests(c.get("db"));
  return c.json({ data });
});

// City autocomplete (must be before :id route)
routeInterestRoutes.get("/api/route-interests/cities", requirePermission("viewRecords"), async (c) => {
  const q = c.req.query("q");
  const data = await listCities(c.get("db"), q ?? "");
  return c.json({ data });
});

// Get single route interest with expressions
routeInterestRoutes.get("/api/route-interests/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getRouteInterestDetail(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

// Create route interest (idempotent on origin+dest)
routeInterestRoutes.post("/api/route-interests", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createRouteInterestSchema.parse(body);
  const result = await createRouteInterest(c.get("db"), data);
  return c.json({ data: result.data }, result.created ? 201 : 200);
});

// Delete route interest + cascade expressions
routeInterestRoutes.delete("/api/route-interests/:id", requirePermission("deleteRouteInterests"), async (c) => {
  await deleteRouteInterest(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

// List expressions, filterable by humanId, routeInterestId, activityId
routeInterestRoutes.get("/api/route-interest-expressions", requirePermission("viewRecords"), async (c) => {
  const data = await listRouteInterestExpressions(c.get("db"), {
    humanId: c.req.query("humanId"),
    routeInterestId: c.req.query("routeInterestId"),
    activityId: c.req.query("activityId"),
  });
  return c.json({ data });
});

// Create expression
routeInterestRoutes.post("/api/route-interest-expressions", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createRouteInterestExpressionSchema.parse(body);
  const result = await createRouteInterestExpression(c.get("db"), data);
  return c.json({ data: result }, 201);
});

// Update expression
routeInterestRoutes.patch("/api/route-interest-expressions/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateRouteInterestExpressionSchema.parse(body);
  const result = await updateRouteInterestExpression(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

// Delete expression
routeInterestRoutes.delete("/api/route-interest-expressions/:id", requirePermission("manageHumans"), async (c) => {
  await deleteRouteInterestExpression(c.get("db"), c.req.param("id"));
  return c.json({ success: true });
});

export { routeInterestRoutes };
