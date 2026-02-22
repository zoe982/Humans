import { eq, sql, like, or, and, desc, asc, inArray, isNull, isNotNull } from "drizzle-orm";
import {
  opportunities,
  opportunityHumans,
  opportunityPets,
  opportunityHumanRolesConfig,
  activities,
  humans,
  pets,
  colleagues,
} from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { computeDiff, logAuditEntry } from "../lib/audit";
import { notFound, badRequest } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

const TERMINAL_STAGES = ["closed_flown", "closed_lost"];

// ─── List ────────────────────────────────────────────────────────

export async function listOpportunities(
  db: DB,
  page: number,
  limit: number,
  filters: { q?: string; stage?: string; ownerId?: string; overdueOnly?: boolean; humanId?: string },
) {
  const offset = (page - 1) * limit;
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters.stage) conditions.push(eq(opportunities.stage, filters.stage));
  if (filters.ownerId) conditions.push(eq(opportunities.nextActionOwnerId, filters.ownerId));
  if (filters.overdueOnly) {
    const now = new Date().toISOString();
    conditions.push(sql`${opportunities.nextActionDueDate} < ${now}`);
    conditions.push(isNull(opportunities.nextActionCompletedAt));
  }
  if (filters.q) {
    conditions.push(
      or(
        like(opportunities.displayId, `%${filters.q}%`),
        like(opportunities.nextActionDescription, `%${filters.q}%`),
      )!,
    );
  }
  if (filters.humanId) {
    conditions.push(
      sql`${opportunities.id} IN (SELECT ${opportunityHumans.opportunityId} FROM ${opportunityHumans} WHERE ${opportunityHumans.humanId} = ${filters.humanId})`,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db.select({ total: sql<number>`count(*)` }).from(opportunities).where(whereClause);
  const total = countResult[0]?.total ?? 0;

  const rows = await db
    .select()
    .from(opportunities)
    .where(whereClause)
    .orderBy(asc(sql`CASE WHEN ${opportunities.nextActionDueDate} IS NULL THEN 1 ELSE 0 END`), asc(opportunities.nextActionDueDate), desc(opportunities.createdAt))
    .limit(limit)
    .offset(offset);

  const oppIds = rows.map((r) => r.id);

  // Fetch primary humans for each opportunity
  const linkedHumans = oppIds.length > 0
    ? await db
        .select({
          opportunityId: opportunityHumans.opportunityId,
          humanId: opportunityHumans.humanId,
          roleId: opportunityHumans.roleId,
          firstName: humans.firstName,
          lastName: humans.lastName,
          displayId: humans.displayId,
        })
        .from(opportunityHumans)
        .innerJoin(humans, eq(opportunityHumans.humanId, humans.id))
        .where(inArray(opportunityHumans.opportunityId, oppIds))
    : [];

  // Fetch role configs to identify primary
  const roleConfigs = await db.select().from(opportunityHumanRolesConfig);
  const primaryRoleId = roleConfigs.find((r) => r.name === "primary")?.id;

  // Fetch owner names
  const ownerIds = rows.map((r) => r.nextActionOwnerId).filter((id): id is string => id != null);
  const owners = ownerIds.length > 0
    ? await db.select({ id: colleagues.id, name: colleagues.name }).from(colleagues).where(inArray(colleagues.id, ownerIds))
    : [];

  const now = new Date().toISOString();

  const data = rows.map((opp) => {
    const oppHumans = linkedHumans.filter((h) => h.opportunityId === opp.id);
    const primary = oppHumans.find((h) => h.roleId === primaryRoleId) ?? oppHumans[0] ?? null;
    const owner = opp.nextActionOwnerId ? owners.find((o) => o.id === opp.nextActionOwnerId) : null;
    const isOverdue = opp.nextActionDueDate != null && opp.nextActionCompletedAt == null && opp.nextActionDueDate < now;

    return {
      ...opp,
      primaryHuman: primary ? { id: primary.humanId, displayId: primary.displayId, firstName: primary.firstName, lastName: primary.lastName } : null,
      nextActionOwnerName: owner?.name ?? null,
      isOverdue,
    };
  });

  return { data, meta: { page, limit, total } };
}

// ─── Detail ──────────────────────────────────────────────────────

export async function getOpportunityDetail(db: DB, id: string) {
  const opp = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  if (opp == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_NOT_FOUND, "Opportunity not found");
  }

  const roleConfigs = await db.select().from(opportunityHumanRolesConfig);

  const [linkedHumanRows, linkedPetRows, oppActivities] = await Promise.all([
    db
      .select({
        id: opportunityHumans.id,
        humanId: opportunityHumans.humanId,
        roleId: opportunityHumans.roleId,
        createdAt: opportunityHumans.createdAt,
        firstName: humans.firstName,
        lastName: humans.lastName,
        displayId: humans.displayId,
      })
      .from(opportunityHumans)
      .innerJoin(humans, eq(opportunityHumans.humanId, humans.id))
      .where(eq(opportunityHumans.opportunityId, id)),
    db
      .select({
        id: opportunityPets.id,
        petId: opportunityPets.petId,
        createdAt: opportunityPets.createdAt,
        name: pets.name,
        displayId: pets.displayId,
        type: pets.type,
        humanId: pets.humanId,
      })
      .from(opportunityPets)
      .innerJoin(pets, eq(opportunityPets.petId, pets.id))
      .where(eq(opportunityPets.opportunityId, id)),
    db.select().from(activities).where(eq(activities.opportunityId, id)).orderBy(desc(activities.activityDate)),
  ]);

  const linkedHumans = linkedHumanRows.map((h) => {
    const role = h.roleId ? roleConfigs.find((r) => r.id === h.roleId) : null;
    return {
      ...h,
      humanName: `${h.firstName} ${h.lastName}`,
      humanDisplayId: h.displayId,
      roleName: role?.name ?? null,
    };
  });

  const linkedPets = linkedPetRows.map((p) => {
    const ownerHuman = linkedHumanRows.find((h) => h.humanId === p.humanId);
    return {
      ...p,
      petName: p.name,
      petDisplayId: p.displayId,
      petType: p.type,
      ownerName: ownerHuman ? `${ownerHuman.firstName} ${ownerHuman.lastName}` : null,
    };
  });

  // Owner name
  let nextActionOwnerName: string | null = null;
  if (opp.nextActionOwnerId) {
    const owner = await db.query.colleagues.findFirst({
      where: eq(colleagues.id, opp.nextActionOwnerId),
    });
    nextActionOwnerName = owner?.name ?? null;
  }

  const now = new Date().toISOString();
  const isOverdue = opp.nextActionDueDate != null && opp.nextActionCompletedAt == null && opp.nextActionDueDate < now;

  return {
    ...opp,
    linkedHumans,
    linkedPets,
    activities: oppActivities,
    nextActionOwnerName,
    isOverdue,
  };
}

