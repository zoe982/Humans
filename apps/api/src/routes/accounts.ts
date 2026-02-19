import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  accounts,
  accountTypes,
  accountTypesConfig,
  accountHumans,
  accountHumanLabelsConfig,
  accountEmails,
  accountEmailLabelsConfig,
  accountPhoneNumbers,
  accountPhoneLabelsConfig,
  activities,
  humans,
  humanEmails,
  humanPhoneNumbers,
} from "@humans/db/schema";
import { createId } from "@humans/db";
import {
  createAccountSchema,
  updateAccountSchema,
  updateAccountStatusSchema,
  createAccountEmailSchema,
  createAccountPhoneNumberSchema,
  linkAccountHumanSchema,
  updateAccountHumanSchema,
} from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { computeDiff, logAuditEntry } from "../lib/audit";
import type { AppContext } from "../types";

const accountRoutes = new Hono<AppContext>();

accountRoutes.use("/*", authMiddleware);

// List all accounts with types
accountRoutes.get("/api/accounts", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
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

  return c.json({ data });
});

// Get single account with full detail
accountRoutes.get("/api/accounts/:id", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  if (account == null) {
    return c.json({ error: "Account not found" }, 404);
  }

  const [
    types,
    typeConfigs,
    linkedHumans,
    humanLabelConfigs,
    emails,
    emailLabelConfigs,
    phoneNumbers,
    phoneLabelConfigs,
    directActivities,
  ] = await Promise.all([
    db.select().from(accountTypes).where(eq(accountTypes.accountId, id)),
    db.select().from(accountTypesConfig),
    db.select().from(accountHumans).where(eq(accountHumans.accountId, id)),
    db.select().from(accountHumanLabelsConfig),
    db.select().from(accountEmails).where(eq(accountEmails.accountId, id)),
    db.select().from(accountEmailLabelsConfig),
    db.select().from(accountPhoneNumbers).where(eq(accountPhoneNumbers.accountId, id)),
    db.select().from(accountPhoneLabelsConfig),
    db.select().from(activities).where(eq(activities.accountId, id)),
  ]);

  // Resolve linked humans with their details
  const humanIds = linkedHumans.map((lh) => lh.humanId);
  let allHumans: (typeof humans.$inferSelect)[] = [];
  let allHumanEmails: (typeof humanEmails.$inferSelect)[] = [];
  let allHumanPhones: (typeof humanPhoneNumbers.$inferSelect)[] = [];
  let humanActivities: (typeof activities.$inferSelect)[] = [];

  if (humanIds.length > 0) {
    [allHumans, allHumanEmails, allHumanPhones] = await Promise.all([
      db.select().from(humans),
      db.select().from(humanEmails),
      db.select().from(humanPhoneNumbers),
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
      emails: allHumanEmails.filter((e) => e.humanId === lh.humanId),
      phoneNumbers: allHumanPhones.filter((p) => p.humanId === lh.humanId),
    };
  });

  const emailsWithLabels = emails.map((e) => {
    const label = e.labelId ? emailLabelConfigs.find((l) => l.id === e.labelId) : null;
    return { ...e, labelName: label?.name ?? null };
  });

  const phonesWithLabels = phoneNumbers.map((p) => {
    const label = p.labelId ? phoneLabelConfigs.find((l) => l.id === p.labelId) : null;
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

  return c.json({
    data: {
      ...account,
      types: typesWithNames,
      linkedHumans: linkedHumansWithDetails,
      emails: emailsWithLabels,
      phoneNumbers: phonesWithLabels,
      activities: directActivities,
      humanActivities: humanActivitiesWithNames,
    },
  });
});

// Create account
accountRoutes.post("/api/accounts", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createAccountSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();
  const accountId = createId();

  await db.insert(accounts).values({
    id: accountId,
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

  return c.json({ data: { id: accountId } }, 201);
});

// Update account
accountRoutes.patch("/api/accounts/:id", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateAccountSchema.parse(body);
  const db = c.get("db");
  const id = c.req.param("id");
  const now = new Date().toISOString();

  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  if (existing == null) {
    return c.json({ error: "Account not found" }, 404);
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
    const session = c.get("session")!;
    auditEntryId = await logAuditEntry({
      db,
      colleagueId: session.colleagueId,
      action: "UPDATE",
      entityType: "account",
      entityId: id,
      changes: diff,
    });
  }

  const updated = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  return c.json({ data: updated, auditEntryId });
});

// Update account status
accountRoutes.patch("/api/accounts/:id/status", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateAccountStatusSchema.parse(body);
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  if (existing == null) {
    return c.json({ error: "Account not found" }, 404);
  }

  const oldStatus = existing.status;
  await db
    .update(accounts)
    .set({ status: data.status, updatedAt: new Date().toISOString() })
    .where(eq(accounts.id, id));

  // Audit log
  let auditEntryId: string | undefined;
  if (oldStatus !== data.status) {
    const diff = computeDiff({ status: oldStatus }, { status: data.status });
    if (diff) {
      const session = c.get("session")!;
      auditEntryId = await logAuditEntry({
        db,
        colleagueId: session.colleagueId,
        action: "UPDATE",
        entityType: "account",
        entityId: id,
        changes: diff,
      });
    }
  }

  return c.json({ data: { id, status: data.status }, auditEntryId });
});

