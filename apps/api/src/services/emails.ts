import { eq, and, ne, inArray, like } from "drizzle-orm";
import { emails, humans, accounts, generalLeads, humanEmailLabelsConfig, accountEmailLabelsConfig } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES, normalizeEmail } from "@humans/shared";
import { notFound, conflict } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import { resolveOwnerSummary } from "../lib/owner-summary";
import { rematchActivitiesByEmail } from "./activity-rematch";
import type { DB } from "./types";

function resolveOwner(
  email: typeof emails.$inferSelect,
  allHumans: { id: string; displayId: string; firstName: string; lastName: string }[],
  allAccounts: { id: string; displayId: string; name: string }[],
  allGeneralLeads: { id: string; displayId: string; firstName: string; lastName: string }[],
): { ownerName: string | null; ownerDisplayId: string | null } {
  if (email.humanId != null) {
    const human = allHumans.find((h) => h.id === email.humanId);
    if (human != null) return { ownerName: `${human.firstName} ${human.lastName}`, ownerDisplayId: human.displayId };
  }
  if (email.accountId != null) {
    const account = allAccounts.find((a) => a.id === email.accountId);
    if (account != null) return { ownerName: account.name, ownerDisplayId: account.displayId };
  }
  if (email.generalLeadId != null) {
    const lead = allGeneralLeads.find((l) => l.id === email.generalLeadId);
    if (lead != null) return { ownerName: `${lead.firstName} ${lead.lastName}`, ownerDisplayId: lead.displayId };
  }
  return { ownerName: null, ownerDisplayId: null };
}

export async function listEmails(db: DB, query?: string): Promise<{ ownerName: string | null; ownerDisplayId: string | null; labelName: string | null; id: string; displayId: string; humanId: string | null; accountId: string | null; generalLeadId: string | null; websiteBookingRequestId: string | null; routeSignupId: string | null; email: string; labelId: string | null; isPrimary: boolean; createdAt: string }[]> {
  const allEmails = query != null && query !== ""
    ? await db.select().from(emails).where(like(emails.email, `%${query}%`))
    : await db.select().from(emails);
  const humanIds = allEmails.flatMap((e) => e.humanId != null ? [e.humanId] : []);
  const accountIds = allEmails.flatMap((e) => e.accountId != null ? [e.accountId] : []);
  const generalLeadIds = allEmails.flatMap((e) => e.generalLeadId != null ? [e.generalLeadId] : []);
  const allHumans = humanIds.length > 0
    ? await db.select({ id: humans.id, displayId: humans.displayId, firstName: humans.firstName, lastName: humans.lastName }).from(humans).where(inArray(humans.id, humanIds))
    : [];
  const allAccounts = accountIds.length > 0
    ? await db.select({ id: accounts.id, displayId: accounts.displayId, name: accounts.name }).from(accounts).where(inArray(accounts.id, accountIds))
    : [];
  const allGeneralLeads = generalLeadIds.length > 0
    ? await db.select({ id: generalLeads.id, displayId: generalLeads.displayId, firstName: generalLeads.firstName, lastName: generalLeads.lastName }).from(generalLeads).where(inArray(generalLeads.id, generalLeadIds))
    : [];
  const humanLabels = await db.select().from(humanEmailLabelsConfig);
  const accountLabels = await db.select().from(accountEmailLabelsConfig);

  const data = allEmails.map((e) => {
    const { ownerName, ownerDisplayId } = resolveOwner(e, allHumans, allAccounts, allGeneralLeads);
    const labels = e.humanId != null ? humanLabels : accountLabels;
    const label = e.labelId != null ? labels.find((l) => l.id === e.labelId) : null;
    return {
      ...e,
      ownerName,
      ownerDisplayId,
      labelName: label?.name ?? null,
    };
  });

  return data;
}

