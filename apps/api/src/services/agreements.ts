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

/** Single-query select with JOINs — no full table scans. */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Drizzle inferred return type is complex
function agreementSelectWithJoins(db: DB) {
  return db
    .select({
      id: agreements.id,
      displayId: agreements.displayId,
      title: agreements.title,
      typeId: agreements.typeId,
      status: agreements.status,
      activationDate: agreements.activationDate,
      notes: agreements.notes,
      humanId: agreements.humanId,
      accountId: agreements.accountId,
      createdAt: agreements.createdAt,
      updatedAt: agreements.updatedAt,
      typeName: agreementTypesConfig.name,
      humanFirstName: humans.firstName,
      humanLastName: humans.lastName,
      humanDisplayId: humans.displayId,
      accountName: accounts.name,
      accountDisplayId: accounts.displayId,
    })
    .from(agreements)
    .leftJoin(agreementTypesConfig, eq(agreements.typeId, agreementTypesConfig.id))
    .leftJoin(humans, eq(agreements.humanId, humans.id))
    .leftJoin(accounts, eq(agreements.accountId, accounts.id));
}

function toAgreementRow(r: {
  id: string; displayId: string; title: string; typeId: string | null;
  status: string; activationDate: string | null; notes: string | null;
  humanId: string | null; accountId: string | null;
  createdAt: string; updatedAt: string;
  typeName: string | null; humanFirstName: string | null; humanLastName: string | null;
  humanDisplayId: string | null; accountName: string | null; accountDisplayId: string | null;
}): AgreementRow {
  return {
    id: r.id,
    displayId: r.displayId,
    title: r.title,
    typeId: r.typeId,
    status: r.status,
    activationDate: r.activationDate,
    notes: r.notes,
    humanId: r.humanId,
    accountId: r.accountId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    typeName: r.typeName ?? null,
    humanName: r.humanFirstName != null ? `${r.humanFirstName} ${r.humanLastName ?? ""}`.trim() : null,
    humanDisplayId: r.humanDisplayId ?? null,
    accountName: r.accountName ?? null,
    accountDisplayId: r.accountDisplayId ?? null,
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

  const rows = await agreementSelectWithJoins(db)
    .where(whereClause)
    .orderBy(sql`${agreements.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

  return { data: rows.map(toAgreementRow), meta: { page, limit, total } };
}

export async function getAgreement(db: DB, id: string): Promise<AgreementRow> {
  const rows = await agreementSelectWithJoins(db)
    .where(eq(agreements.id, id));

  const r = rows[0];
  if (r == null) {
    throw notFound(ERROR_CODES.AGREEMENT_NOT_FOUND, "Agreement not found");
  }

  return toAgreementRow(r);
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Zod-validated at route layer
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

  return getAgreement(db, record.id);
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Zod-validated at route layer
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
