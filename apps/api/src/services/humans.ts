import { and, eq, ne, sql, inArray, desc, like, or } from "drizzle-orm";
import {
  humans,
  humanStatuses,
  emails,
  humanTypes,
  humanTypeValues,
  humanRouteSignups,
  humanWebsiteBookingRequests,
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
  websites,
  humanRelationships,
  humanRelationshipLabelsConfig,
  activities,
} from "@humans/db/schema";
import type { HumanStatus, HumanType } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { computeDiff, logAuditEntry } from "../lib/audit";
import { notFound, conflict } from "../lib/errors";
import { assertUniqueIds } from "../lib/assert-unique-ids";
import { nextDisplayId } from "../lib/display-id";
import { rematchActivitiesByEmail } from "./activity-rematch";
import { listActivities } from "./activities";
import { listOpportunities } from "./opportunities";
import { listGeneralLeads } from "./general-leads";
import { listAgreements } from "./agreements";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DB } from "./types";

const humanStatusesSet = new Set<string>(humanStatuses);
const humanTypeValuesSet = new Set<string>(humanTypeValues);

function isHumanStatus(value: string): value is HumanStatus {
  return humanStatusesSet.has(value);
}

function toHumanStatus(value: string): HumanStatus {
  return isHumanStatus(value) ? value : "open";
}

function isHumanType(value: string): value is HumanType {
  return humanTypeValuesSet.has(value);
}

function toHumanType(value: string): HumanType {
  return isHumanType(value) ? value : "client";
}

export async function listHumans(db: DB, page: number, limit: number, search?: string): Promise<{ data: { emails: (typeof emails.$inferSelect)[]; types: string[]; id: string; displayId: string; firstName: string; middleName: string | null; lastName: string; status: string; createdAt: string; updatedAt: string }[]; meta: { page: number; limit: number; total: number } }> {
  const offset = (page - 1) * limit;

  const searchFilter = search != null
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
    ? await db.select().from(emails).where(inArray(emails.humanId, humanIds))
    : [];
  const relatedTypes = humanIds.length > 0
    ? await db.select().from(humanTypes).where(inArray(humanTypes.humanId, humanIds))
    : [];

  const data = pagedHumans.map((h) => ({
    ...h,
    emails: relatedEmails.filter((e) => e.humanId === h.id),
    types: relatedTypes.filter((t) => t.humanId === h.id).map((t) => t.type),
  }));

  return { data, meta: { page, limit, total } };
}

