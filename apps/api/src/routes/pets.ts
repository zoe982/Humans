import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { pets } from "@humans/db/schema";
import { createId } from "@humans/db";
import { createPetSchema, updatePetSchema } from "@humans/shared";
import { ERROR_CODES } from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { notFound } from "../lib/errors";
import type { AppContext } from "../types";

const petRoutes = new Hono<AppContext>();

petRoutes.use("/*", authMiddleware);

// List pets for a human
petRoutes.get("/api/humans/:humanId/pets", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const humanPets = await db
    .select()
    .from(pets)
    .where(eq(pets.humanId, c.req.param("humanId")));
  return c.json({ data: humanPets });
});

petRoutes.get("/api/pets/:id", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const pet = await db.query.pets.findFirst({
    where: eq(pets.id, c.req.param("id")),
  });
  if (pet == null) {
    throw notFound(ERROR_CODES.PET_NOT_FOUND, "Pet not found");
  }
  return c.json({ data: pet });
});

petRoutes.post("/api/pets", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createPetSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();

  const newPet = {
    id: createId(),
    clientId: null,
    humanId: data.humanId,
    name: data.name,
    breed: data.breed ?? null,
    weight: data.weight ?? null,
    age: null,
    specialNeeds: null,
    healthCertR2Key: null,
    vaccinationR2Key: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(pets).values(newPet);
  return c.json({ data: newPet }, 201);
});

petRoutes.patch("/api/pets/:id", requirePermission("createEditRecords"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updatePetSchema.parse(body);
  const db = c.get("db");

  const existing = await db.query.pets.findFirst({
    where: eq(pets.id, c.req.param("id")),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.PET_NOT_FOUND, "Pet not found");
  }

  await db
    .update(pets)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(pets.id, c.req.param("id")));

  const updated = await db.query.pets.findFirst({
    where: eq(pets.id, c.req.param("id")),
  });
  return c.json({ data: updated });
});

export { petRoutes };
