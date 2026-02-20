import { eq, sql } from "drizzle-orm";
import { pets, humans } from "@humans/db/schema";
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

export async function listPets(db: DB) {
  const rows = await db
    .select({
      id: pets.id,
      displayId: pets.displayId,
      humanId: pets.humanId,
      type: pets.type,
      name: pets.name,
      breed: pets.breed,
      weight: pets.weight,
      isActive: pets.isActive,
      createdAt: pets.createdAt,
      updatedAt: pets.updatedAt,
      ownerFirstName: humans.firstName,
      ownerLastName: humans.lastName,
      ownerDisplayId: humans.displayId,
    })
    .from(pets)
    .leftJoin(humans, eq(pets.humanId, humans.id));

  return rows.map((r) => ({
    id: r.id,
    displayId: r.displayId,
    humanId: r.humanId,
    type: r.type,
    name: r.name,
    breed: r.breed,
    weight: r.weight,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ownerName: r.ownerFirstName && r.ownerLastName
      ? `${r.ownerFirstName} ${r.ownerLastName}`
      : null,
    ownerDisplayId: r.ownerDisplayId,
  }));
}

export async function listPetsForHuman(db: DB, humanId: string) {
  const humanPets = await db
    .select()
    .from(pets)
    .where(eq(pets.humanId, humanId));
  return humanPets;
}

export async function getPet(db: DB, id: string) {
  const rows = await db
    .select({
      id: pets.id,
      displayId: pets.displayId,
      humanId: pets.humanId,
      type: pets.type,
      name: pets.name,
      breed: pets.breed,
      weight: pets.weight,
      isActive: pets.isActive,
      createdAt: pets.createdAt,
      updatedAt: pets.updatedAt,
      ownerFirstName: humans.firstName,
      ownerLastName: humans.lastName,
      ownerDisplayId: humans.displayId,
    })
    .from(pets)
    .leftJoin(humans, eq(pets.humanId, humans.id))
    .where(eq(pets.id, id));

  const row = rows[0];
  if (row == null) {
    throw notFound(ERROR_CODES.PET_NOT_FOUND, "Pet not found");
  }

  return {
    id: row.id,
    displayId: row.displayId,
    humanId: row.humanId,
    type: row.type,
    name: row.name,
    breed: row.breed,
    weight: row.weight,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ownerName: row.ownerFirstName && row.ownerLastName
      ? `${row.ownerFirstName} ${row.ownerLastName}`
      : null,
    ownerDisplayId: row.ownerDisplayId,
  };
}

export async function createPet(
  db: DB,
  data: {
    humanId: string;
    type?: string | undefined;
    name: string;
    breed?: string | null | undefined;
    weight?: number | null | undefined;
  },
) {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "PET");

  const newPet = {
    id: createId(),
    displayId,
    humanId: data.humanId,
    type: data.type ?? "dog",
    name: data.name,
    breed: data.breed ?? null,
    weight: data.weight ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(pets).values(newPet);
  return newPet;
}

export async function deletePet(db: DB, id: string) {
  const existing = await db.query.pets.findFirst({
    where: eq(pets.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.PET_NOT_FOUND, "Pet not found");
  }

  await db.delete(pets).where(eq(pets.id, id));
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
