import { eq } from "drizzle-orm";
import { emails, phones, socialIds, websites } from "@humans/db/schema";
import { normalizeEmail, normalizePhone, normalizeUrl, normalizeSocialHandle } from "@humans/shared";
import type { DB } from "./types";

interface DedupEntityResult {
  merged: number;
  normalized: number;
}

export interface DedupResult {
  emails: DedupEntityResult;
  phones: DedupEntityResult;
  socialIds: DedupEntityResult;
  websites: DedupEntityResult;
}

/** Merge owner FKs from source onto target (set if target's FK is null). */
function mergeOwnerFks(
  target: { humanId: string | null; accountId: string | null; generalLeadId: string | null },
  source: { humanId: string | null; accountId: string | null; generalLeadId: string | null },
): Record<string, string | null> {
  const updates: Record<string, string | null> = {};
  if (target.humanId == null && source.humanId != null) updates['humanId'] = source.humanId;
  if (target.accountId == null && source.accountId != null) updates['accountId'] = source.accountId;
  if (target.generalLeadId == null && source.generalLeadId != null) updates['generalLeadId'] = source.generalLeadId;
  return updates;
}

export async function deduplicateContacts(db: DB): Promise<DedupResult> {
  const result: DedupResult = {
    emails: { merged: 0, normalized: 0 },
    phones: { merged: 0, normalized: 0 },
    socialIds: { merged: 0, normalized: 0 },
    websites: { merged: 0, normalized: 0 },
  };

  // ── Emails ──────────────────────────────────────────────────────────
  const allEmails = await db.select().from(emails);
  const emailGroups = new Map<string, typeof allEmails>();
  for (const e of allEmails) {
    const normalized = normalizeEmail(e.email);
    const group = emailGroups.get(normalized) ?? [];
    group.push(e);
    emailGroups.set(normalized, group);
  }
  for (const [normalizedValue, group] of emailGroups) {
    // Sort by createdAt ascending — keep oldest
    group.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const keeper = group[0];
    if (keeper == null) continue;
    for (let i = 1; i < group.length; i++) {
      // eslint-disable-next-line security/detect-object-injection -- numeric loop index on array
      const dupe = group[i];
      if (dupe == null) continue;
      const fkUpdates = mergeOwnerFks(keeper, dupe);
      if (Object.keys(fkUpdates).length > 0) {
        await db.update(emails).set(fkUpdates).where(eq(emails.id, keeper.id));
        Object.assign(keeper, fkUpdates);
      }
      await db.delete(emails).where(eq(emails.id, dupe.id));
      result.emails.merged++;
    }
    // Normalize remaining value
    if (keeper.email !== normalizedValue) {
      await db.update(emails).set({ email: normalizedValue }).where(eq(emails.id, keeper.id));
      result.emails.normalized++;
    }
  }

  // ── Phones ──────────────────────────────────────────────────────────
  const allPhones = await db.select().from(phones);
  const phoneGroups = new Map<string, typeof allPhones>();
  for (const p of allPhones) {
    const normalized = normalizePhone(p.phoneNumber);
    const group = phoneGroups.get(normalized) ?? [];
    group.push(p);
    phoneGroups.set(normalized, group);
  }
  for (const [normalizedValue, group] of phoneGroups) {
    group.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const keeper = group[0];
    if (keeper == null) continue;
    for (let i = 1; i < group.length; i++) {
      // eslint-disable-next-line security/detect-object-injection -- numeric loop index on array
      const dupe = group[i];
      if (dupe == null) continue;
      const fkUpdates = mergeOwnerFks(keeper, dupe);
      if (Object.keys(fkUpdates).length > 0) {
        await db.update(phones).set(fkUpdates).where(eq(phones.id, keeper.id));
        Object.assign(keeper, fkUpdates);
      }
      await db.delete(phones).where(eq(phones.id, dupe.id));
      result.phones.merged++;
    }
    if (keeper.phoneNumber !== normalizedValue) {
      await db.update(phones).set({ phoneNumber: normalizedValue }).where(eq(phones.id, keeper.id));
      result.phones.normalized++;
    }
  }

  // ── Social IDs ─────────────────────────────────────────────────────
  const allSocialIds = await db.select().from(socialIds);
  const socialGroups = new Map<string, typeof allSocialIds>();
  for (const s of allSocialIds) {
    const normalized = normalizeSocialHandle(s.handle);
    const key = `${s.platformId ?? "__null__"}::${normalized}`;
    const group = socialGroups.get(key) ?? [];
    group.push(s);
    socialGroups.set(key, group);
  }
  for (const [, group] of socialGroups) {
    group.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const keeper = group[0];
    if (keeper == null) continue;
    const normalizedHandle = normalizeSocialHandle(keeper.handle);
    for (let i = 1; i < group.length; i++) {
      // eslint-disable-next-line security/detect-object-injection -- numeric loop index on array
      const dupe = group[i];
      if (dupe == null) continue;
      const fkUpdates = mergeOwnerFks(keeper, dupe);
      if (Object.keys(fkUpdates).length > 0) {
        await db.update(socialIds).set(fkUpdates).where(eq(socialIds.id, keeper.id));
        Object.assign(keeper, fkUpdates);
      }
      await db.delete(socialIds).where(eq(socialIds.id, dupe.id));
      result.socialIds.merged++;
    }
    if (keeper.handle !== normalizedHandle) {
      await db.update(socialIds).set({ handle: normalizedHandle }).where(eq(socialIds.id, keeper.id));
      result.socialIds.normalized++;
    }
  }

  // ── Websites ───────────────────────────────────────────────────────
  const allWebsites = await db.select().from(websites);
  const websiteGroups = new Map<string, typeof allWebsites>();
  for (const w of allWebsites) {
    const normalized = normalizeUrl(w.url);
    const group = websiteGroups.get(normalized) ?? [];
    group.push(w);
    websiteGroups.set(normalized, group);
  }
  for (const [normalizedValue, group] of websiteGroups) {
    group.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const keeper = group[0];
    if (keeper == null) continue;
    for (let i = 1; i < group.length; i++) {
      // eslint-disable-next-line security/detect-object-injection -- numeric loop index on array
      const dupe = group[i];
      if (dupe == null) continue;
      // Websites only have humanId and accountId
      const fkUpdates: Record<string, string | null> = {};
      if (keeper.humanId == null && dupe.humanId != null) fkUpdates['humanId'] = dupe.humanId;
      if (keeper.accountId == null && dupe.accountId != null) fkUpdates['accountId'] = dupe.accountId;
      if (Object.keys(fkUpdates).length > 0) {
        await db.update(websites).set(fkUpdates).where(eq(websites.id, keeper.id));
        Object.assign(keeper, fkUpdates);
      }
      await db.delete(websites).where(eq(websites.id, dupe.id));
      result.websites.merged++;
    }
    if (keeper.url !== normalizedValue) {
      await db.update(websites).set({ url: normalizedValue }).where(eq(websites.id, keeper.id));
      result.websites.normalized++;
    }
  }

  return result;
}
