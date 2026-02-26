import { eq, inArray } from "drizzle-orm";
import { socialIds, socialIdPlatformsConfig, humans, accounts, generalLeads } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import { rematchActivitiesBySocialId } from "./activity-rematch";
import type { DB } from "./types";

export async function listSocialIds(db: DB): Promise<{ humanName: string | null; humanDisplayId: string | null; accountName: string | null; accountDisplayId: string | null; generalLeadName: string | null; generalLeadDisplayId: string | null; platformName: string | null; id: string; displayId: string; handle: string; platformId: string | null; humanId: string | null; accountId: string | null; generalLeadId: string | null; websiteBookingRequestId: string | null; routeSignupId: string | null; createdAt: string }[]> {
  const allSocialIds = await db.select().from(socialIds);
  // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style, @typescript-eslint/no-unsafe-type-assertion -- filter guarantees non-null
  const humanIds = allSocialIds.filter((s) => s.humanId != null).map((s) => s.humanId as string);
  // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style, @typescript-eslint/no-unsafe-type-assertion -- filter guarantees non-null
  const accountIds = allSocialIds.filter((s) => s.accountId != null).map((s) => s.accountId as string);
  // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style, @typescript-eslint/no-unsafe-type-assertion -- filter guarantees non-null
  const leadIds = allSocialIds.filter((s) => s.generalLeadId != null).map((s) => s.generalLeadId as string);
  const allHumans = humanIds.length > 0
    ? await db.select().from(humans).where(inArray(humans.id, humanIds))
    : [];
  const allAccounts = accountIds.length > 0
    ? await db.select().from(accounts).where(inArray(accounts.id, accountIds))
    : [];
  const allLeads = leadIds.length > 0
    ? await db.select({ id: generalLeads.id, displayId: generalLeads.displayId, firstName: generalLeads.firstName, lastName: generalLeads.lastName }).from(generalLeads).where(inArray(generalLeads.id, leadIds))
    : [];
  const allPlatforms = await db.select().from(socialIdPlatformsConfig);

  const data = allSocialIds.map((s) => {
    const human = s.humanId != null ? allHumans.find((h) => h.id === s.humanId) : null;
    const account = s.accountId != null ? allAccounts.find((a) => a.id === s.accountId) : null;
    const lead = s.generalLeadId != null ? allLeads.find((l) => l.id === s.generalLeadId) : null;
    const platform = s.platformId != null ? allPlatforms.find((p) => p.id === s.platformId) : null;
    return {
      ...s,
      humanName: human != null ? `${human.firstName} ${human.lastName}` : null,
      humanDisplayId: human?.displayId ?? null,
      accountName: account?.name ?? null,
      accountDisplayId: account?.displayId ?? null,
      generalLeadName: lead != null ? `${lead.firstName} ${lead.lastName}` : null,
      generalLeadDisplayId: lead?.displayId ?? null,
      platformName: platform?.name ?? null,
    };
  });

  return data;
}

export async function getSocialId(db: DB, id: string): Promise<{ humanName: string | null; humanDisplayId: string | null; accountName: string | null; accountDisplayId: string | null; generalLeadName: string | null; generalLeadDisplayId: string | null; websiteBookingRequestDisplayId: string | null; websiteBookingRequestName: string | null; routeSignupDisplayId: string | null; routeSignupName: string | null; platformName: string | null; id: string; displayId: string; handle: string; platformId: string | null; humanId: string | null; accountId: string | null; generalLeadId: string | null; websiteBookingRequestId: string | null; routeSignupId: string | null; createdAt: string }> {
  const result = await db.select().from(socialIds).where(eq(socialIds.id, id));
  const socialId = result[0];
  if (socialId == null) {
    throw notFound(ERROR_CODES.SOCIAL_ID_NOT_FOUND, "Social ID not found");
  }

  const humanIds = socialId.humanId != null ? [socialId.humanId] : [];
  const accountIds = socialId.accountId != null ? [socialId.accountId] : [];
  const allHumans = humanIds.length > 0
    ? await db.select().from(humans).where(inArray(humans.id, humanIds))
    : [];
  const allAccounts = accountIds.length > 0
    ? await db.select().from(accounts).where(inArray(accounts.id, accountIds))
    : [];
  const allPlatforms = await db.select().from(socialIdPlatformsConfig);

  // General lead enrichment (D1)
  let generalLeadName: string | null = null;
  let generalLeadDisplayId: string | null = null;
  if (socialId.generalLeadId != null) {
    const lead = await db.select({ id: generalLeads.id, displayId: generalLeads.displayId, firstName: generalLeads.firstName, lastName: generalLeads.lastName }).from(generalLeads).where(eq(generalLeads.id, socialId.generalLeadId));
    if (lead[0] != null) {
      generalLeadName = `${lead[0].firstName} ${lead[0].lastName}`;
      generalLeadDisplayId = lead[0].displayId;
    }
  }

  const human = socialId.humanId != null ? allHumans.find((h) => h.id === socialId.humanId) : null;
  const account = socialId.accountId != null ? allAccounts.find((a) => a.id === socialId.accountId) : null;
  const platform = socialId.platformId != null ? allPlatforms.find((p) => p.id === socialId.platformId) : null;

  return {
    ...socialId,
    humanName: human != null ? `${human.firstName} ${human.lastName}` : null,
    humanDisplayId: human?.displayId ?? null,
    accountName: account?.name ?? null,
    accountDisplayId: account?.displayId ?? null,
    generalLeadName,
    generalLeadDisplayId,
    // BOR/ROU enrichment happens at the route layer (Supabase)
    websiteBookingRequestDisplayId: null,
    websiteBookingRequestName: null,
    routeSignupDisplayId: null,
    routeSignupName: null,
    platformName: platform?.name ?? null,
  };
}

