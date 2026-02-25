import { eq, and, sql, type SQL } from "drizzle-orm";
import { agreements, agreementTypesConfig, humans, accounts, documents, type AgreementStatus } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { computeDiff, logAuditEntry } from "../lib/audit";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

interface AgreementRow {
  id: string;
  displayId: string;
  title: string;
  typeId: string | null;
  status: string;
  activationDate: string | null;
  notes: string | null;
  humanId: string | null;
  accountId: string | null;
  createdAt: string;
  updatedAt: string;
  typeName: string | null;
  humanName: string | null;
  humanDisplayId: string | null;
  accountName: string | null;
  accountDisplayId: string | null;
}

function resolveRow(
  row: typeof agreements.$inferSelect,
  types: (typeof agreementTypesConfig.$inferSelect)[],
  allHumans: { id: string; displayId: string; firstName: string; lastName: string }[],
  allAccounts: { id: string; displayId: string; name: string }[],
): AgreementRow {
  const type = row.typeId != null ? types.find((t) => t.id === row.typeId) : null;
  const human = row.humanId != null ? allHumans.find((h) => h.id === row.humanId) : null;
  const account = row.accountId != null ? allAccounts.find((a) => a.id === row.accountId) : null;
  return {
    ...row,
    typeName: type?.name ?? null,
    humanName: human != null ? `${human.firstName} ${human.lastName}` : null,
    humanDisplayId: human?.displayId ?? null,
    accountName: account?.name ?? null,
    accountDisplayId: account?.displayId ?? null,
  };
}

export async function listAgreements(
  db: DB,
  page: number,
  limit: number,
  filters: { humanId?: string; accountId?: string; status?: string },
): Promise<{ data: AgreementRow[]; meta: { page: number; limit: number; total: number } }> {
  const offset = (page - 1) * limit;
  const conditions: SQL[] = [];

  if (filters.humanId != null) conditions.push(eq(agreements.humanId, filters.humanId));
  if (filters.accountId != null) conditions.push(eq(agreements.accountId, filters.accountId));
  if (filters.status != null) conditions.push(sql`${agreements.status} = ${filters.status}`);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db.select({ total: sql<number>`count(*)` }).from(agreements).where(whereClause);
  const total = countResult[0]?.total ?? 0;

  const rows = await db
    .select()
    .from(agreements)
    .where(whereClause)
    .orderBy(sql`${agreements.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  const types = await db.select().from(agreementTypesConfig);
  const allHumans = await db.select({ id: humans.id, displayId: humans.displayId, firstName: humans.firstName, lastName: humans.lastName }).from(humans);
  const allAccounts = await db.select({ id: accounts.id, displayId: accounts.displayId, name: accounts.name }).from(accounts);

  const data = rows.map((r) => resolveRow(r, types, allHumans, allAccounts));

  return { data, meta: { page, limit, total } };
}

export async function getAgreement(db: DB, id: string): Promise<AgreementRow> {
  const result = await db.select().from(agreements).where(eq(agreements.id, id));
  const row = result[0];
  if (row == null) {
    throw notFound(ERROR_CODES.AGREEMENT_NOT_FOUND, "Agreement not found");
  }

  const types = await db.select().from(agreementTypesConfig);
  const allHumans = await db.select({ id: humans.id, displayId: humans.displayId, firstName: humans.firstName, lastName: humans.lastName }).from(humans);
  const allAccounts = await db.select({ id: accounts.id, displayId: accounts.displayId, name: accounts.name }).from(accounts);

  return resolveRow(row, types, allHumans, allAccounts);
}

export async function createAgreement(
  db: DB,
  data: {
    title: string;
    typeId?: string | null | undefined;
    status?: string | undefined;
    activationDate?: string | null | undefined;
    notes?: string | null | undefined;
    humanId?: string | null | undefined;
    accountId?: string | null | undefined;
  },
  colleagueId: string,
): Promise<AgreementRow> {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "AGR");

  const record = {
    id: createId(),
    displayId,
    title: data.title,
    typeId: data.typeId ?? null,
    status: (data.status ?? "open") as AgreementStatus,
    activationDate: data.activationDate ?? null,
    notes: data.notes ?? null,
    humanId: data.humanId ?? null,
    accountId: data.accountId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(agreements).values(record);

  await logAuditEntry({
    db,
    colleagueId,
    action: "create",
    entityType: "agreement",
    entityId: record.id,
    changes: { created: { old: null, new: record.title } },
  });

  const types = await db.select().from(agreementTypesConfig);
  const allHumans = await db.select({ id: humans.id, displayId: humans.displayId, firstName: humans.firstName, lastName: humans.lastName }).from(humans);
  const allAccounts = await db.select({ id: accounts.id, displayId: accounts.displayId, name: accounts.name }).from(accounts);

  return resolveRow(record, types, allHumans, allAccounts);
}

export async function updateAgreement(
  db: DB,
  id: string,
  data: Record<string, unknown>,
  colleagueId: string,
): Promise<AgreementRow> {
  const existing = await db.select().from(agreements).where(eq(agreements.id, id));
  const row = existing[0];
  if (row == null) {
    throw notFound(ERROR_CODES.AGREEMENT_NOT_FOUND, "Agreement not found");
  }

  const now = new Date().toISOString();
  const updateData = { ...data, updatedAt: now };

  const diff = computeDiff(row as unknown as Record<string, unknown>, updateData);
  await db.update(agreements).set(updateData).where(eq(agreements.id, id));

  if (diff != null) {
    await logAuditEntry({
      db,
      colleagueId,
      action: "update",
      entityType: "agreement",
      entityId: id,
      changes: diff,
    });
  }

  return getAgreement(db, id);
}

export async function deleteAgreement(
  db: DB,
  id: string,
  colleagueId: string,
  r2: R2Bucket,
): Promise<void> {
  const existing = await db.select().from(agreements).where(eq(agreements.id, id));
  const row = existing[0];
  if (row == null) {
    throw notFound(ERROR_CODES.AGREEMENT_NOT_FOUND, "Agreement not found");
  }

  // Delete linked documents (D1 + R2)
  const docs = await db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, "agreement"), eq(documents.entityId, id)));

  for (const doc of docs) {
    await r2.delete(doc.key);
  }
  if (docs.length > 0) {
    await db
      .delete(documents)
      .where(and(eq(documents.entityType, "agreement"), eq(documents.entityId, id)));
  }

  await db.delete(agreements).where(eq(agreements.id, id));

  await logAuditEntry({
    db,
    colleagueId,
    action: "delete",
    entityType: "agreement",
    entityId: id,
    changes: { deleted: { old: row.title, new: null } },
  });
}