// ─── Create ──────────────────────────────────────────────────────

export async function createOpportunity(
  db: DB,
  data: { stage?: string; seatsRequested?: number; passengerSeats?: number; petSeats?: number; lossReason?: string },
  colleagueId: string,
) {
  const now = new Date().toISOString();
  const id = createId();
  const displayId = await nextDisplayId(db, "OPP");

  await db.insert(opportunities).values({
    id,
    displayId,
    stage: data.stage ?? "open",
    seatsRequested: data.seatsRequested ?? 1,
    passengerSeats: data.passengerSeats ?? 1,
    petSeats: data.petSeats ?? 0,
    lossReason: data.lossReason ?? null,
    createdAt: now,
    updatedAt: now,
  });

  await logAuditEntry({
    db,
    colleagueId,
    action: "CREATE",
    entityType: "opportunity",
    entityId: id,
    changes: { created: { old: null, new: displayId } },
  });

  return { id, displayId };
}

// ─── Update ──────────────────────────────────────────────────────

export async function updateOpportunity(
  db: DB,
  id: string,
  data: { seatsRequested?: number; passengerSeats?: number; petSeats?: number; notes?: string | null; lossReason?: string | null; flightId?: string | null },
  colleagueId: string,
) {
  const existing = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_NOT_FOUND, "Opportunity not found");
  }

  const now = new Date().toISOString();
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};
  const updateFields: Record<string, unknown> = { updatedAt: now };

  if (data.seatsRequested !== undefined) {
    oldValues["seatsRequested"] = existing.seatsRequested;
    newValues["seatsRequested"] = data.seatsRequested;
    updateFields["seatsRequested"] = data.seatsRequested;
  }
  if (data.passengerSeats !== undefined) {
    oldValues["passengerSeats"] = existing.passengerSeats;
    newValues["passengerSeats"] = data.passengerSeats;
    updateFields["passengerSeats"] = data.passengerSeats;
  }
  if (data.petSeats !== undefined) {
    oldValues["petSeats"] = existing.petSeats;
    newValues["petSeats"] = data.petSeats;
    updateFields["petSeats"] = data.petSeats;
  }
  if (data.notes !== undefined) {
    oldValues["notes"] = existing.notes;
    newValues["notes"] = data.notes;
    updateFields["notes"] = data.notes;
  }
  if (data.lossReason !== undefined) {
    oldValues["lossReason"] = existing.lossReason;
    newValues["lossReason"] = data.lossReason;
    updateFields["lossReason"] = data.lossReason;
  }
  if (data.flightId !== undefined) {
    oldValues["flightId"] = existing.flightId;
    newValues["flightId"] = data.flightId;
    updateFields["flightId"] = data.flightId;
  }

  await db.update(opportunities).set(updateFields).where(eq(opportunities.id, id));

  const diff = computeDiff(oldValues, newValues);
  let auditEntryId: string | undefined;
  if (diff) {
    auditEntryId = await logAuditEntry({
      db,
      colleagueId,
      action: "UPDATE",
      entityType: "opportunity",
      entityId: id,
      changes: diff,
    });
  }

  const updated = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  return { data: updated, auditEntryId };
}

