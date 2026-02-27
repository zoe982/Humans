import { eq, and, ne, inArray } from "drizzle-orm";
import { websites, humans, accounts } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES, normalizeUrl } from "@humans/shared";
import { notFound, conflict } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import { resolveOwnerSummary } from "../lib/owner-summary";
import type { DB } from "./types";

export async function listWebsites(db: DB): Promise<{ humanName: string | null; humanDisplayId: string | null; accountName: string | null; accountDisplayId: string | null; id: string; displayId: string; url: string; humanId: string | null; accountId: string | null; createdAt: string }[]> {
  const allWebsites = await db.select().from(websites);
  // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style, @typescript-eslint/no-unsafe-type-assertion -- filter guarantees non-null
  const humanIds = allWebsites.filter((w) => w.humanId != null).map((w) => w.humanId as string);
  // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style, @typescript-eslint/no-unsafe-type-assertion -- filter guarantees non-null
  const accountIds = allWebsites.filter((w) => w.accountId != null).map((w) => w.accountId as string);
  const allHumans = humanIds.length > 0
    ? await db.select().from(humans).where(inArray(humans.id, humanIds))
    : [];
  const allAccounts = accountIds.length > 0
    ? await db.select().from(accounts).where(inArray(accounts.id, accountIds))
    : [];

  const data = allWebsites.map((w) => {
    const human = w.humanId != null ? allHumans.find((h) => h.id === w.humanId) : null;
    const account = w.accountId != null ? allAccounts.find((a) => a.id === w.accountId) : null;
    return {
      ...w,
      humanName: human != null ? `${human.firstName} ${human.lastName}` : null,
      humanDisplayId: human?.displayId ?? null,
      accountName: account?.name ?? null,
      accountDisplayId: account?.displayId ?? null,
    };
  });

  return data;
}

export async function getWebsite(db: DB, id: string): Promise<{ humanName: string | null; humanDisplayId: string | null; accountName: string | null; accountDisplayId: string | null; id: string; displayId: string; url: string; humanId: string | null; accountId: string | null; createdAt: string }> {
  const result = await db.select().from(websites).where(eq(websites.id, id));
  const website = result[0];
  if (website == null) {
    throw notFound(ERROR_CODES.WEBSITE_NOT_FOUND, "Website not found");
  }

  const allHumans = website.humanId != null
    ? await db.select().from(humans).where(inArray(humans.id, [website.humanId]))
    : [];
  const allAccounts = website.accountId != null
    ? await db.select().from(accounts).where(inArray(accounts.id, [website.accountId]))
    : [];

  const human = website.humanId != null ? allHumans.find((h) => h.id === website.humanId) : null;
  const account = website.accountId != null ? allAccounts.find((a) => a.id === website.accountId) : null;

  return {
    ...website,
    humanName: human != null ? `${human.firstName} ${human.lastName}` : null,
    humanDisplayId: human?.displayId ?? null,
    accountName: account?.name ?? null,
    accountDisplayId: account?.displayId ?? null,
  };
}

export async function createWebsite(
  db: DB,
  data: {
    url: string;
    humanId?: string | null | undefined;
    accountId?: string | null | undefined;
  },
): Promise<{ id: string; displayId: string; url: string; humanId: string | null; accountId: string | null; createdAt: string }> {
  const normalized = normalizeUrl(data.url);

  // Check for duplicates
  const existing = await db.select().from(websites).where(eq(websites.url, normalized));
  if (existing[0] != null) {
    const existingOwners = await resolveOwnerSummary(db, { humanId: existing[0].humanId, accountId: existing[0].accountId, generalLeadId: null });
    throw conflict(ERROR_CODES.WEBSITE_DUPLICATE, "A website with this URL already exists", {
      existingId: existing[0].id,
      existingDisplayId: existing[0].displayId,
      existingOwners,
    });
  }

  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "WEB");

  const record = {
    id: createId(),
    displayId,
    url: normalized,
    humanId: data.humanId ?? null,
    accountId: data.accountId ?? null,
    createdAt: now,
  };

  await db.insert(websites).values(record);
  return record;
}

export async function updateWebsite(
  db: DB,
  id: string,
  data: Record<string, unknown>,
): Promise<typeof websites.$inferSelect | undefined> {
  const existing = await db.query.websites.findFirst({
    where: eq(websites.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.WEBSITE_NOT_FOUND, "Website not found");
  }

  // Normalize and check duplicates if url is being changed
  const updates = { ...data };
  if (typeof updates['url'] === "string") {
    const normalized = normalizeUrl(updates['url']);
    updates['url'] = normalized;
    const dupes = await db.select().from(websites).where(and(eq(websites.url, normalized), ne(websites.id, id)));
    if (dupes[0] != null) {
      const existingOwners = await resolveOwnerSummary(db, { humanId: dupes[0].humanId, accountId: dupes[0].accountId, generalLeadId: null });
      throw conflict(ERROR_CODES.WEBSITE_DUPLICATE, "A website with this URL already exists", {
        existingId: dupes[0].id,
        existingDisplayId: dupes[0].displayId,
        existingOwners,
      });
    }
  }

  await db
    .update(websites)
    .set(updates)
    .where(eq(websites.id, id));

  const updated = await db.query.websites.findFirst({
    where: eq(websites.id, id),
  });

  return updated;
}

export async function deleteWebsite(db: DB, id: string): Promise<void> {
  const existing = await db.query.websites.findFirst({
    where: eq(websites.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.WEBSITE_NOT_FOUND, "Website not found");
  }

  await db.delete(websites).where(eq(websites.id, id));
}
