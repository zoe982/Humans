import { eq, sql, inArray, desc, like, or } from "drizzle-orm";
import {
  humans,
  emails,
  humanTypes,
  humanRouteSignups,
  phones,
  pets,
  geoInterestExpressions,
  geoInterests,
  routeInterestExpressions,
  routeInterests,
  accountHumans,
  accounts,
  accountHumanLabelsConfig,
  humanEmailLabelsConfig,
  humanPhoneLabelsConfig,
  socialIds,
  socialIdPlatformsConfig,
} from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { computeDiff, logAuditEntry } from "../lib/audit";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

export async function listHumans(db: DB, page: number, limit: number, search?: string) {
  const offset = (page - 1) * limit;

  const searchFilter = search
    ? or(
        like(humans.firstName, `%${search}%`),
        like(humans.lastName, `%${search}%`),
        like(humans.displayId, `%${search}%`),
      )
    : undefined;

  const countResult = await db.select({ total: sql<number>`count(*)` }).from(humans).where(searchFilter);
  const total = countResult[0]?.total ?? 0;

  const pagedHumans = await db
    .select()
    .from(humans)
    .where(searchFilter)
    .orderBy(desc(humans.createdAt))
    .limit(limit)
    .offset(offset);

  const humanIds = pagedHumans.map((h) => h.id);

  const relatedEmails = humanIds.length > 0
    ? await db.select().from(emails).where(inArray(emails.ownerId, humanIds))
    : [];
  const relatedTypes = humanIds.length > 0
    ? await db.select().from(humanTypes).where(inArray(humanTypes.humanId, humanIds))
    : [];

  const data = pagedHumans.map((h) => ({
    ...h,
    emails: relatedEmails.filter((e) => e.ownerType === "human" && e.ownerId === h.id),
    types: relatedTypes.filter((t) => t.humanId === h.id).map((t) => t.type),
  }));

  return { data, meta: { page, limit, total } };
}

