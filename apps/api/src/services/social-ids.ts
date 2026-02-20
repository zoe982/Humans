import { eq } from "drizzle-orm";
import { socialIds, socialIdPlatformsConfig, humans, accounts } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

export async function listSocialIds(db: DB) {
  const allSocialIds = await db.select().from(socialIds);
  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);
  const allPlatforms = await db.select().from(socialIdPlatformsConfig);

  const data = allSocialIds.map((s) => {
    const human = s.humanId ? allHumans.find((h) => h.id === s.humanId) : null;
    const account = s.accountId ? allAccounts.find((a) => a.id === s.accountId) : null;
    const platform = s.platformId ? allPlatforms.find((p) => p.id === s.platformId) : null;
    return {
      ...s,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
      humanDisplayId: human?.displayId ?? null,
      accountName: account?.name ?? null,
      accountDisplayId: account?.displayId ?? null,
      platformName: platform?.name ?? null,
    };
  });

  return data;
}

export async function getSocialId(db: DB, id: string) {
  const result = await db.select().from(socialIds).where(eq(socialIds.id, id));
  const socialId = result[0];
  if (socialId == null) {
    throw notFound(ERROR_CODES.SOCIAL_ID_NOT_FOUND, "Social ID not found");
  }

  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);
  const allPlatforms = await db.select().from(socialIdPlatformsConfig);

  const human = socialId.humanId ? allHumans.find((h) => h.id === socialId.humanId) : null;
  const account = socialId.accountId ? allAccounts.find((a) => a.id === socialId.accountId) : null;
  const platform = socialId.platformId ? allPlatforms.find((p) => p.id === socialId.platformId) : null;

  return {
    ...socialId,
    humanName: human ? `${human.firstName} ${human.lastName}` : null,
    humanDisplayId: human?.displayId ?? null,
    accountName: account?.name ?? null,
    accountDisplayId: account?.displayId ?? null,
    platformName: platform?.name ?? null,
  };
}

export async function createSocialId(
  db: DB,
  data: {
    handle: string;
    platformId?: string | null;
    humanId?: string | null;
    accountId?: string | null;
  },
) {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "SOC");

  const record = {
    id: createId(),
    displayId,
    handle: data.handle,
    platformId: data.platformId ?? null,
    humanId: data.humanId ?? null,
    accountId: data.accountId ?? null,
    createdAt: now,
  };

  await db.insert(socialIds).values(record);
  return record;
}

export async function updateSocialId(
  db: DB,
  id: string,
  data: Record<string, unknown>,
) {
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
  return updated;
}

export async function deleteSocialId(db: DB, id: string) {
  const existing = await db.query.socialIds.findFirst({
    where: eq(socialIds.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.SOCIAL_ID_NOT_FOUND, "Social ID not found");
  }

  await db.delete(socialIds).where(eq(socialIds.id, id));
}