// ─── Delete ──────────────────────────────────────────────────────

export async function deleteOpportunity(db: DB, id: string) {
  const existing = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_NOT_FOUND, "Opportunity not found");
  }

  await db.delete(opportunityHumans).where(eq(opportunityHumans.opportunityId, id));
  await db.delete(opportunityPets).where(eq(opportunityPets.opportunityId, id));
  await db.update(activities).set({ opportunityId: null }).where(eq(activities.opportunityId, id));
  await db.delete(opportunities).where(eq(opportunities.id, id));
}

// ─── Stage ───────────────────────────────────────────────────────

export async function updateOpportunityStage(
  db: DB,
  id: string,
  data: { stage: string; lossReason?: string },
  colleagueId: string,
) {
  const existing = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_NOT_FOUND, "Opportunity not found");
  }

  const now = new Date().toISOString();
  const updateFields: Record<string, unknown> = { stage: data.stage, updatedAt: now };

  // Guardrails
  if (data.stage === "closed_lost") {
    if (!data.lossReason || data.lossReason.trim() === "") {
      throw badRequest(ERROR_CODES.OPPORTUNITY_LOSS_REASON_REQUIRED, "Loss reason is required for closed_lost");
    }
    updateFields["lossReason"] = data.lossReason;
    // Clear next action
    updateFields["nextActionOwnerId"] = null;
    updateFields["nextActionDescription"] = null;
    updateFields["nextActionType"] = null;
    updateFields["nextActionStartDate"] = null;
    updateFields["nextActionDueDate"] = null;
    updateFields["nextActionCompletedAt"] = null;
  } else if (data.stage === "closed_flown") {
    // Auto-complete next action if present
    if (existing.nextActionDescription && !existing.nextActionCompletedAt) {
      updateFields["nextActionCompletedAt"] = now;

      // Create activity from next action
      const actDisplayId = await nextDisplayId(db, "ACT");
      await db.insert(activities).values({
        id: createId(),
        displayId: actDisplayId,
        type: (existing.nextActionType as "email") ?? "email",
        subject: `[Auto] ${existing.nextActionDescription}`,
        activityDate: now,
        opportunityId: id,
        colleagueId,
        createdAt: now,
        updatedAt: now,
      });
    }
    // Clear next action fields
    updateFields["nextActionOwnerId"] = null;
    updateFields["nextActionDescription"] = null;
    updateFields["nextActionType"] = null;
    updateFields["nextActionStartDate"] = null;
    updateFields["nextActionDueDate"] = null;
    updateFields["nextActionCompletedAt"] = null;
  } else {
    // Non-terminal: require next action populated
    const hasNextAction = existing.nextActionDescription || (
      updateFields["nextActionDescription"] as string | undefined
    );
    if (!hasNextAction && !existing.nextActionDescription) {
      throw badRequest(ERROR_CODES.OPPORTUNITY_NEXT_ACTION_REQUIRED, "A next action is required before moving to a non-terminal stage");
    }
  }

  await db.update(opportunities).set(updateFields).where(eq(opportunities.id, id));

  const diff = computeDiff({ stage: existing.stage }, { stage: data.stage });
  let auditEntryId: string | undefined;
  if (diff) {
    auditEntryId = await logAuditEntry({
      db,
      colleagueId,
      action: "STAGE_CHANGE",
      entityType: "opportunity",
      entityId: id,
      changes: diff,
    });
  }

  const updated = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  return { data: updated, auditEntryId };
}

