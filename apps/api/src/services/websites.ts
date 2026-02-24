import { eq } from "drizzle-orm";
import { websites, humans, accounts } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

export async function listWebsites(db: DB): Promise<{ humanName: string | null; humanDisplayId: string | null; accountName: string | null; accountDisplayId: string | null; id: string; displayId: string; url: string; humanId: string | null; accountId: string | null; createdAt: string }[]> {
  const allWebsites = await db.select().from(websites);
  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);

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

  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);

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
    humanId?: string | null;
    accountId?: string | null;
  },
): Promise<{ id: string; displayId: string; url: string; humanId: string | null; accountId: string | null; createdAt: string }> {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "WEB");

  const record = {
    id: createId(),
    displayId,
    url: data.url,
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

  await db
    .update(websites)
    .set(data)
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