export async function getHumanDetail(db: DB, humanId: string) {
  const human = await db.query.humans.findFirst({
    where: eq(humans.id, humanId),
  });
  if (human == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  const [humanEmails, types, linkedSignups, humanPhones, humanPets, geoExpressions, routeExpressions, linkedAccountRows, emailLabelConfigs, phoneLabelConfigs, humanSocialIds, allPlatforms] = await Promise.all([
    db.select().from(emails).where(eq(emails.ownerId, human.id)),
    db.select().from(humanTypes).where(eq(humanTypes.humanId, human.id)),
    db.select().from(humanRouteSignups).where(eq(humanRouteSignups.humanId, human.id)),
    db.select().from(phones).where(eq(phones.ownerId, human.id)),
    db.select().from(pets).where(eq(pets.humanId, human.id)),
    db.select().from(geoInterestExpressions).where(eq(geoInterestExpressions.humanId, human.id)),
    db.select().from(routeInterestExpressions).where(eq(routeInterestExpressions.humanId, human.id)),
    db.select().from(accountHumans).where(eq(accountHumans.humanId, human.id)),
    db.select().from(humanEmailLabelsConfig),
    db.select().from(humanPhoneLabelsConfig),
    db.select().from(socialIds).where(eq(socialIds.humanId, human.id)),
    db.select().from(socialIdPlatformsConfig),
  ]);

  const allGeoInterests = geoExpressions.length > 0
    ? await db.select().from(geoInterests)
    : [];

  const geoInterestExpressionsWithDetails = geoExpressions.map((expr) => {
    const gi = allGeoInterests.find((g) => g.id === expr.geoInterestId);
    return {
      ...expr,
      city: gi?.city ?? null,
      country: gi?.country ?? null,
    };
  });

  const allRouteInterests = routeExpressions.length > 0
    ? await db.select().from(routeInterests)
    : [];

  const routeInterestExpressionsWithDetails = routeExpressions.map((expr) => {
    const ri = allRouteInterests.find((r) => r.id === expr.routeInterestId);
    return {
      ...expr,
      originCity: ri?.originCity ?? null,
      originCountry: ri?.originCountry ?? null,
      destinationCity: ri?.destinationCity ?? null,
      destinationCountry: ri?.destinationCountry ?? null,
    };
  });

  let linkedAccounts: { id: string; accountId: string; accountName: string; labelName: string | null }[] = [];
  if (linkedAccountRows.length > 0) {
    const [allAccounts, allLabels] = await Promise.all([
      db.select().from(accounts),
      db.select().from(accountHumanLabelsConfig),
    ]);
    linkedAccounts = linkedAccountRows.map((row) => {
      const account = allAccounts.find((a) => a.id === row.accountId);
      const label = row.labelId ? allLabels.find((l) => l.id === row.labelId) : null;
      return {
        id: row.id,
        accountId: row.accountId,
        accountName: account?.name ?? "Unknown",
        labelName: label?.name ?? null,
      };
    });
  }

  const emailsWithLabels = humanEmails
    .filter((e) => e.ownerType === "human")
    .map((e) => {
      const label = e.labelId ? emailLabelConfigs.find((l) => l.id === e.labelId) : null;
      return { ...e, labelName: label?.name ?? null };
    });
  const phoneNumbersWithLabels = humanPhones
    .filter((p) => p.ownerType === "human")
    .map((p) => {
      const label = p.labelId ? phoneLabelConfigs.find((l) => l.id === p.labelId) : null;
      return { ...p, labelName: label?.name ?? null };
    });

  const socialIdsWithPlatforms = humanSocialIds.map((s) => {
    const platform = s.platformId ? allPlatforms.find((p) => p.id === s.platformId) : null;
    return { ...s, platformName: platform?.name ?? null };
  });

  return {
    ...human,
    emails: emailsWithLabels,
    types: types.map((t) => t.type),
    linkedRouteSignups: linkedSignups,
    phoneNumbers: phoneNumbersWithLabels,
    pets: humanPets,
    geoInterestExpressions: geoInterestExpressionsWithDetails,
    routeInterestExpressions: routeInterestExpressionsWithDetails,
    linkedAccounts,
    socialIds: socialIdsWithPlatforms,
  };
}

export async function createHuman(
  db: DB,
  data: { firstName: string; middleName?: string | null; lastName: string; status?: string; emails: { email: string; labelId?: string | null; isPrimary?: boolean }[]; types: string[] },
) {
  const now = new Date().toISOString();
  const humanId = createId();
  const displayId = await nextDisplayId(db, "HUM");

  await db.insert(humans).values({
    id: humanId,
    displayId,
    firstName: data.firstName,
    middleName: data.middleName ?? null,
    lastName: data.lastName,
    status: data.status ?? "open",
    createdAt: now,
    updatedAt: now,
  });

  for (const email of data.emails) {
    const emailDisplayId = await nextDisplayId(db, "EML");
    await db.insert(emails).values({
      id: createId(),
      displayId: emailDisplayId,
      ownerType: "human",
      ownerId: humanId,
      email: email.email,
      labelId: email.labelId ?? null,
      isPrimary: email.isPrimary ?? false,
      createdAt: now,
    });
  }

  for (const type of data.types) {
    await db.insert(humanTypes).values({
      id: createId(),
      humanId,
      type,
      createdAt: now,
    });
  }

  return { id: humanId, displayId };
}

export async function updateHuman(
  db: DB,
  id: string,
  data: { firstName?: string; middleName?: string; lastName?: string; status?: string; emails?: { email: string; labelId?: string | null; isPrimary?: boolean }[]; types?: string[] },
  colleagueId: string,
) {
  const now = new Date().toISOString();

  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  const existingTypes = await db.select().from(humanTypes).where(eq(humanTypes.humanId, id));
  const oldValues: Record<string, unknown> = {
    firstName: existing.firstName,
    middleName: existing.middleName,
    lastName: existing.lastName,
  };
  if (data.types !== undefined) {
    oldValues["types"] = existingTypes.map((t) => t.type).sort();
  }

  const updateFields: Record<string, unknown> = { updatedAt: now };
  if (data.firstName !== undefined) updateFields["firstName"] = data.firstName;
  if (data.middleName !== undefined) updateFields["middleName"] = data.middleName;
  if (data.lastName !== undefined) updateFields["lastName"] = data.lastName;
  if (data.status !== undefined) updateFields["status"] = data.status;

  await db.update(humans).set(updateFields).where(eq(humans.id, id));

  if (data.emails) {
    await db.delete(emails).where(eq(emails.ownerId, id));
    for (const email of data.emails) {
      const emailDisplayId = await nextDisplayId(db, "EML");
      await db.insert(emails).values({
        id: createId(),
        displayId: emailDisplayId,
        ownerType: "human",
        ownerId: id,
        email: email.email,
        labelId: email.labelId ?? null,
        isPrimary: email.isPrimary ?? false,
        createdAt: now,
      });
    }
  }

  if (data.types) {
    await db.delete(humanTypes).where(eq(humanTypes.humanId, id));
    for (const type of data.types) {
      await db.insert(humanTypes).values({
        id: createId(),
        humanId: id,
        type,
        createdAt: now,
      });
    }
  }

  const newValues: Record<string, unknown> = {};
  if (data.firstName !== undefined) newValues["firstName"] = data.firstName;
  if (data.middleName !== undefined) newValues["middleName"] = data.middleName;
  if (data.lastName !== undefined) newValues["lastName"] = data.lastName;
  if (data.types !== undefined) newValues["types"] = [...data.types].sort();

  const diff = computeDiff(oldValues, newValues);
  let auditEntryId: string | undefined;
  if (diff) {
    auditEntryId = await logAuditEntry({
      db,
      colleagueId,
      action: "UPDATE",
      entityType: "human",
      entityId: id,
      changes: diff,
    });
  }

  const updated = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  return { data: updated, auditEntryId };
}

export async function updateHumanStatus(db: DB, id: string, status: string, colleagueId: string) {
  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  const oldStatus = existing.status;
  await db
    .update(humans)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(humans.id, id));

  let auditEntryId: string | undefined;
  if (oldStatus !== status) {
    const diff = computeDiff({ status: oldStatus }, { status });
    if (diff) {
      auditEntryId = await logAuditEntry({
        db,
        colleagueId,
        action: "UPDATE",
        entityType: "human",
        entityId: id,
        changes: diff,
      });
    }
  }

  return { id, status, auditEntryId };
}