// ─── Link/Unlink Humans ──────────────────────────────────────────

export async function linkOpportunityHuman(
  db: DB,
  oppId: string,
  data: { humanId: string; roleId?: string },
) {
  const opp = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, oppId),
  });
  if (opp == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_NOT_FOUND, "Opportunity not found");
  }

  const existingLinks = await db.select().from(opportunityHumans).where(eq(opportunityHumans.opportunityId, oppId));

  // Get role configs
  const roleConfigs = await db.select().from(opportunityHumanRolesConfig);
  const primaryRoleId = roleConfigs.find((r) => r.name === "primary")?.id ?? null;
  const passengerRoleId = roleConfigs.find((r) => r.name === "passenger")?.id ?? null;

  let roleId: string | null;
  if (existingLinks.length === 0) {
    // First human → force primary
    roleId = primaryRoleId;
  } else {
    roleId = data.roleId ?? passengerRoleId;
  }

  // If setting as primary, demote existing primary
  if (roleId === primaryRoleId) {
    const currentPrimary = existingLinks.find((l) => l.roleId === primaryRoleId);
    if (currentPrimary) {
      await db.update(opportunityHumans).set({ roleId: passengerRoleId }).where(eq(opportunityHumans.id, currentPrimary.id));
    }
  }

  const link = {
    id: createId(),
    opportunityId: oppId,
    humanId: data.humanId,
    roleId,
    createdAt: new Date().toISOString(),
  };
  await db.insert(opportunityHumans).values(link);
  return link;
}