export async function createSocialId(
  db: DB,
  data: {
    handle: string;
    platformId?: string | null | undefined;
    humanId?: string | null | undefined;
    accountId?: string | null | undefined;
    generalLeadId?: string | null | undefined;
    websiteBookingRequestId?: string | null | undefined;
    routeSignupId?: string | null | undefined;
  },
): Promise<{ id: string; displayId: string; handle: string; platformId: string | null; humanId: string | null; accountId: string | null; generalLeadId: string | null; websiteBookingRequestId: string | null; routeSignupId: string | null; createdAt: string }> {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "SOC");

  const record = {
    id: createId(),
    displayId,
    handle: data.handle,
    platformId: data.platformId ?? null,
    humanId: data.humanId ?? null,
    accountId: data.accountId ?? null,
    generalLeadId: data.generalLeadId ?? null,
    websiteBookingRequestId: data.websiteBookingRequestId ?? null,
    routeSignupId: data.routeSignupId ?? null,
    createdAt: now,
  };

  await db.insert(socialIds).values(record);

  if (data.humanId != null) {
    await rematchActivitiesBySocialId(db, data.humanId, data.handle);
  }

  return record;
}

export async function updateSocialId(
  db: DB,
  id: string,
  data: Record<string, unknown>,
): Promise<typeof socialIds.$inferSelect | undefined> {
  const existing = await db.query.socialIds.findFirst({
    where: eq(socialIds.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.SOCIAL_ID_NOT_FOUND, "Social ID not found");
  }

  await db
    .update(socialIds)
    .set(data)
    .where(eq(socialIds.id, id));

  const updated = await db.query.socialIds.findFirst({
    where: eq(socialIds.id, id),
  });

  if (updated?.humanId != null && updated.handle !== "") {
    await rematchActivitiesBySocialId(db, updated.humanId, updated.handle);
  }

  return updated;
}

export async function deleteSocialId(db: DB, id: string): Promise<void> {
  const existing = await db.query.socialIds.findFirst({
    where: eq(socialIds.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.SOCIAL_ID_NOT_FOUND, "Social ID not found");
  }

  await db.delete(socialIds).where(eq(socialIds.id, id));
}

export async function listSocialIdsForEntity(
  db: DB,
  column: "generalLeadId" | "websiteBookingRequestId" | "routeSignupId",
  entityId: string,
): Promise<{ id: string; displayId: string; handle: string; platformId: string | null; platformName: string | null; createdAt: string }[]> {
  // eslint-disable-next-line security/detect-object-injection -- column is a typed union, not user input
  const rows = await db.select().from(socialIds).where(eq(socialIds[column], entityId));
  const allPlatforms = await db.select().from(socialIdPlatformsConfig);

  return rows.map((s) => {
    const platform = s.platformId != null ? allPlatforms.find((p) => p.id === s.platformId) : null;
    return {
      id: s.id,
      displayId: s.displayId,
      handle: s.handle,
      platformId: s.platformId,
      platformName: platform?.name ?? null,
      createdAt: s.createdAt,
    };
  });
}