// Delete account + cascade
accountRoutes.delete("/api/accounts/:id", requirePermission("manageAccounts"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.id, id),
  });
  if (existing == null) {
    return c.json({ error: "Account not found" }, 404);
  }

  await db.delete(accountTypes).where(eq(accountTypes.accountId, id));
  await db.delete(accountHumans).where(eq(accountHumans.accountId, id));
  await db.delete(accountEmails).where(eq(accountEmails.accountId, id));
  await db.delete(accountPhoneNumbers).where(eq(accountPhoneNumbers.accountId, id));
  await db.delete(accounts).where(eq(accounts.id, id));

  return c.json({ success: true });
});

// Add email to account
accountRoutes.post("/api/accounts/:id/emails", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createAccountEmailSchema.parse(body);
  const db = c.get("db");
  const id = c.req.param("id");
  const now = new Date().toISOString();

  const emailRecord = {
    id: createId(),
    accountId: id,
    email: data.email,
    labelId: data.labelId ?? null,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(accountEmails).values(emailRecord);
  return c.json({ data: emailRecord }, 201);
});

// Delete account email
accountRoutes.delete("/api/accounts/:id/emails/:emailId", requirePermission("manageAccounts"), async (c) => {
  const db = c.get("db");
  const emailId = c.req.param("emailId");

  await db.delete(accountEmails).where(eq(accountEmails.id, emailId));
  return c.json({ success: true });
});

// Add phone number to account
accountRoutes.post("/api/accounts/:id/phone-numbers", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createAccountPhoneNumberSchema.parse(body);
  const db = c.get("db");
  const id = c.req.param("id");
  const now = new Date().toISOString();

  const phoneRecord = {
    id: createId(),
    accountId: id,
    phoneNumber: data.phoneNumber,
    labelId: data.labelId ?? null,
    hasWhatsapp: data.hasWhatsapp ?? false,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(accountPhoneNumbers).values(phoneRecord);
  return c.json({ data: phoneRecord }, 201);
});

// Delete account phone number
accountRoutes.delete("/api/accounts/:id/phone-numbers/:phoneId", requirePermission("manageAccounts"), async (c) => {
  const db = c.get("db");
  const phoneId = c.req.param("phoneId");

  await db.delete(accountPhoneNumbers).where(eq(accountPhoneNumbers.id, phoneId));
  return c.json({ success: true });
});

// Link human to account
accountRoutes.post("/api/accounts/:id/humans", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = linkAccountHumanSchema.parse(body);
  const db = c.get("db");
  const id = c.req.param("id");
  const now = new Date().toISOString();

  const link = {
    id: createId(),
    accountId: id,
    humanId: data.humanId,
    labelId: data.labelId ?? null,
    createdAt: now,
  };

  await db.insert(accountHumans).values(link);
  return c.json({ data: link }, 201);
});

// Update human-account link label
accountRoutes.patch("/api/accounts/:id/humans/:linkId", requirePermission("manageAccounts"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateAccountHumanSchema.parse(body);
  const db = c.get("db");
  const linkId = c.req.param("linkId");

  await db
    .update(accountHumans)
    .set({ labelId: data.labelId ?? null })
    .where(eq(accountHumans.id, linkId));

  return c.json({ success: true });
});

// Unlink human from account
accountRoutes.delete("/api/accounts/:id/humans/:linkId", requirePermission("manageAccounts"), async (c) => {
  const db = c.get("db");
  const linkId = c.req.param("linkId");

  await db.delete(accountHumans).where(eq(accountHumans.id, linkId));
  return c.json({ success: true });
});

export { accountRoutes };