export async function updateOpportunityHumanRole(
  db: DB,
  linkId: string,
  data: { roleId: string },
) {
  const link = await db.query.opportunityHumans.findFirst({
    where: eq(opportunityHumans.id, linkId),
  });
  if (link == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_LINK_NOT_FOUND, "Link not found");
  }

  const roleConfigs = await db.select().from(opportunityHumanRolesConfig);
  const primaryRoleId = roleConfigs.find((r) => r.name === "primary")?.id ?? null;
  const passengerRoleId = roleConfigs.find((r) => r.name === "passenger")?.id ?? null;

  // If setting to primary, demote old primary
  if (data.roleId === primaryRoleId) {
    const existingLinks = await db.select().from(opportunityHumans).where(eq(opportunityHumans.opportunityId, link.opportunityId));
    const currentPrimary = existingLinks.find((l) => l.roleId === primaryRoleId && l.id !== linkId);
    if (currentPrimary) {
      await db.update(opportunityHumans).set({ roleId: passengerRoleId }).where(eq(opportunityHumans.id, currentPrimary.id));
    }
  }

  await db.update(opportunityHumans).set({ roleId: data.roleId }).where(eq(opportunityHumans.id, linkId));
  return { id: linkId, roleId: data.roleId };
}

export async function unlinkOpportunityHuman(db: DB, linkId: string) {
  const link = await db.query.opportunityHumans.findFirst({
    where: eq(opportunityHumans.id, linkId),
  });
  if (link == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_LINK_NOT_FOUND, "Link not found");
  }

  // Check if this is the primary on a non-terminal opportunity
  const roleConfigs = await db.select().from(opportunityHumanRolesConfig);
  const primaryRoleId = roleConfigs.find((r) => r.name === "primary")?.id ?? null;

  if (link.roleId === primaryRoleId) {
    const opp = await db.query.opportunities.findFirst({
      where: eq(opportunities.id, link.opportunityId),
    });
    if (opp && !TERMINAL_STAGES.includes(opp.stage)) {
      // Check if there are other humans
      const otherLinks = await db.select().from(opportunityHumans).where(
        and(eq(opportunityHumans.opportunityId, link.opportunityId), sql`${opportunityHumans.id} != ${linkId}`),
      );
      if (otherLinks.length > 0) {
        throw badRequest(ERROR_CODES.OPPORTUNITY_PRIMARY_REQUIRED, "Cannot remove primary human while other humans are linked on a non-terminal opportunity");
      }
    }
  }

  await db.delete(opportunityHumans).where(eq(opportunityHumans.id, linkId));
}

// ─── Link/Unlink Pets ────────────────────────────────────────────

export async function linkOpportunityPet(
  db: DB,
  oppId: string,
  data: { petId: string },
) {
  const opp = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, oppId),
  });
  if (opp == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_NOT_FOUND, "Opportunity not found");
  }

  // Check pet's owner is linked to this opportunity
  const pet = await db.query.pets.findFirst({
    where: eq(pets.id, data.petId),
  });
  if (pet == null) {
    throw notFound(ERROR_CODES.PET_NOT_FOUND, "Pet not found");
  }

  if (pet.humanId) {
    const ownerLinked = await db.query.opportunityHumans.findFirst({
      where: and(eq(opportunityHumans.opportunityId, oppId), eq(opportunityHumans.humanId, pet.humanId)),
    });
    if (ownerLinked == null) {
      throw badRequest(ERROR_CODES.OPPORTUNITY_PET_OWNER_NOT_LINKED, "Pet's owner must be linked to the opportunity first");
    }
  }

  const link = {
    id: createId(),
    opportunityId: oppId,
    petId: data.petId,
    createdAt: new Date().toISOString(),
  };
  await db.insert(opportunityPets).values(link);
  return link;
}

export async function unlinkOpportunityPet(db: DB, linkId: string) {
  const link = await db.query.opportunityPets.findFirst({
    where: eq(opportunityPets.id, linkId),
  });
  if (link == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_LINK_NOT_FOUND, "Link not found");
  }
  await db.delete(opportunityPets).where(eq(opportunityPets.id, linkId));
}

// ─── Next Action ─────────────────────────────────────────────────

