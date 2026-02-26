import { eq, inArray } from "drizzle-orm";
import {
  accounts,
  accountStatuses,
  accountTypes,
  accountTypesConfig,
  accountHumans,
  accountHumanLabelsConfig,
  emails,
  accountEmailLabelsConfig,
  phones,
  accountPhoneLabelsConfig,
  activities,
  humans,
  socialIds,
  socialIdPlatformsConfig,
  websites,
} from "@humans/db/schema";
import type { AccountStatus } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { computeDiff, logAuditEntry } from "../lib/audit";
import { notFound } from "../lib/errors";
import { assertUniqueIds } from "../lib/assert-unique-ids";
import { nextDisplayId } from "../lib/display-id";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DB } from "./types";

const accountStatusesSet = new Set<string>(accountStatuses);

function isAccountStatus(value: string): value is AccountStatus {
  return accountStatusesSet.has(value);
}

function toAccountStatus(value: string): AccountStatus {
  return isAccountStatus(value) ? value : "open";
}

export async function listAccounts(db: DB): Promise<{ data: { id: string; displayId: string; name: string; status: string; createdAt: string; updatedAt: string; types: { id: string; name: string }[] }[] }> {
  const allAccounts = await db.select().from(accounts);
  const allTypes = await db.select().from(accountTypes);
  const allTypeConfigs = await db.select().from(accountTypesConfig);

  const data = allAccounts.map((a) => ({
    ...a,
    types: allTypes
      .filter((t) => t.accountId === a.id)
      .map((t) => {
        const config = allTypeConfigs.find((c) => c.id === t.typeId);
        return { id: t.typeId, name: config?.name ?? t.typeId };
      }),
  }));

  return { data };
}

