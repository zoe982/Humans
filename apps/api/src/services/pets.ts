import { eq, sql } from "drizzle-orm";
import { pets } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

export async function getPetCount(db: DB) {
  const countResult = await db.select({ total: sql<number>`count(*)` }).from(pets);
  const total = countResult[0]?.total ?? 0;
  return { total };
}

export async function listPetsForHuman(db: DB, humanId: string) {
  const humanPets = await db
    .select()
    .from(pets)
    .where(eq(pets.humanId, humanId));
  return humanPets;
}

export async function getPet(db: DB, id: string) {
  const pet = await db.query.pets.findFirst({
    where: eq(pets.id, id),
  });
  if (pet == null) {
    throw notFound(ERROR_CODES.PET_NOT_FOUND, "Pet not found");
  }
  return pet;
}

export async function createPet(
  db: DB,
  data: {
    humanId: string;
    name: string;
    breed?: string | null;
    weight?: number | null;
  },
) {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "PET");

  const newPet = {
    id: createId(),
    displayId,
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
  return newPet;
}

export async function updatePet(
  db: DB,
  id: string,
  data: Record<string, unknown>,
) {
  const existing = await db.query.pets.findFirst({
    where: eq(pets.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.PET_NOT_FOUND, "Pet not found");
  }

  await db
    .update(pets)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(pets.id, id));

  const updated = await db.query.pets.findFirst({
    where: eq(pets.id, id),
  });
  return updated;
}
