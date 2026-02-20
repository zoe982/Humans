import { Hono } from "hono";
import { createPetSchema, updatePetSchema } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import {
  getPetCount,
  listPets,
  listPetsForHuman,
  getPet,
  createPet,
  updatePet,
} from "../services/pets";
import type { AppContext } from "../types";

const petRoutes = new Hono<AppContext>();

petRoutes.use("/*", authMiddleware);

// Total pet count
petRoutes.get("/api/pets/count", requirePermission("viewRecords"), async (c) => {
  const data = await getPetCount(c.get("db"));
  return c.json({ data });
});

// List all pets
petRoutes.get("/api/pets", requirePermission("viewRecords"), async (c) => {
  const data = await listPets(c.get("db"));
  return c.json({ data });
});

// List pets for a human
petRoutes.get("/api/humans/:humanId/pets", requirePermission("viewRecords"), async (c) => {
  const data = await listPetsForHuman(c.get("db"), c.req.param("humanId"));
  return c.json({ data });
});

petRoutes.get("/api/pets/:id", requirePermission("viewRecords"), async (c) => {
  const data = await getPet(c.get("db"), c.req.param("id"));
  return c.json({ data });
});

petRoutes.post("/api/pets", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createPetSchema.parse(body);
  const result = await createPet(c.get("db"), data);
  return c.json({ data: result }, 201);
});

petRoutes.patch("/api/pets/:id", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updatePetSchema.parse(body);
  const result = await updatePet(c.get("db"), c.req.param("id"), data);
  return c.json({ data: result });
});

export { petRoutes };