export async function getAccountDetail(supabase: SupabaseClient, db: DB, id: string): Promise<{
  id: string; displayId: string; name: string; status: string; createdAt: string; updatedAt: string;
  types: { id: string; name: string }[];
  linkedHumans: { id: string; accountId: string; humanId: string; labelId: string | null; createdAt: string; humanDisplayId: string | null; humanName: string; humanStatus: string | null; labelName: string | null; emails: (typeof emails.$inferSelect)[]; phoneNumbers: (typeof phones.$inferSelect)[] }[];
  emails: ({ labelName: string | null } & typeof emails.$inferSelect)[];
  phoneNumbers: ({ labelName: string | null } & typeof phones.$inferSelect)[];
  activities: ({ viaHumanName: string | null } & typeof activities.$inferSelect)[];
  socialIds: { platformName: string | null; id: string; displayId: string; handle: string; platformId: string | null; humanId: string | null; accountId: string | null; createdAt: string }[];
  referralCodes: { id: string; displayId: string; code: string; description: string | null; isActive: boolean }[];
  discountCodes: { id: string; crmDisplayId: string | null; code: string; description: string | null; percentOff: number; isActive: boolean }[];
  websites: (typeof websites.$inferSelect)[];
}> {
  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  if (account == null) {
    throw notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, "Account not found");
  }

  const [
    types,
    typeConfigs,
    linkedHumans,
    humanLabelConfigs,
    accountEmails,
    emailLabelConfs,
    accountPhones,
    phoneLabelConfs,
    directActivities,
    accountSocialIds,
    allPlatforms,
    accountWebsites,
  ] = await Promise.all([
    db.select().from(accountTypes).where(eq(accountTypes.accountId, id)),
    db.select().from(accountTypesConfig),
    db.select().from(accountHumans).where(eq(accountHumans.accountId, id)),
    db.select().from(accountHumanLabelsConfig),
    db.select().from(emails).where(eq(emails.accountId, id)),
    db.select().from(accountEmailLabelsConfig),
    db.select().from(phones).where(eq(phones.accountId, id)),
    db.select().from(accountPhoneLabelsConfig),
    db.select().from(activities).where(eq(activities.accountId, id)),
    db.select().from(socialIds).where(eq(socialIds.accountId, id)),
    db.select().from(socialIdPlatformsConfig),
    db.select().from(websites).where(eq(websites.accountId, id)),
  ]);

  // Fetch referral codes from Supabase
  const { data: supaReferralCodes } = await supabase
    .from("referral_codes")
    .select("id, display_id, code, description, is_active")
    .eq("account_id", id);

  const accountReferralCodes = (supaReferralCodes ?? []).map((rc: { id: string; display_id: string; code: string; description: string | null; is_active: boolean }) => ({
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
    .eq("account_id", id);

  const accountDiscountCodes = (supaDiscountCodes ?? []).map((dc: { id: string; crm_display_id: string | null; code: string; description: string | null; percent_off: number; is_active: boolean }) => ({
    id: dc.id,
    crmDisplayId: dc.crm_display_id,
    code: dc.code,
    description: dc.description,
    percentOff: dc.percent_off,
    isActive: dc.is_active,
  }));

  // Resolve linked humans with their details
  const humanIds = linkedHumans.map((lh) => lh.humanId);
  let allHumans: (typeof humans.$inferSelect)[] = [];
  let allHumanEmails: (typeof emails.$inferSelect)[] = [];
  let allHumanPhones: (typeof phones.$inferSelect)[] = [];
  let humanActivities: (typeof activities.$inferSelect)[] = [];

  if (humanIds.length > 0) {
    [allHumans, allHumanEmails, allHumanPhones, humanActivities] = await Promise.all([
      db.select().from(humans).where(inArray(humans.id, humanIds)),
      db.select().from(emails).where(inArray(emails.humanId, humanIds)),
      db.select().from(phones).where(inArray(phones.humanId, humanIds)),
      db.select().from(activities).where(inArray(activities.humanId, humanIds)),
    ]);
  }

  const typesWithNames = types.map((t) => {
    const config = typeConfigs.find((c) => c.id === t.typeId);
    return { id: t.typeId, name: config?.name ?? t.typeId };
  });

  const linkedHumansWithDetails = linkedHumans.map((lh) => {
    const human = allHumans.find((h) => h.id === lh.humanId);
    const label = lh.labelId != null ? humanLabelConfigs.find((l) => l.id === lh.labelId) : null;
    return {
      ...lh,
      humanDisplayId: human?.displayId ?? null,
      humanName: human != null ? `${human.firstName} ${human.lastName}` : "Unknown",
      humanStatus: human?.status ?? null,
      labelName: label?.name ?? null,
      emails: allHumanEmails.filter((e) => e.humanId === lh.humanId),
      phoneNumbers: allHumanPhones.filter((p) => p.humanId === lh.humanId),
    };
  });

  const emailsWithLabels = accountEmails
    .map((e) => {
      const label = e.labelId != null ? emailLabelConfs.find((l) => l.id === e.labelId) : null;
      return { ...e, labelName: label?.name ?? null };
    });

  const phonesWithLabels = accountPhones
    .map((p) => {
      const label = p.labelId != null ? phoneLabelConfs.find((l) => l.id === p.labelId) : null;
      return { ...p, labelName: label?.name ?? null };
    });

  // Annotate human activities with human name
  const humanActivitiesWithNames = humanActivities.map((a) => {
    const human = allHumans.find((h) => h.id === a.humanId);
    return {
      ...a,
      viaHumanName: human != null ? `${human.firstName} ${human.lastName}` : "Unknown",
    };
  });

  const socialIdsWithPlatforms = accountSocialIds.map((s) => {
    const platform = s.platformId != null ? allPlatforms.find((p) => p.id === s.platformId) : null;
    return { ...s, platformName: platform?.name ?? null };
  });

  return {
    ...account,
    types: typesWithNames,
    linkedHumans: linkedHumansWithDetails,
    emails: emailsWithLabels,
    phoneNumbers: phonesWithLabels,
    activities: assertUniqueIds(
      [
         
        ...directActivities.map((a) => ({ ...a, viaHumanName: null as string | null })),
        ...humanActivitiesWithNames,
      ],
      "account-activities",
    ),
    socialIds: socialIdsWithPlatforms,
    referralCodes: accountReferralCodes,
    discountCodes: accountDiscountCodes,
    websites: accountWebsites,
  };
}

export async function createAccount(
  db: DB,
  data: { name: string; status?: string | undefined; typeIds?: string[] | undefined },
): Promise<{ id: string; displayId: string }> {
  const now = new Date().toISOString();
  const accountId = createId();
  const displayId = await nextDisplayId(db, "ACC");

  await db.insert(accounts).values({
    id: accountId,
    displayId,
    name: data.name,
    status: toAccountStatus(data.status ?? "open"),
    createdAt: now,
    updatedAt: now,
  });

  if (data.typeIds != null && data.typeIds.length > 0) {
    for (const typeId of data.typeIds) {
      await db.insert(accountTypes).values({
        id: createId(),
        accountId,
        typeId,
        createdAt: now,
      });
    }
  }

  return { id: accountId, displayId };
}

export async function updateAccount(
  db: DB,
  id: string,
  data: { name?: string | undefined; typeIds?: string[] | undefined },
  colleagueId: string,
): Promise<{ data: typeof accounts.$inferSelect | undefined; auditEntryId: string | undefined }> {
  const now = new Date().toISOString();

  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, "Account not found");
  }

  // Capture old values for audit
  const existingTypeRows = await db.select().from(accountTypes).where(eq(accountTypes.accountId, id));
  const oldValues: Record<string, unknown> = {
    name: existing.name,
  };
  if (data.typeIds !== undefined) {
    oldValues["typeIds"] = existingTypeRows.map((t) => t.typeId).sort((a, b) => a.localeCompare(b));
  }

  const updateFields: Record<string, unknown> = { updatedAt: now };
  if (data.name !== undefined) updateFields["name"] = data.name;

  await db.update(accounts).set(updateFields).where(eq(accounts.id, id));

  // Replace types if provided
  if (data.typeIds != null) {
    await db.delete(accountTypes).where(eq(accountTypes.accountId, id));
    for (const typeId of data.typeIds) {
      await db.insert(accountTypes).values({
        id: createId(),
        accountId: id,
        typeId,
        createdAt: now,
      });
    }
  }

  // Audit log
  const newValues: Record<string, unknown> = {};
  if (data.name !== undefined) newValues["name"] = data.name;
  if (data.typeIds !== undefined) newValues["typeIds"] = [...data.typeIds].sort((a, b) => a.localeCompare(b));

  const diff = computeDiff(oldValues, newValues);
  let auditEntryId: string | undefined;
  if (diff != null) {
    auditEntryId = await logAuditEntry({
      db,
      colleagueId,
      action: "UPDATE",
      entityType: "account",
      entityId: id,
      changes: diff,
    });
  }

  const updated = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  return { data: updated, auditEntryId };
}