export async function getEmail(db: DB, id: string): Promise<{ ownerName: string | null; ownerDisplayId: string | null; labelName: string | null; id: string; displayId: string; humanId: string | null; accountId: string | null; generalLeadId: string | null; websiteBookingRequestId: string | null; routeSignupId: string | null; email: string; labelId: string | null; isPrimary: boolean; createdAt: string; humanDisplayId: string | null; humanName: string | null; accountDisplayId: string | null; accountName: string | null; generalLeadDisplayId: string | null; generalLeadName: string | null; websiteBookingRequestDisplayId: string | null; websiteBookingRequestName: string | null; routeSignupDisplayId: string | null; routeSignupName: string | null }> {
  const allEmails = await db.select().from(emails).where(eq(emails.id, id));
  const email = allEmails[0];
  if (email == null) {
    throw notFound(ERROR_CODES.EMAIL_NOT_FOUND, "Email not found");
  }

  const allHumans = email.humanId != null
    ? await db.select({ id: humans.id, displayId: humans.displayId, firstName: humans.firstName, lastName: humans.lastName }).from(humans).where(eq(humans.id, email.humanId))
    : [];
  const allAccounts = email.accountId != null
    ? await db.select({ id: accounts.id, displayId: accounts.displayId, name: accounts.name }).from(accounts).where(eq(accounts.id, email.accountId))
    : [];
  const allGeneralLeads = email.generalLeadId != null
    ? await db.select({ id: generalLeads.id, displayId: generalLeads.displayId, firstName: generalLeads.firstName, lastName: generalLeads.lastName }).from(generalLeads).where(eq(generalLeads.id, email.generalLeadId))
    : [];
  const humanLabels = await db.select().from(humanEmailLabelsConfig);
  const accountLabels = await db.select().from(accountEmailLabelsConfig);

  const { ownerName, ownerDisplayId } = resolveOwner(email, allHumans, allAccounts, allGeneralLeads);
  const labels = email.humanId != null ? humanLabels : accountLabels;
  const label = email.labelId != null ? labels.find((l) => l.id === email.labelId) : null;

  const humanMatch = allHumans.find((h) => h.id === email.humanId);
  const accountMatch = allAccounts.find((a) => a.id === email.accountId);
  const leadMatch = allGeneralLeads.find((l) => l.id === email.generalLeadId);

  return {
    ...email,
    ownerName,
    ownerDisplayId,
    labelName: label?.name ?? null,
    humanDisplayId: humanMatch?.displayId ?? null,
    humanName: humanMatch != null ? `${humanMatch.firstName} ${humanMatch.lastName}` : null,
    accountDisplayId: accountMatch?.displayId ?? null,
    accountName: accountMatch?.name ?? null,
    generalLeadDisplayId: leadMatch?.displayId ?? null,
    generalLeadName: leadMatch != null ? `${leadMatch.firstName} ${leadMatch.lastName}` : null,
    websiteBookingRequestDisplayId: null as string | null,
    websiteBookingRequestName: null as string | null,
    routeSignupDisplayId: null as string | null,
    routeSignupName: null as string | null,
  };
}

export async function updateEmail(
  db: DB,
  id: string,
  data: Record<string, unknown>,
): Promise<typeof emails.$inferSelect | undefined> {
  const existing = await db.query.emails.findFirst({
    where: eq(emails.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.EMAIL_NOT_FOUND, "Email not found");
  }

  // Normalize and check duplicates if email is being changed
  const updates = { ...data };
  if (typeof updates['email'] === "string") {
    const normalized = normalizeEmail(updates['email']);
    updates['email'] = normalized;
    const dupes = await db.select().from(emails).where(and(eq(emails.email, normalized), ne(emails.id, id)));
    if (dupes[0] != null) {
      const existingOwners = await resolveOwnerSummary(db, dupes[0]);
      throw conflict(ERROR_CODES.EMAIL_DUPLICATE, "An email with this address already exists", {
        existingId: dupes[0].id,
        existingDisplayId: dupes[0].displayId,
        existingOwners,
      });
    }
  }

  await db
    .update(emails)
    .set(updates)
    .where(eq(emails.id, id));

  const updated = await db.query.emails.findFirst({
    where: eq(emails.id, id),
  });
  return updated;
}

export async function createEmail(
  db: DB,
  data: {
    humanId?: string | undefined;
    accountId?: string | undefined;
    generalLeadId?: string | undefined;
    websiteBookingRequestId?: string | undefined;
    routeSignupId?: string | undefined;
    email: string;
    labelId?: string | null | undefined;
    isPrimary?: boolean | undefined;
  },
): Promise<typeof emails.$inferSelect> {
  const normalized = normalizeEmail(data.email);

  // Check for duplicates
  const existing = await db.select().from(emails).where(eq(emails.email, normalized));
  if (existing[0] != null) {
    const existingOwners = await resolveOwnerSummary(db, existing[0]);
    throw conflict(ERROR_CODES.EMAIL_DUPLICATE, "An email with this address already exists", {
      existingId: existing[0].id,
      existingDisplayId: existing[0].displayId,
      existingOwners,
    });
  }

  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "EML");

  const email = {
    id: createId(),
    displayId,
    humanId: data.humanId ?? null,
    accountId: data.accountId ?? null,
    generalLeadId: data.generalLeadId ?? null,
    websiteBookingRequestId: data.websiteBookingRequestId ?? null,
    routeSignupId: data.routeSignupId ?? null,
    email: normalized,
    labelId: data.labelId ?? null,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(emails).values(email);

  // Rematch unlinked activities by this email address (only for human-linked emails)
  if (data.humanId != null) {
    await rematchActivitiesByEmail(db, data.humanId, data.email);
  }

  return email;
}

export async function deleteEmail(db: DB, id: string): Promise<void> {
  const existing = await db.query.emails.findFirst({
    where: eq(emails.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.EMAIL_NOT_FOUND, "Email not found");
  }

  await db.delete(emails).where(eq(emails.id, id));
}

export async function listEmailsForEntity(
  db: DB,
  column: "generalLeadId" | "websiteBookingRequestId" | "routeSignupId",
  entityId: string,
): Promise<{ id: string; displayId: string; email: string; labelId: string | null; isPrimary: boolean; createdAt: string }[]> {
  // eslint-disable-next-line security/detect-object-injection -- column is a typed union, not user input
  const rows = await db.select().from(emails).where(eq(emails[column], entityId));
  return rows.map((e) => ({
    id: e.id,
    displayId: e.displayId,
    email: e.email,
    labelId: e.labelId,
    isPrimary: e.isPrimary,
    createdAt: e.createdAt,
  }));
}
