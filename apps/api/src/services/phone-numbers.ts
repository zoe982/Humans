import { eq, inArray, like } from "drizzle-orm";
import { phones, humans, accounts, generalLeads, humanPhoneLabelsConfig, accountPhoneLabelsConfig } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import { rematchActivitiesByPhone } from "./activity-rematch";
import type { DB } from "./types";

function resolveOwner(
  phone: typeof phones.$inferSelect,
  allHumans: { id: string; displayId: string; firstName: string; lastName: string }[],
  allAccounts: { id: string; displayId: string; name: string }[],
  allGeneralLeads: { id: string; displayId: string; firstName: string; lastName: string }[],
): { ownerName: string | null; ownerDisplayId: string | null } {
  if (phone.humanId != null) {
    const human = allHumans.find((h) => h.id === phone.humanId);
    if (human != null) return { ownerName: `${human.firstName} ${human.lastName}`, ownerDisplayId: human.displayId };
  }
  if (phone.accountId != null) {
    const account = allAccounts.find((a) => a.id === phone.accountId);
    if (account != null) return { ownerName: account.name, ownerDisplayId: account.displayId };
  }
  if (phone.generalLeadId != null) {
    const lead = allGeneralLeads.find((l) => l.id === phone.generalLeadId);
    if (lead != null) return { ownerName: `${lead.firstName} ${lead.lastName}`, ownerDisplayId: lead.displayId };
  }
  return { ownerName: null, ownerDisplayId: null };
}

export async function listPhoneNumbers(db: DB, query?: string): Promise<{ ownerName: string | null; ownerDisplayId: string | null; labelName: string | null; id: string; displayId: string; humanId: string | null; accountId: string | null; generalLeadId: string | null; websiteBookingRequestId: string | null; routeSignupId: string | null; phoneNumber: string; labelId: string | null; hasWhatsapp: boolean; isPrimary: boolean; createdAt: string }[]> {
  const allPhones = query != null && query !== ""
    ? await db.select().from(phones).where(like(phones.phoneNumber, `%${query}%`))
    : await db.select().from(phones);
  const humanIds = allPhones.flatMap((p) => p.humanId != null ? [p.humanId] : []);
  const accountIds = allPhones.flatMap((p) => p.accountId != null ? [p.accountId] : []);
  const generalLeadIds = allPhones.flatMap((p) => p.generalLeadId != null ? [p.generalLeadId] : []);
  const allHumans = humanIds.length > 0
    ? await db.select({ id: humans.id, displayId: humans.displayId, firstName: humans.firstName, lastName: humans.lastName }).from(humans).where(inArray(humans.id, humanIds))
    : [];
  const allAccounts = accountIds.length > 0
    ? await db.select({ id: accounts.id, displayId: accounts.displayId, name: accounts.name }).from(accounts).where(inArray(accounts.id, accountIds))
    : [];
  const allGeneralLeads = generalLeadIds.length > 0
    ? await db.select({ id: generalLeads.id, displayId: generalLeads.displayId, firstName: generalLeads.firstName, lastName: generalLeads.lastName }).from(generalLeads).where(inArray(generalLeads.id, generalLeadIds))
    : [];
  const humanLabels = await db.select().from(humanPhoneLabelsConfig);
  const accountLabels = await db.select().from(accountPhoneLabelsConfig);

  const data = allPhones.map((p) => {
    const { ownerName, ownerDisplayId } = resolveOwner(p, allHumans, allAccounts, allGeneralLeads);
    const labels = p.humanId != null ? humanLabels : accountLabels;
    const label = p.labelId != null ? labels.find((l) => l.id === p.labelId) : null;
    return {
      ...p,
      ownerName,
      ownerDisplayId,
      labelName: label?.name ?? null,
    };
  });

  return data;
}

export async function listPhoneNumbersForHuman(db: DB, humanId: string): Promise<(typeof phones.$inferSelect)[]> {
  const results = await db
    .select()
    .from(phones)
    .where(eq(phones.humanId, humanId));
  return results;
}

