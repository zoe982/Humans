import { eq } from "drizzle-orm";
import {
  accounts,
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
} from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { computeDiff, logAuditEntry } from "../lib/audit";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

export async function listAccounts(db: DB) {
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

export async function getAccountDetail(db: DB, id: string) {
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
  ] = await Promise.all([
    db.select().from(accountTypes).where(eq(accountTypes.accountId, id)),
    db.select().from(accountTypesConfig),
    db.select().from(accountHumans).where(eq(accountHumans.accountId, id)),
    db.select().from(accountHumanLabelsConfig),
    db.select().from(emails).where(eq(emails.ownerId, id)),
    db.select().from(accountEmailLabelsConfig),
    db.select().from(phones).where(eq(phones.ownerId, id)),
    db.select().from(accountPhoneLabelsConfig),
    db.select().from(activities).where(eq(activities.accountId, id)),
    db.select().from(socialIds).where(eq(socialIds.accountId, id)),
    db.select().from(socialIdPlatformsConfig),
  ]);

  // Resolve linked humans with their details
  const humanIds = linkedHumans.map((lh) => lh.humanId);
  let allHumans: (typeof humans.$inferSelect)[] = [];
  let allHumanEmails: (typeof emails.$inferSelect)[] = [];
  let allHumanPhones: (typeof phones.$inferSelect)[] = [];
  let humanActivities: (typeof activities.$inferSelect)[] = [];

  if (humanIds.length > 0) {
    [allHumans, allHumanEmails, allHumanPhones] = await Promise.all([
      db.select().from(humans),
      db.select().from(emails),
      db.select().from(phones),
    ]);

    // Get activities for linked humans
    const allActivities = await db.select().from(activities);
    humanActivities = allActivities.filter(
      (a) => a.humanId && humanIds.includes(a.humanId) && a.id !== undefined,
    );
  }

  const typesWithNames = types.map((t) => {
    const config = typeConfigs.find((c) => c.id === t.typeId);
    return { id: t.typeId, name: config?.name ?? t.typeId };
  });

  const linkedHumansWithDetails = linkedHumans.map((lh) => {
    const human = allHumans.find((h) => h.id === lh.humanId);
    const label = lh.labelId ? humanLabelConfigs.find((l) => l.id === lh.labelId) : null;
    return {
      ...lh,
      humanName: human ? `${human.firstName} ${human.lastName}` : "Unknown",
      humanStatus: human?.status ?? null,
      labelName: label?.name ?? null,
      emails: allHumanEmails.filter((e) => e.ownerType === "human" && e.ownerId === lh.humanId),
      phoneNumbers: allHumanPhones.filter((p) => p.ownerType === "human" && p.ownerId === lh.humanId),
    };
  });

  const emailsWithLabels = accountEmails
    .filter((e) => e.ownerType === "account")
    .map((e) => {
      const label = e.labelId ? emailLabelConfs.find((l) => l.id === e.labelId) : null;
      return { ...e, labelName: label?.name ?? null };
    });

  const phonesWithLabels = accountPhones
    .filter((p) => p.ownerType === "account")
    .map((p) => {
      const label = p.labelId ? phoneLabelConfs.find((l) => l.id === p.labelId) : null;
      return { ...p, labelName: label?.name ?? null };
    });

  // Annotate human activities with human name
  const humanActivitiesWithNames = humanActivities.map((a) => {
    const human = allHumans.find((h) => h.id === a.humanId);
    return {
      ...a,
      viaHumanName: human ? `${human.firstName} ${human.lastName}` : "Unknown",
    };
  });

  const socialIdsWithPlatforms = accountSocialIds.map((s) => {
    const platform = s.platformId ? allPlatforms.find((p) => p.id === s.platformId) : null;
    return { ...s, platformName: platform?.name ?? null };
  });

  return {
    ...account,
    types: typesWithNames,
    linkedHumans: linkedHumansWithDetails,
    emails: emailsWithLabels,
    phoneNumbers: phonesWithLabels,
    activities: directActivities,
    humanActivities: humanActivitiesWithNames,
    socialIds: socialIdsWithPlatforms,
  };
}

