import { like, or, inArray } from "drizzle-orm";
import {
  humans,
  emails,
  phones,
  activities,
  geoInterests,
  geoInterestExpressions,
  accounts,
  accountTypes,
  accountTypesConfig,
} from "@humans/db/schema";
import { assertUniqueIds } from "../lib/assert-unique-ids";
import type { DB } from "./types";

export async function searchD1(db: DB, query: string): Promise<{ matchedHumans: { emails: (typeof emails.$inferSelect)[]; id: string; displayId: string; firstName: string; lastName: string; status: string | null; createdAt: string; updatedAt: string }[]; activityResults: (typeof activities.$inferSelect)[]; geoInterestsWithCounts: { expressionCount: number; humanCount: number; id: string; displayId: string; city: string; country: string; createdAt: string }[]; matchedAccounts: { types: { id: string; name: string }[]; id: string; displayId: string; name: string; status: string; createdAt: string; updatedAt: string }[] }> {
  const pattern = `%${query}%`;

  // Search D1 in parallel
  const [humanResults, emailResults, phoneResults, activityResults, geoInterestResults, accountResults, accountEmailResults, accountPhoneResults] =
    await Promise.all([
      db
        .select()
        .from(humans)
        .where(or(like(humans.firstName, pattern), like(humans.lastName, pattern))),
      db.select().from(emails).where(like(emails.email, pattern)),
      db
        .select()
        .from(phones)
        .where(like(phones.phoneNumber, pattern)),
      db
        .select()
        .from(activities)
        .where(or(like(activities.subject, pattern), like(activities.notes, pattern))),
      db
        .select()
        .from(geoInterests)
        .where(or(like(geoInterests.city, pattern), like(geoInterests.country, pattern))),
      db.select().from(accounts).where(like(accounts.name, pattern)),
      db.select().from(emails).where(like(emails.email, pattern)),
      db.select().from(phones).where(like(phones.phoneNumber, pattern)),
    ]);

  // Fetch expressions for matched geo-interests to find linked humans
  const allExpressions = geoInterestResults.length > 0
    ? await db.select().from(geoInterestExpressions).where(inArray(geoInterestExpressions.geoInterestId, geoInterestResults.map((gi) => gi.id)))
    : [];

  // Merge human results: collect unique human IDs from name, email, phone, geo-interest matches
  const humanIds = new Set<string>();
  humanResults.forEach((h) => { humanIds.add(h.id); });
  emailResults.filter((e) => e.ownerType === "human").forEach((e) => { humanIds.add(e.ownerId); });
  phoneResults.filter((p) => p.ownerType === "human").forEach((p) => { humanIds.add(p.ownerId); });

  const matchedGeoInterestIds = new Set(geoInterestResults.map((gi) => gi.id));
  allExpressions
    .filter((e) => matchedGeoInterestIds.has(e.geoInterestId))
    .forEach((e) => { humanIds.add(e.humanId); });

  // Fetch full data for matched humans
  const allHumans = humanIds.size > 0
    ? await db.select().from(humans).where(inArray(humans.id, [...humanIds]))
    : [];
  const allEmails = humanIds.size > 0
    ? await db.select().from(emails).where(inArray(emails.ownerId, [...humanIds]))
    : [];
  const matchedHumans = allHumans
    .filter((h) => humanIds.has(h.id))
    .map((h) => ({
      ...h,
      emails: allEmails.filter((e) => e.ownerType === "human" && e.ownerId === h.id),
    }));

  // Enrich geo-interest results with expression counts
  const geoInterestsWithCounts = geoInterestResults.map((gi) => {
    const expressions = allExpressions.filter((e) => e.geoInterestId === gi.id);
    return {
      ...gi,
      expressionCount: expressions.length,
      humanCount: new Set(expressions.map((e) => e.humanId)).size,
    };
  });

  // Merge account results: collect unique account IDs from name, email, phone matches
  const accountIds = new Set<string>();
  accountResults.forEach((a) => { accountIds.add(a.id); });
  accountEmailResults.filter((e) => e.ownerType === "account").forEach((e) => { accountIds.add(e.ownerId); });
  accountPhoneResults.filter((p) => p.ownerType === "account").forEach((p) => { accountIds.add(p.ownerId); });

  const allAccounts = accountIds.size > 0
    ? await db.select().from(accounts).where(inArray(accounts.id, [...accountIds]))
    : [];
  const allAccountTypes = accountIds.size > 0
    ? await db.select().from(accountTypes).where(inArray(accountTypes.accountId, [...accountIds]))
    : [];
  const allTypeConfigs = accountIds.size > 0 ? await db.select().from(accountTypesConfig) : [];

  const matchedAccounts = allAccounts
    .filter((a) => accountIds.has(a.id))
    .map((a) => ({
      ...a,
      types: allAccountTypes
        .filter((t) => t.accountId === a.id)
        .map((t) => {
          const config = allTypeConfigs.find((c) => c.id === t.typeId);
          return { id: t.typeId, name: config?.name ?? t.typeId };
        }),
    }));

  return {
    matchedHumans: assertUniqueIds(matchedHumans, "search-humans"),
    activityResults: assertUniqueIds(activityResults, "search-activities"),
    geoInterestsWithCounts,
    matchedAccounts: assertUniqueIds(matchedAccounts, "search-accounts"),
  };
}
