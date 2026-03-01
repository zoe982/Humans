import { eq, sql, inArray, and } from "drizzle-orm";
import { pets, humans, opportunityPets, opportunities, opportunityHumans, opportunityHumanRolesConfig } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import { getCachedConfig } from "../lib/config-cache";
import type { DB } from "./types";

export async function getPetCount(db: DB): Promise<{ total: number }> {
  const countResult = await db.select({ total: sql<number>`count(*)::int` }).from(pets);
  const total = countResult[0]?.total ?? 0;
  return { total };
}

export async function listPets(db: DB): Promise<{ id: string; displayId: string; humanId: string; type: string; name: string; breed: string | null; weight: number | null; notes: string | null; isActive: boolean; createdAt: string; updatedAt: string; ownerName: string | null; ownerDisplayId: string | null }[]> {
  const rows = await db
    .select({
      id: pets.id,
      displayId: pets.displayId,
      humanId: pets.humanId,
      type: pets.type,
      name: pets.name,
      breed: pets.breed,
      weight: pets.weight,
      notes: pets.notes,
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
    humanId: r.humanId ?? "",
    type: r.type,
    name: r.name ?? "",
    breed: r.breed,
    weight: r.weight,
    notes: r.notes,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ownerName: r.ownerFirstName != null && r.ownerLastName != null
      ? `${r.ownerFirstName} ${r.ownerLastName}`
      : null,
    ownerDisplayId: r.ownerDisplayId,
  }));
}

export async function listPetsForHuman(db: DB, humanId: string): Promise<(typeof pets.$inferSelect)[]> {
  const humanPets = await db
    .select()
    .from(pets)
    .where(eq(pets.humanId, humanId));
  return humanPets;
}

export async function getPet(db: DB, id: string): Promise<{ id: string; displayId: string; humanId: string; type: string; name: string; breed: string | null; weight: number | null; notes: string | null; isActive: boolean; createdAt: string; updatedAt: string; ownerName: string | null; ownerDisplayId: string | null }> {
  const rows = await db
    .select({
      id: pets.id,
      displayId: pets.displayId,
      humanId: pets.humanId,
      type: pets.type,
      name: pets.name,
      breed: pets.breed,
      weight: pets.weight,
      notes: pets.notes,
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
    humanId: row.humanId ?? "",
    type: row.type,
    name: row.name ?? "",
    breed: row.breed,
    weight: row.weight,
    notes: row.notes,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ownerName: row.ownerFirstName != null && row.ownerLastName != null
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
    name?: string | null | undefined;
    breed?: string | null | undefined;
    weight?: number | null | undefined;
    notes?: string | null | undefined;
  },
): Promise<{ id: string; displayId: string; humanId: string; type: string; name: string; breed: string | null; weight: number | null; notes: string | null; isActive: boolean; createdAt: string; updatedAt: string }> {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "PET");

  const newPet = {
    id: createId(),
    displayId,
    humanId: data.humanId,
    type: data.type ?? "dog",
    name: data.name ?? "",
    breed: data.breed ?? null,
    weight: data.weight ?? null,
    notes: data.notes ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(pets).values(newPet);
  return newPet;
}

export async function deletePet(db: DB, id: string): Promise<void> {
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
): Promise<typeof pets.$inferSelect | undefined> {
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

export async function getOpportunitiesForPet(db: DB, petId: string): Promise<{ linkId: string; id: string; displayId: string; stage: string; primaryHumanName: string | null; createdAt: string }[]> {
  const links = await db
    .select({
      linkId: opportunityPets.id,
      opportunityId: opportunityPets.opportunityId,
    })
    .from(opportunityPets)
    .where(eq(opportunityPets.petId, petId));

  if (links.length === 0) return [];

  const oppIds = links.map((l) => l.opportunityId);

  const opps = await db
    .select({
      id: opportunities.id,
      displayId: opportunities.displayId,
      stage: opportunities.stage,
      createdAt: opportunities.createdAt,
    })
    .from(opportunities)
    .where(inArray(opportunities.id, oppIds));

  const roleConfigs = await getCachedConfig(db, opportunityHumanRolesConfig, "opportunityHumanRolesConfig");
  const primaryRoleId = roleConfigs.find((r) => r.name === "primary")?.id ?? null;

  const primaryHumans = primaryRoleId != null
    ? await db
        .select({
          opportunityId: opportunityHumans.opportunityId,
          firstName: humans.firstName,
          lastName: humans.lastName,
        })
        .from(opportunityHumans)
        .innerJoin(humans, eq(opportunityHumans.humanId, humans.id))
        .where(
          and(
            inArray(opportunityHumans.opportunityId, oppIds),
            eq(opportunityHumans.roleId, primaryRoleId),
          ),
        )
    : [];

  return links.map((link) => {
    const opp = opps.find((o) => o.id === link.opportunityId);
    const primary = primaryHumans.find((p) => p.opportunityId === link.opportunityId);
    return {
      linkId: link.linkId,
      id: opp?.id ?? link.opportunityId,
      displayId: opp?.displayId ?? "",
      stage: opp?.stage ?? "open",
      primaryHumanName: primary != null ? `${primary.firstName} ${primary.lastName}` : null,
      createdAt: opp?.createdAt ?? "",
    };
  });
}