export async function updateNextAction(
  db: DB,
  id: string,
  data: { ownerId: string; description: string; type: string; startDate?: string; dueDate: string },
  colleagueId: string,
) {
  const existing = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_NOT_FOUND, "Opportunity not found");
  }

  const now = new Date().toISOString();
  await db.update(opportunities).set({
    nextActionOwnerId: data.ownerId,
    nextActionDescription: data.description,
    nextActionType: data.type,
    nextActionStartDate: data.startDate ?? null,
    nextActionDueDate: data.dueDate,
    nextActionCompletedAt: null,
    updatedAt: now,
  }).where(eq(opportunities.id, id));

  const diff = computeDiff(
    { nextActionDescription: existing.nextActionDescription, nextActionType: existing.nextActionType, nextActionStartDate: existing.nextActionStartDate, nextActionDueDate: existing.nextActionDueDate },
    { nextActionDescription: data.description, nextActionType: data.type, nextActionStartDate: data.startDate ?? null, nextActionDueDate: data.dueDate },
  );
  let auditEntryId: string | undefined;
  if (diff) {
    auditEntryId = await logAuditEntry({
      db,
      colleagueId,
      action: "UPDATE",
      entityType: "opportunity",
      entityId: id,
      changes: diff,
    });
  }

  const updated = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  return { data: updated, auditEntryId };
}

// ─── Link/Unlink Flight ─────────────────────────────────────────

export async function linkOpportunityFlight(db: DB, id: string, flightId: string, colleagueId: string) {
  const existing = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_NOT_FOUND, "Opportunity not found");
  }

  const now = new Date().toISOString();
  await db.update(opportunities).set({ flightId, updatedAt: now }).where(eq(opportunities.id, id));

  const diff = computeDiff({ flightId: existing.flightId }, { flightId });
  if (diff) {
    await logAuditEntry({
      db,
      colleagueId,
      action: "UPDATE",
      entityType: "opportunity",
      entityId: id,
      changes: diff,
    });
  }

  const updated = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  return { data: updated };
}

export async function unlinkOpportunityFlight(db: DB, id: string, colleagueId: string) {
  const existing = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_NOT_FOUND, "Opportunity not found");
  }

  const now = new Date().toISOString();
  await db.update(opportunities).set({ flightId: null, updatedAt: now }).where(eq(opportunities.id, id));

  const diff = computeDiff({ flightId: existing.flightId }, { flightId: null });
  if (diff) {
    await logAuditEntry({
      db,
      colleagueId,
      action: "UPDATE",
      entityType: "opportunity",
      entityId: id,
      changes: diff,
    });
  }

  const updated = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  return { data: updated };
}

export async function completeNextAction(db: DB, id: string, colleagueId: string) {
  const existing = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.OPPORTUNITY_NOT_FOUND, "Opportunity not found");
  }

  if (!existing.nextActionDescription) {
    throw badRequest(ERROR_CODES.OPPORTUNITY_NEXT_ACTION_REQUIRED, "No next action to complete");
  }

  const now = new Date().toISOString();

  // Create activity from next action
  const actDisplayId = await nextDisplayId(db, "ACT");
  await db.insert(activities).values({
    id: createId(),
    displayId: actDisplayId,
    type: (existing.nextActionType as "email") ?? "email",
    subject: existing.nextActionDescription,
    activityDate: now,
    opportunityId: id,
    colleagueId,
    createdAt: now,
    updatedAt: now,
  });

  // Clear next action fields
  await db.update(opportunities).set({
    nextActionOwnerId: null,
    nextActionDescription: null,
    nextActionType: null,
    nextActionStartDate: null,
    nextActionDueDate: null,
    nextActionCompletedAt: null,
    updatedAt: now,
  }).where(eq(opportunities.id, id));

  await logAuditEntry({
    db,
    colleagueId,
    action: "NEXT_ACTION_DONE",
    entityType: "opportunity",
    entityId: id,
    changes: { nextActionDescription: { old: existing.nextActionDescription, new: null } },
  });

  const updated = await db.query.opportunities.findFirst({
    where: eq(opportunities.id, id),
  });
  return { data: updated };
}