export async function updateAccountStatus(
  db: DB,
  id: string,
  status: string,
  colleagueId: string,
): Promise<{ id: string; status: string; auditEntryId: string | undefined }> {
  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, "Account not found");
  }

  const oldStatus = existing.status;
  await db
    .update(accounts)
    .set({ status: toAccountStatus(status), updatedAt: new Date().toISOString() })
    .where(eq(accounts.id, id));

  // Audit log
  let auditEntryId: string | undefined;
  if (oldStatus !== status) {
    const diff = computeDiff({ status: oldStatus }, { status });
    if (diff != null) {
      auditEntryId = await logAuditEntry({
        db,
        colleagueId,
        action: "UPDATE",
        entityType: "account",
        entityId: id,
        changes: diff,
      });
    }
  }

  return { id, status, auditEntryId };
}

export async function deleteAccount(supabase: SupabaseClient, db: DB, id: string): Promise<void> {
  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, "Account not found");
  }

  await db.delete(accountTypes).where(eq(accountTypes.accountId, id));
  await db.delete(accountHumans).where(eq(accountHumans.accountId, id));
  await db.update(emails).set({ accountId: null }).where(eq(emails.accountId, id));
  await db.update(phones).set({ accountId: null }).where(eq(phones.accountId, id));
  await db.update(socialIds).set({ accountId: null }).where(eq(socialIds.accountId, id));
  await db.update(websites).set({ accountId: null }).where(eq(websites.accountId, id));
  await supabase.from("referral_codes").update({ account_id: null }).eq("account_id", id);
  await supabase.from("discount_codes").update({ account_id: null }).eq("account_id", id);
  await db.delete(accounts).where(eq(accounts.id, id));
}

export async function addAccountEmail(
  db: DB,
  accountId: string,
  data: { email: string; labelId?: string | null | undefined; isPrimary?: boolean | undefined },
): Promise<typeof emails.$inferSelect> {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "EML");

  const emailRecord = {
    id: createId(),
    displayId,
    humanId: null,
    accountId,
    generalLeadId: null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    email: data.email,
    labelId: data.labelId ?? null,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(emails).values(emailRecord);
  return emailRecord;
}

export async function deleteAccountEmail(db: DB, emailId: string): Promise<void> {
  await db.delete(emails).where(eq(emails.id, emailId));
}

export async function addAccountPhone(
  db: DB,
  accountId: string,
  data: { phoneNumber: string; labelId?: string | null | undefined; hasWhatsapp?: boolean | undefined; isPrimary?: boolean | undefined },
): Promise<typeof phones.$inferSelect> {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "FON");

  const phoneRecord = {
    id: createId(),
    displayId,
    humanId: null,
    accountId,
    generalLeadId: null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    phoneNumber: data.phoneNumber,
    labelId: data.labelId ?? null,
    hasWhatsapp: data.hasWhatsapp ?? false,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(phones).values(phoneRecord);
  return phoneRecord;
}

export async function deleteAccountPhone(db: DB, phoneId: string): Promise<void> {
  await db.delete(phones).where(eq(phones.id, phoneId));
}

export async function linkAccountHuman(
  db: DB,
  accountId: string,
  data: { humanId: string; labelId?: string | null | undefined },
): Promise<{ id: string; accountId: string; humanId: string; labelId: string | null; createdAt: string }> {
  const now = new Date().toISOString();

  const link = {
    id: createId(),
    accountId,
    humanId: data.humanId,
    labelId: data.labelId ?? null,
    createdAt: now,
  };

  await db.insert(accountHumans).values(link);
  return link;
}

export async function updateAccountHumanLabel(
  db: DB,
  linkId: string,
  labelId: string | null,
): Promise<void> {
  await db
    .update(accountHumans)
    .set({ labelId: labelId ?? null })
    .where(eq(accountHumans.id, linkId));
}

export async function unlinkAccountHuman(db: DB, linkId: string): Promise<void> {
  await db.delete(accountHumans).where(eq(accountHumans.id, linkId));
}