export async function getHumanDetail(supabase: SupabaseClient, db: DB, humanId: string): Promise<Record<string, unknown>> {
  const human = await db.query.humans.findFirst({
    where: eq(humans.id, humanId),
  });
  if (human == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  const [humanEmails, types, linkedSignups, linkedBookingRequests, humanPhones, humanPets, geoExpressions, routeExpressions, linkedAccountRows, emailLabelConfigs, phoneLabelConfigs, humanSocialIds, allPlatforms, humanWebsites] = await Promise.all([
    db.select().from(emails).where(eq(emails.humanId, human.id)),
    db.select().from(humanTypes).where(eq(humanTypes.humanId, human.id)),
    db.select().from(humanRouteSignups).where(eq(humanRouteSignups.humanId, human.id)),
    db.select().from(humanWebsiteBookingRequests).where(eq(humanWebsiteBookingRequests.humanId, human.id)),
    db.select().from(phones).where(eq(phones.humanId, human.id)),
    db.select().from(pets).where(eq(pets.humanId, human.id)),
    db.select().from(geoInterestExpressions).where(eq(geoInterestExpressions.humanId, human.id)),
    db.select().from(routeInterestExpressions).where(eq(routeInterestExpressions.humanId, human.id)),
    db.select().from(accountHumans).where(eq(accountHumans.humanId, human.id)),
    db.select().from(humanEmailLabelsConfig),
    db.select().from(humanPhoneLabelsConfig),
    db.select().from(socialIds).where(eq(socialIds.humanId, human.id)),
    db.select().from(socialIdPlatformsConfig),
    db.select().from(websites).where(eq(websites.humanId, human.id)),
  ]);

  // Fetch referral codes from Supabase
  const { data: supaReferralCodes } = await supabase
    .from("referral_codes")
    .select("id, display_id, code, description, is_active")
    .eq("human_id", human.id);

  const humanReferralCodes = (supaReferralCodes ?? []).map((rc: { id: string; display_id: string; code: string; description: string | null; is_active: boolean }) => ({
    id: rc.id,
    displayId: rc.display_id,
    code: rc.code,
    description: rc.description,
    isActive: rc.is_active,
  }));

  // Fetch discount codes from Supabase
  const { data: supaDiscountCodes } = await supabase
    .from("discount_codes")
    .select("id, crm_display_id, code, description, percent_off, is_active")
    .eq("human_id", human.id);

  const humanDiscountCodes = (supaDiscountCodes ?? []).map((dc: { id: string; crm_display_id: string | null; code: string; description: string | null; percent_off: number; is_active: boolean }) => ({
    id: dc.id,
    crmDisplayId: dc.crm_display_id,
    code: dc.code,
    description: dc.description,
    percentOff: dc.percent_off,
    isActive: dc.is_active,
  }));

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

  let linkedAccounts: { id: string; accountId: string; accountName: string; labelId: string | null; labelName: string | null }[] = [];
  if (linkedAccountRows.length > 0) {
    const linkedAccountIds = linkedAccountRows.map((r) => r.accountId);
    const [allAccounts, allLabels] = await Promise.all([
      db.select().from(accounts).where(inArray(accounts.id, linkedAccountIds)),
      db.select().from(accountHumanLabelsConfig),
    ]);
    linkedAccounts = linkedAccountRows.map((row) => {
      const account = allAccounts.find((a) => a.id === row.accountId);
      const label = row.labelId != null ? allLabels.find((l) => l.id === row.labelId) : null;
      return {
        id: row.id,
        accountId: row.accountId,
        accountName: account?.name ?? "Unknown",
        labelId: row.labelId,
        labelName: label?.name ?? null,
      };
    });
  }

  const emailsWithLabels = humanEmails
    .map((e) => {
      const label = e.labelId != null ? emailLabelConfigs.find((l) => l.id === e.labelId) : null;
      return { ...e, labelName: label?.name ?? null };
    });
  const phoneNumbersWithLabels = humanPhones
    .map((p) => {
      const label = p.labelId != null ? phoneLabelConfigs.find((l) => l.id === p.labelId) : null;
      return { ...p, labelName: label?.name ?? null };
    });

  const socialIdsWithPlatforms = humanSocialIds.map((s) => {
    const platform = s.platformId != null ? allPlatforms.find((p) => p.id === s.platformId) : null;
    return { ...s, platformName: platform?.name ?? null };
  });

  return {
    ...human,
    emails: emailsWithLabels,
    types: types.map((t) => t.type),
    linkedRouteSignups: linkedSignups,
    linkedWebsiteBookingRequests: linkedBookingRequests,
    phoneNumbers: phoneNumbersWithLabels,
    pets: humanPets,
    geoInterestExpressions: geoInterestExpressionsWithDetails,
    routeInterestExpressions: routeInterestExpressionsWithDetails,
    linkedAccounts: assertUniqueIds(linkedAccounts, "human-linked-accounts"),
    socialIds: socialIdsWithPlatforms,
    referralCodes: humanReferralCodes,
    discountCodes: humanDiscountCodes,
    websites: humanWebsites,
  };
}

export async function getHumanDetailFull(
  supabase: SupabaseClient,
  db: DB,
  humanId: string,
): Promise<{
  human: Record<string, unknown>;
  activities: { data: unknown[]; meta: { page: number; limit: number; total: number } };
  opportunities: { data: unknown[]; meta: { page: number; limit: number; total: number } };
  generalLeads: { data: unknown[]; meta: { page: number; limit: number; total: number } };
  relationships: unknown[];
  agreements: { data: unknown[]; meta: { page: number; limit: number; total: number } };
}> {
  // getHumanDetail throws 404 if human not found
  const [human, activitiesResult, opportunitiesResult, generalLeadsResult, relationshipsResult, agreementsResult] = await Promise.all([
    getHumanDetail(supabase, db, humanId),
    listActivities(db, { humanId, page: 1, limit: 200, includeLinkedEntities: true }),
    listOpportunities(db, 1, 50, { humanId }),
    listGeneralLeads(db, 1, 50, { convertedHumanId: humanId }),
    getHumanRelationships(db, humanId),
    listAgreements(db, 1, 50, { humanId }),
  ]);

  return {
    human,
    activities: activitiesResult,
    opportunities: opportunitiesResult,
    generalLeads: generalLeadsResult,
    relationships: relationshipsResult,
    agreements: agreementsResult,
  };
}

async function assertNoDuplicateName(
  db: DB,
  firstName: string,
  lastName: string,
  excludeId?: string,
): Promise<void> {
  const conditions = [
    sql`lower(${humans.firstName}) = lower(${firstName})`,
    sql`lower(${humans.lastName}) = lower(${lastName})`,
  ];
  if (excludeId != null) {
    conditions.push(ne(humans.id, excludeId));
  }
  const existing = await db.query.humans.findFirst({
    where: and(...conditions),
  });
  if (existing != null) {
    throw conflict(
      ERROR_CODES.HUMAN_DUPLICATE_NAME,
      `A human named "${firstName} ${lastName}" already exists`,
    );
  }
}

export async function createHuman(
  db: DB,
  data: { firstName: string; middleName?: string | null | undefined; lastName: string; status?: string | undefined; emails: { email: string; labelId?: string | null | undefined; isPrimary?: boolean | undefined }[]; types: string[] },
): Promise<{ id: string; displayId: string }> {
  const now = new Date().toISOString();
  const humanId = createId();
  const displayId = await nextDisplayId(db, "HUM");

  await assertNoDuplicateName(db, data.firstName, data.lastName);

  await db.insert(humans).values({
    id: humanId,
    displayId,
    firstName: data.firstName,
    middleName: data.middleName ?? null,
    lastName: data.lastName,
    status: toHumanStatus(data.status ?? "open"),
    createdAt: now,
    updatedAt: now,
  });

  for (const email of data.emails) {
    const emailDisplayId = await nextDisplayId(db, "EML");
    await db.insert(emails).values({
      id: createId(),
      displayId: emailDisplayId,
      humanId,
      accountId: null,
      generalLeadId: null,
      websiteBookingRequestId: null,
      routeSignupId: null,
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
      type: toHumanType(type),
      createdAt: now,
    });
  }

  // Rematch unlinked activities by email/phone
  for (const email of data.emails) {
    await rematchActivitiesByEmail(db, humanId, email.email);
  }

  return { id: humanId, displayId };
}

export async function updateHuman(
  db: DB,
  id: string,
  data: { firstName?: string | undefined; middleName?: string | null | undefined; lastName?: string | undefined; status?: string | undefined; emails?: { email: string; labelId?: string | null | undefined; isPrimary?: boolean | undefined }[] | undefined; types?: string[] | undefined },
  colleagueId: string,
): Promise<{ data: typeof humans.$inferSelect | undefined; auditEntryId: string | undefined }> {
  const now = new Date().toISOString();

  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  const effectiveFirst = data.firstName ?? existing.firstName;
  const effectiveLast = data.lastName ?? existing.lastName;
  if (data.firstName !== undefined || data.lastName !== undefined) {
    await assertNoDuplicateName(db, effectiveFirst, effectiveLast, id);
  }

  const existingTypes = await db.select().from(humanTypes).where(eq(humanTypes.humanId, id));
  const oldValues: Record<string, unknown> = {
    firstName: existing.firstName,
    middleName: existing.middleName,
    lastName: existing.lastName,
  };
  if (data.types !== undefined) {
    oldValues["types"] = existingTypes.map((t) => t.type).sort((a, b) => a.localeCompare(b));
  }

  const updateFields: Record<string, unknown> = { updatedAt: now };
  if (data.firstName !== undefined) updateFields["firstName"] = data.firstName;
  if (data.middleName !== undefined) updateFields["middleName"] = data.middleName;
  if (data.lastName !== undefined) updateFields["lastName"] = data.lastName;
  if (data.status !== undefined) updateFields["status"] = data.status;

  await db.update(humans).set(updateFields).where(eq(humans.id, id));

  if (data.emails != null) {
    await db.delete(emails).where(eq(emails.humanId, id));
    for (const email of data.emails) {
      const emailDisplayId = await nextDisplayId(db, "EML");
      await db.insert(emails).values({
        id: createId(),
        displayId: emailDisplayId,
        humanId: id,
        accountId: null,
        generalLeadId: null,
        websiteBookingRequestId: null,
        routeSignupId: null,
        email: email.email,
        labelId: email.labelId ?? null,
        isPrimary: email.isPrimary ?? false,
        createdAt: now,
      });
    }
  }

  if (data.types != null) {
    await db.delete(humanTypes).where(eq(humanTypes.humanId, id));
    for (const type of data.types) {
      await db.insert(humanTypes).values({
        id: createId(),
        humanId: id,
        type: toHumanType(type),
        createdAt: now,
      });
    }
  }

  const newValues: Record<string, unknown> = {};
  if (data.firstName !== undefined) newValues["firstName"] = data.firstName;
  if (data.middleName !== undefined) newValues["middleName"] = data.middleName;
  if (data.lastName !== undefined) newValues["lastName"] = data.lastName;
  if (data.types !== undefined) newValues["types"] = [...data.types].sort((a, b) => a.localeCompare(b));

  const diff = computeDiff(oldValues, newValues);
  let auditEntryId: string | undefined;
  if (diff != null) {
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

export async function updateHumanStatus(db: DB, id: string, status: string, colleagueId: string): Promise<{ id: string; status: string; auditEntryId: string | undefined }> {
  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  const oldStatus = existing.status;
  await db
    .update(humans)
    .set({ status: toHumanStatus(status), updatedAt: new Date().toISOString() })
    .where(eq(humans.id, id));

  let auditEntryId: string | undefined;
  if (oldStatus !== status) {
    const diff = computeDiff({ status: oldStatus }, { status });
    if (diff != null) {
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

export async function deleteHuman(supabase: SupabaseClient, db: DB, id: string): Promise<void> {
  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  await db.update(emails).set({ humanId: null }).where(eq(emails.humanId, id));
  await db.delete(humanTypes).where(eq(humanTypes.humanId, id));
  await db.delete(humanRouteSignups).where(eq(humanRouteSignups.humanId, id));
  await db.delete(humanWebsiteBookingRequests).where(eq(humanWebsiteBookingRequests.humanId, id));
  await db.update(phones).set({ humanId: null }).where(eq(phones.humanId, id));
  await db.delete(pets).where(eq(pets.humanId, id));
  await db.delete(geoInterestExpressions).where(eq(geoInterestExpressions.humanId, id));
  await db.delete(routeInterestExpressions).where(eq(routeInterestExpressions.humanId, id));
  await db.delete(accountHumans).where(eq(accountHumans.humanId, id));
  await db.delete(humanRelationships).where(or(eq(humanRelationships.humanId1, id), eq(humanRelationships.humanId2, id)));
  await db.update(socialIds).set({ humanId: null }).where(eq(socialIds.humanId, id));
  await db.update(websites).set({ humanId: null }).where(eq(websites.humanId, id));
  await supabase.from("referral_codes").update({ human_id: null }).eq("human_id", id);
  await supabase.from("discount_codes").update({ human_id: null }).eq("human_id", id);
  await db.delete(humans).where(eq(humans.id, id));
}

export async function linkRouteSignup(db: DB, humanId: string, routeSignupId: string): Promise<{ id: string; humanId: string; routeSignupId: string; linkedAt: string }> {
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

  // Dual-associate activities/emails/phones/socialIds (keep routeSignupId, add humanId)
  await db.update(activities).set({ humanId }).where(
    and(eq(activities.routeSignupId, routeSignupId), sql`${activities.humanId} IS NULL`),
  );
  await db.update(emails).set({ humanId }).where(
    and(eq(emails.routeSignupId, routeSignupId), sql`${emails.humanId} IS NULL`),
  );
  await db.update(phones).set({ humanId }).where(
    and(eq(phones.routeSignupId, routeSignupId), sql`${phones.humanId} IS NULL`),
  );
  await db.update(socialIds).set({ humanId }).where(
    and(eq(socialIds.routeSignupId, routeSignupId), sql`${socialIds.humanId} IS NULL`),
  );

  return link;
}

export async function unlinkRouteSignup(db: DB, linkId: string): Promise<void> {
  const link = await db.query.humanRouteSignups.findFirst({
    where: eq(humanRouteSignups.id, linkId),
  });
  if (link != null) {
    // Clear humanId from records associated with this signup (compound WHERE)
    await db.update(activities).set({ humanId: null }).where(
      and(eq(activities.routeSignupId, link.routeSignupId), eq(activities.humanId, link.humanId)),
    );
    await db.update(emails).set({ humanId: null }).where(
      and(eq(emails.routeSignupId, link.routeSignupId), eq(emails.humanId, link.humanId)),
    );
    await db.update(phones).set({ humanId: null }).where(
      and(eq(phones.routeSignupId, link.routeSignupId), eq(phones.humanId, link.humanId)),
    );
    await db.update(socialIds).set({ humanId: null }).where(
      and(eq(socialIds.routeSignupId, link.routeSignupId), eq(socialIds.humanId, link.humanId)),
    );
  }
  await db.delete(humanRouteSignups).where(eq(humanRouteSignups.id, linkId));
}

export async function linkWebsiteBookingRequest(db: DB, humanId: string, websiteBookingRequestId: string): Promise<{ id: string; humanId: string; websiteBookingRequestId: string; linkedAt: string }> {
  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, humanId),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.HUMAN_NOT_FOUND, "Human not found");
  }

  const link = {
    id: createId(),
    humanId,
    websiteBookingRequestId,
    linkedAt: new Date().toISOString(),
  };
  await db.insert(humanWebsiteBookingRequests).values(link);

  // Dual-associate activities/emails/phones/socialIds (keep websiteBookingRequestId, add humanId)
  await db.update(activities).set({ humanId }).where(
    and(eq(activities.websiteBookingRequestId, websiteBookingRequestId), sql`${activities.humanId} IS NULL`),
  );
  await db.update(emails).set({ humanId }).where(
    and(eq(emails.websiteBookingRequestId, websiteBookingRequestId), sql`${emails.humanId} IS NULL`),
  );
  await db.update(phones).set({ humanId }).where(
    and(eq(phones.websiteBookingRequestId, websiteBookingRequestId), sql`${phones.humanId} IS NULL`),
  );
  await db.update(socialIds).set({ humanId }).where(
    and(eq(socialIds.websiteBookingRequestId, websiteBookingRequestId), sql`${socialIds.humanId} IS NULL`),
  );

  return link;
}

export async function unlinkWebsiteBookingRequest(db: DB, linkId: string): Promise<void> {
  const link = await db.query.humanWebsiteBookingRequests.findFirst({
    where: eq(humanWebsiteBookingRequests.id, linkId),
  });
  if (link != null) {
    // Clear humanId from records associated with this booking request (compound WHERE)
    await db.update(activities).set({ humanId: null }).where(
      and(eq(activities.websiteBookingRequestId, link.websiteBookingRequestId), eq(activities.humanId, link.humanId)),
    );
    await db.update(emails).set({ humanId: null }).where(
      and(eq(emails.websiteBookingRequestId, link.websiteBookingRequestId), eq(emails.humanId, link.humanId)),
    );
    await db.update(phones).set({ humanId: null }).where(
      and(eq(phones.websiteBookingRequestId, link.websiteBookingRequestId), eq(phones.humanId, link.humanId)),
    );
    await db.update(socialIds).set({ humanId: null }).where(
      and(eq(socialIds.websiteBookingRequestId, link.websiteBookingRequestId), eq(socialIds.humanId, link.humanId)),
    );
  }
  await db.delete(humanWebsiteBookingRequests).where(eq(humanWebsiteBookingRequests.id, linkId));
}

export async function getLinkedHumansForBookingRequest(
  db: DB,
  websiteBookingRequestId: string,
): Promise<{ id: string; humanId: string; humanDisplayId: string; humanFirstName: string; humanLastName: string; linkedAt: string }[]> {
  const links = await db
    .select({
      id: humanWebsiteBookingRequests.id,
      humanId: humanWebsiteBookingRequests.humanId,
      humanDisplayId: humans.displayId,
      humanFirstName: humans.firstName,
      humanLastName: humans.lastName,
      linkedAt: humanWebsiteBookingRequests.linkedAt,
    })
    .from(humanWebsiteBookingRequests)
    .innerJoin(humans, eq(humanWebsiteBookingRequests.humanId, humans.id))
    .where(eq(humanWebsiteBookingRequests.websiteBookingRequestId, websiteBookingRequestId));

  return links;
}

export async function getLinkedHumanForRouteSignup(
  db: DB,
  routeSignupId: string,
): Promise<{ id: string; humanId: string; humanDisplayId: string; humanFirstName: string; humanLastName: string; linkedAt: string } | null> {
  const links = await db
    .select({
      id: humanRouteSignups.id,
      humanId: humanRouteSignups.humanId,
      humanDisplayId: humans.displayId,
      humanFirstName: humans.firstName,
      humanLastName: humans.lastName,
      linkedAt: humanRouteSignups.linkedAt,
    })
    .from(humanRouteSignups)
    .innerJoin(humans, eq(humanRouteSignups.humanId, humans.id))
    .where(eq(humanRouteSignups.routeSignupId, routeSignupId))
    .limit(1);

  return links[0] ?? null;
}

export async function getHumanRelationships(db: DB, humanId: string): Promise<{ id: string; displayId: string; otherHumanId: string; otherHumanName: string; otherHumanDisplayId: string | null; labelId: string | null; labelName: string | null; createdAt: string }[]> {
  const rows = await db
    .select()
    .from(humanRelationships)
    .where(or(eq(humanRelationships.humanId1, humanId), eq(humanRelationships.humanId2, humanId)));

  if (rows.length === 0) return [];

  const allHumanIds = new Set<string>();
  for (const row of rows) {
    allHumanIds.add(row.humanId1);
    allHumanIds.add(row.humanId2);
  }
  allHumanIds.delete(humanId);
  const otherHumanIds = [...allHumanIds];

  const [otherHumans, allLabels] = await Promise.all([
    otherHumanIds.length > 0
      ? db.select().from(humans).where(inArray(humans.id, otherHumanIds))
      : Promise.resolve([]),
    db.select().from(humanRelationshipLabelsConfig),
  ]);

  return rows.map((row) => {
    const otherHumanId = row.humanId1 === humanId ? row.humanId2 : row.humanId1;
    const otherHuman = otherHumans.find((h) => h.id === otherHumanId);
    const label = row.labelId != null ? allLabels.find((l) => l.id === row.labelId) : null;
    return {
      id: row.id,
      displayId: row.displayId,
      otherHumanId,
      otherHumanName: otherHuman != null ? `${otherHuman.firstName} ${otherHuman.lastName}` : "Unknown",
      otherHumanDisplayId: otherHuman?.displayId ?? null,
      labelId: row.labelId,
      labelName: label?.name ?? null,
      createdAt: row.createdAt,
    };
  });
}

export async function createHumanRelationship(db: DB, humanId1: string, humanId2: string, labelId?: string): Promise<{ id: string; displayId: string }> {
  // Check for duplicate pair (in either direction)
  const existing = await db
    .select()
    .from(humanRelationships)
    .where(
      or(
        and(eq(humanRelationships.humanId1, humanId1), eq(humanRelationships.humanId2, humanId2)),
        and(eq(humanRelationships.humanId1, humanId2), eq(humanRelationships.humanId2, humanId1)),
      ),
    );

  if (existing.length > 0) {
    throw conflict(ERROR_CODES.RELATIONSHIP_DUPLICATE, "This relationship already exists");
  }

  const id = createId();
  const displayId = await nextDisplayId(db, "REL");
  const now = new Date().toISOString();

  await db.insert(humanRelationships).values({
    id,
    displayId,
    humanId1,
    humanId2,
    labelId: labelId ?? null,
    createdAt: now,
  });

  return { id, displayId };
}

export async function updateHumanRelationship(db: DB, id: string, data: { labelId?: string | null | undefined }): Promise<{ id: string; labelId: string | null }> {
  const existing = await db.query.humanRelationships.findFirst({
    where: eq(humanRelationships.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.RELATIONSHIP_NOT_FOUND, "Relationship not found");
  }

  const newLabelId = data.labelId === undefined ? existing.labelId : (data.labelId ?? null);
  await db.update(humanRelationships).set({ labelId: newLabelId }).where(eq(humanRelationships.id, id));

  return { id, labelId: newLabelId };
}

export async function deleteHumanRelationship(db: DB, id: string): Promise<void> {
  await db.delete(humanRelationships).where(eq(humanRelationships.id, id));
}