export async function getPhoneNumber(db: DB, id: string): Promise<{ ownerName: string | null; ownerDisplayId: string | null; labelName: string | null; id: string; displayId: string; humanId: string | null; accountId: string | null; generalLeadId: string | null; websiteBookingRequestId: string | null; routeSignupId: string | null; phoneNumber: string; labelId: string | null; hasWhatsapp: boolean; isPrimary: boolean; createdAt: string; humanDisplayId: string | null; humanName: string | null; accountDisplayId: string | null; accountName: string | null; generalLeadDisplayId: string | null; generalLeadName: string | null; websiteBookingRequestDisplayId: string | null; websiteBookingRequestName: string | null; routeSignupDisplayId: string | null; routeSignupName: string | null }> {
  const allPhones = await db.select().from(phones).where(eq(phones.id, id));
  const phone = allPhones[0];
  if (phone == null) {
    throw notFound(ERROR_CODES.PHONE_NUMBER_NOT_FOUND, "Phone number not found");
  }

  const allHumans = phone.humanId != null
    ? await db.select({ id: humans.id, displayId: humans.displayId, firstName: humans.firstName, lastName: humans.lastName }).from(humans).where(eq(humans.id, phone.humanId))
    : [];
  const allAccounts = phone.accountId != null
    ? await db.select({ id: accounts.id, displayId: accounts.displayId, name: accounts.name }).from(accounts).where(eq(accounts.id, phone.accountId))
    : [];
  const allGeneralLeads = phone.generalLeadId != null
    ? await db.select({ id: generalLeads.id, displayId: generalLeads.displayId, firstName: generalLeads.firstName, lastName: generalLeads.lastName }).from(generalLeads).where(eq(generalLeads.id, phone.generalLeadId))
    : [];
  const humanLabels = await db.select().from(humanPhoneLabelsConfig);
  const accountLabels = await db.select().from(accountPhoneLabelsConfig);

  const { ownerName, ownerDisplayId } = resolveOwner(phone, allHumans, allAccounts, allGeneralLeads);
  const labels = phone.humanId != null ? humanLabels : accountLabels;
  const label = phone.labelId != null ? labels.find((l) => l.id === phone.labelId) : null;

  const humanMatch = allHumans.find((h) => h.id === phone.humanId);
  const accountMatch = allAccounts.find((a) => a.id === phone.accountId);
  const leadMatch = allGeneralLeads.find((l) => l.id === phone.generalLeadId);

  return {
    ...phone,
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

export async function createPhoneNumber(
  db: DB,
  data: {
    humanId?: string | undefined;
    accountId?: string | undefined;
    generalLeadId?: string | undefined;
    websiteBookingRequestId?: string | undefined;
    routeSignupId?: string | undefined;
    phoneNumber: string;
    labelId?: string | null | undefined;
    hasWhatsapp?: boolean | undefined;
    isPrimary?: boolean | undefined;
  },
): Promise<typeof phones.$inferSelect> {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "FON");

  const phone = {
    id: createId(),
    displayId,
    humanId: data.humanId ?? null,
    accountId: data.accountId ?? null,
    generalLeadId: data.generalLeadId ?? null,
    websiteBookingRequestId: data.websiteBookingRequestId ?? null,
    routeSignupId: data.routeSignupId ?? null,
    phoneNumber: data.phoneNumber,
    labelId: data.labelId ?? null,
    hasWhatsapp: data.hasWhatsapp ?? false,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(phones).values(phone);

  // Rematch unlinked activities by this phone number (only for human-linked phones)
  if (data.humanId != null) {
    await rematchActivitiesByPhone(db, data.humanId, data.phoneNumber);
  }

  return phone;
}

export async function updatePhoneNumber(
  db: DB,
  id: string,
  data: Record<string, unknown>,
): Promise<typeof phones.$inferSelect | undefined> {
  const existing = await db.query.phones.findFirst({
    where: eq(phones.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.PHONE_NUMBER_NOT_FOUND, "Phone number not found");
  }

  await db
    .update(phones)
    .set(data)
    .where(eq(phones.id, id));

  const updated = await db.query.phones.findFirst({
    where: eq(phones.id, id),
  });
  return updated;
}

export async function deletePhoneNumber(db: DB, id: string): Promise<void> {
  const existing = await db.query.phones.findFirst({
    where: eq(phones.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.PHONE_NUMBER_NOT_FOUND, "Phone number not found");
  }

  await db.delete(phones).where(eq(phones.id, id));
}

export async function listPhoneNumbersForEntity(
  db: DB,
  column: "generalLeadId" | "websiteBookingRequestId" | "routeSignupId",
  entityId: string,
): Promise<{ id: string; displayId: string; phoneNumber: string; labelId: string | null; hasWhatsapp: boolean; isPrimary: boolean; createdAt: string }[]> {
  // eslint-disable-next-line security/detect-object-injection -- column is a typed union, not user input
  const rows = await db.select().from(phones).where(eq(phones[column], entityId));
  return rows.map((p) => ({
    id: p.id,
    displayId: p.displayId,
    phoneNumber: p.phoneNumber,
    labelId: p.labelId,
    hasWhatsapp: p.hasWhatsapp,
    isPrimary: p.isPrimary,
    createdAt: p.createdAt,
  }));
}
