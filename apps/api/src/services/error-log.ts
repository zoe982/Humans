import { desc, eq, and, gte, lte, lt } from "drizzle-orm";
import { errorLog } from "@humans/db/schema";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import type { DB } from "./types";

interface ErrorLogFilters {
  limit: number;
  offset: number;
  code?: string;
  path?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listErrorLogEntries(db: DB, filters: ErrorLogFilters) {
  const { limit, offset } = filters;

  const conditions = [];
  if (filters.code) conditions.push(eq(errorLog.code, filters.code));
  if (filters.path) conditions.push(eq(errorLog.path, filters.path));
  if (filters.dateFrom) conditions.push(gte(errorLog.createdAt, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(errorLog.createdAt, filters.dateTo));

  let results;
  if (conditions.length > 0) {
    results = await db
      .select()
      .from(errorLog)
      .where(and(...conditions))
      .orderBy(desc(errorLog.createdAt))
      .limit(limit)
      .offset(offset);
  } else {
    results = await db
      .select()
      .from(errorLog)
      .orderBy(desc(errorLog.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return results;
}

export async function getErrorLogEntry(db: DB, id: string) {
  const entry = await db.query.errorLog.findFirst({
    where: eq(errorLog.id, id),
  });

  if (entry == null) {
    throw notFound(ERROR_CODES.ERROR_LOG_NOT_FOUND, "Error log entry not found");
  }

  return entry;
}

export async function cleanupErrorLog(db: DB) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.delete(errorLog).where(lt(errorLog.createdAt, cutoff));
}