export async function createAccount(
  db: DB,
  data: { name: string; status?: string; typeIds?: string[] },
) {
  const now = new Date().toISOString();
  const accountId = createId();
  const displayId = await nextDisplayId(db, "ACC");

  await db.insert(accounts).values({
    id: accountId,
    displayId,
    name: data.name,
    status: data.status ?? "open",
    createdAt: now,
    updatedAt: now,
  });

  if (data.typeIds && data.typeIds.length > 0) {
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
  data: { name?: string; typeIds?: string[] },
  colleagueId: string,
) {
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
    oldValues["typeIds"] = existingTypeRows.map((t) => t.typeId).sort();
  }

  const updateFields: Record<string, unknown> = { updatedAt: now };
  if (data.name !== undefined) updateFields["name"] = data.name;

  await db.update(accounts).set(updateFields).where(eq(accounts.id, id));

  // Replace types if provided
  if (data.typeIds) {
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
  if (data.typeIds !== undefined) newValues["typeIds"] = [...data.typeIds].sort();

  const diff = computeDiff(oldValues, newValues);
  let auditEntryId: string | undefined;
  if (diff) {
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
) {
  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, "Account not found");
  }

  const oldStatus = existing.status;
  await db
    .update(accounts)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(accounts.id, id));

  // Audit log
  let auditEntryId: string | undefined;
  if (oldStatus !== status) {
    const diff = computeDiff({ status: oldStatus }, { status });
    if (diff) {
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

export async function deleteAccount(db: DB, id: string) {
  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.ACCOUNT_NOT_FOUND, "Account not found");
  }

  await db.delete(accountTypes).where(eq(accountTypes.accountId, id));
  await db.delete(accountHumans).where(eq(accountHumans.accountId, id));
  await db.delete(emails).where(eq(emails.ownerId, id));
  await db.delete(phones).where(eq(phones.ownerId, id));
  await db.update(socialIds).set({ accountId: null }).where(eq(socialIds.accountId, id));
  await db.delete(accounts).where(eq(accounts.id, id));
}

export async function addAccountEmail(
  db: DB,
  accountId: string,
  data: { email: string; labelId?: string | null; isPrimary?: boolean },
) {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "EML");

  const emailRecord = {
    id: createId(),
    displayId,
    ownerType: "account" as const,
    ownerId: accountId,
    email: data.email,
    labelId: data.labelId ?? null,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(emails).values(emailRecord);
  return emailRecord;
}

export async function deleteAccountEmail(db: DB, emailId: string) {
  await db.delete(emails).where(eq(emails.id, emailId));
}

export async function addAccountPhone(
  db: DB,
  accountId: string,
  data: { phoneNumber: string; labelId?: string | null; hasWhatsapp?: boolean; isPrimary?: boolean },
) {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "FON");

  const phoneRecord = {
    id: createId(),
    displayId,
    ownerType: "account" as const,
    ownerId: accountId,
    phoneNumber: data.phoneNumber,
    labelId: data.labelId ?? null,
    hasWhatsapp: data.hasWhatsapp ?? false,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(phones).values(phoneRecord);
  return phoneRecord;
}

export async function deleteAccountPhone(db: DB, phoneId: string) {
  await db.delete(phones).where(eq(phones.id, phoneId));
}

export async function linkAccountHuman(
  db: DB,
  accountId: string,
  data: { humanId: string; labelId?: string | null },
) {
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
) {
  await db
    .update(accountHumans)
    .set({ labelId: labelId ?? null })
    .where(eq(accountHumans.id, linkId));
}

export async function unlinkAccountHuman(db: DB, linkId: string) {
  await db.delete(accountHumans).where(eq(accountHumans.id, linkId));
}