export async function deleteHuman(db: DB, id: string) {
  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  await db.delete(emails).where(eq(emails.ownerId, id));
  await db.delete(humanTypes).where(eq(humanTypes.humanId, id));
  await db.delete(humanRouteSignups).where(eq(humanRouteSignups.humanId, id));
  await db.delete(phones).where(eq(phones.ownerId, id));
  await db.delete(pets).where(eq(pets.humanId, id));
  await db.delete(geoInterestExpressions).where(eq(geoInterestExpressions.humanId, id));
  await db.delete(routeInterestExpressions).where(eq(routeInterestExpressions.humanId, id));
  await db.delete(accountHumans).where(eq(accountHumans.humanId, id));
  await db.update(socialIds).set({ humanId: null }).where(eq(socialIds.humanId, id));
  await db.delete(humans).where(eq(humans.id, id));
}

export async function linkRouteSignup(db: DB, humanId: string, routeSignupId: string) {
  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, humanId),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  const link = {
    id: createId(),
    humanId,
    routeSignupId,
    linkedAt: new Date().toISOString(),
  };
  await db.insert(humanRouteSignups).values(link);
  return link;
}

export async function unlinkRouteSignup(db: DB, linkId: string) {
  await db.delete(humanRouteSignups).where(eq(humanRouteSignups.id, linkId));
}
