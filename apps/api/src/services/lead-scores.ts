import { eq, sql, and, ilike, or, desc, inArray } from "drizzle-orm";
import { leadScores, generalLeads } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES, type LeadScoreParentType, getLeadScoreBand } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

// ─── Pure scoring function ───────────────────────────────────────

interface LeadScoreFlags {
  fitMatchesCurrentWebsiteFlight?: boolean;
  fitPriceAcknowledgedOk?: boolean;
  intentDepositPaid?: boolean;
  intentPaymentDetailsSent?: boolean;
  intentRequestedPaymentDetails?: boolean;
  intentBookingSubmitted?: boolean;
  intentBookingStarted?: boolean;
  intentRouteSignupSubmitted?: boolean;
  engagementRespondedFast?: boolean;
  engagementRespondedSlow?: boolean;
  negativeNoContactMethod?: boolean;
  negativeOffNetworkRequest?: boolean;
  negativePriceObjection?: boolean;
  negativeGhostedAfterPaymentSent?: boolean;
  customerHasFlown?: boolean;
}

export function computeLeadScore(flags: LeadScoreFlags): {
  scoreFit: number;
  scoreIntent: number;
  scoreEngagement: number;
  scoreNegative: number;
  scoreTotal: number;
} {
  // Fit: min(35, sum of individual)
  const fitRaw =
    (flags.fitMatchesCurrentWebsiteFlight === true ? 30 : 0) +
    (flags.fitPriceAcknowledgedOk === true ? 5 : 0);
  const scoreFit = Math.min(35, fitRaw);

  // Intent: max of hierarchy
  const intentValues: number[] = [];
  if (flags.intentDepositPaid === true) intentValues.push(50);
  if (flags.intentPaymentDetailsSent === true) intentValues.push(35);
  if (flags.intentRequestedPaymentDetails === true) intentValues.push(25);
  if (flags.intentBookingSubmitted === true) intentValues.push(20);
  if (flags.intentBookingStarted === true) intentValues.push(10);
  if (flags.intentRouteSignupSubmitted === true) intentValues.push(5);
  const scoreIntent = intentValues.length > 0 ? Math.max(...intentValues) : 0;

  // Engagement: max of fast/slow
  const engagementValues: number[] = [];
  if (flags.engagementRespondedFast === true) engagementValues.push(15);
  if (flags.engagementRespondedSlow === true) engagementValues.push(8);
  const scoreEngagement = engagementValues.length > 0 ? Math.max(...engagementValues) : 0;

  // Negative: sum, capped at 60
  const negativeRaw =
    (flags.negativeNoContactMethod === true ? 30 : 0) +
    (flags.negativeOffNetworkRequest === true ? 25 : 0) +
    (flags.negativePriceObjection === true ? 20 : 0) +
    (flags.negativeGhostedAfterPaymentSent === true ? 15 : 0);
  const scoreNegative = Math.min(60, negativeRaw);

  // Total: clamp(0, 100, fit + intent + engagement - negative)
  let scoreTotal = Math.max(0, Math.min(100, scoreFit + scoreIntent + scoreEngagement - scoreNegative));

  // Override: deposit paid → max(total, 90)
  if (flags.intentDepositPaid === true) {
    scoreTotal = Math.max(scoreTotal, 90);
  }

  // Override: customer has flown → max(total, 95)
  if (flags.customerHasFlown === true) {
    scoreTotal = Math.max(scoreTotal, 95);
  }

  // Hard cap: no contact AND no deposit → min(total, 20)
  if (flags.negativeNoContactMethod === true && flags.intentDepositPaid !== true) {
    scoreTotal = Math.min(scoreTotal, 20);
  }

  return { scoreFit, scoreIntent, scoreEngagement, scoreNegative, scoreTotal };
}

// ─── Intent hierarchy ────────────────────────────────────────────

const INTENT_FLAGS_RANKED = [
  "intentDepositPaid",
  "intentPaymentDetailsSent",
  "intentRequestedPaymentDetails",
  "intentBookingSubmitted",
  "intentBookingStarted",
  "intentRouteSignupSubmitted",
] as const;

type IntentFlag = (typeof INTENT_FLAGS_RANKED)[number];

function enforceIntentHierarchy(
  existing: Record<string, boolean>,
  incoming: Record<string, boolean | undefined>,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  // Find which intent flag is being set to true in this update
  let setFlag: IntentFlag | null = null;
  for (const flag of INTENT_FLAGS_RANKED) {
    // eslint-disable-next-line security/detect-object-injection
    if (incoming[flag] === true) {
      setFlag = flag;
      break;
    }
  }

  if (setFlag == null) return result;

  // Untick all other intent flags
  for (const flag of INTENT_FLAGS_RANKED) {
    if (flag === setFlag) continue;
    // eslint-disable-next-line security/detect-object-injection
    if (existing[flag] === true || incoming[flag] === true) {
      // eslint-disable-next-line security/detect-object-injection
      result[flag] = false;
    }
  }

  return result;
}

function enforceEngagementExclusion(
  existing: Record<string, boolean>,
  incoming: Record<string, boolean | undefined>,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  if (incoming['engagementRespondedFast'] === true && (existing['engagementRespondedSlow'] === true || incoming['engagementRespondedSlow'] === true)) {
    result['engagementRespondedSlow'] = false;
  }
  if (incoming['engagementRespondedSlow'] === true && (existing['engagementRespondedFast'] === true || incoming['engagementRespondedFast'] === true)) {
    result['engagementRespondedFast'] = false;
  }

  return result;
}

// ─── Parent FK column resolver ───────────────────────────────────

function parentFkColumn(parentType: LeadScoreParentType): "generalLeadId" | "websiteBookingRequestId" | "routeSignupId" | "evacuationLeadId" {
  switch (parentType) {
    case "general_lead":
      return "generalLeadId";
    case "website_booking_request":
      return "websiteBookingRequestId";
    case "route_signup":
      return "routeSignupId";
    case "evacuation_lead":
      return "evacuationLeadId";
  }
}

function parentDbColumn(parentType: LeadScoreParentType): typeof leadScores.generalLeadId | typeof leadScores.websiteBookingRequestId | typeof leadScores.routeSignupId | typeof leadScores.evacuationLeadId {
  switch (parentType) {
    case "general_lead":
      return leadScores.generalLeadId;
    case "website_booking_request":
      return leadScores.websiteBookingRequestId;
    case "route_signup":
      return leadScores.routeSignupId;
    case "evacuation_lead":
      return leadScores.evacuationLeadId;
  }
}

// ─── ensureLeadScore ─────────────────────────────────────────────

export async function ensureLeadScore(
  db: DB,
  parentType: LeadScoreParentType,
  parentId: string,
): Promise<typeof leadScores.$inferSelect> {
  // Check if already exists
  const existing = await db
    .select()
    .from(leadScores)
    .where(eq(parentDbColumn(parentType), parentId));

  if (existing[0] != null) return existing[0];

  // Create new
  const now = new Date().toISOString();
  const id = createId();
  const displayId = await nextDisplayId(db, "SCO");

  const values: typeof leadScores.$inferInsert = {
    id,
    displayId,
    generalLeadId: null,
    websiteBookingRequestId: null,
    routeSignupId: null,
    evacuationLeadId: null,
    createdAt: now,
    updatedAt: now,
  };

  // Set the correct parent FK
  const fkCol = parentFkColumn(parentType);
  if (fkCol === "generalLeadId") values.generalLeadId = parentId;
  else if (fkCol === "websiteBookingRequestId") values.websiteBookingRequestId = parentId;
  else if (fkCol === "evacuationLeadId") values.evacuationLeadId = parentId;
  else values.routeSignupId = parentId;

  try {
    await db.insert(leadScores).values(values);
  } catch (e: unknown) {
    // Handle unique constraint race — re-fetch
    if (e instanceof Error && e.message.includes("UNIQUE constraint failed")) {
      const reFetched = await db
        .select()
        .from(leadScores)
        .where(eq(parentDbColumn(parentType), parentId));
      if (reFetched[0] != null) return reFetched[0];
    }
    throw e;
  }

  const created = await db
    .select()
    .from(leadScores)
    .where(eq(leadScores.id, id));

  const result = created[0];
  if (result == null) throw new Error(`Lead score ${id} not found after insert`);
  return result;
}

// ─── getLeadScore ────────────────────────────────────────────────

export async function getLeadScore(
  db: DB,
  id: string,
): Promise<typeof leadScores.$inferSelect> {
  const rows = await db
    .select()
    .from(leadScores)
    .where(eq(leadScores.id, id));

  const row = rows[0];
  if (row == null) {
    throw notFound(ERROR_CODES.LEAD_SCORE_NOT_FOUND, "Lead score not found");
  }

  return row;
}

// ─── getLeadScoreByParent ────────────────────────────────────────

export async function getLeadScoreByParent(
  db: DB,
  parentType: LeadScoreParentType,
  parentId: string,
): Promise<typeof leadScores.$inferSelect | null> {
  const rows = await db
    .select()
    .from(leadScores)
    .where(eq(parentDbColumn(parentType), parentId));

  return rows[0] ?? null;
}

// ─── listLeadScores ──────────────────────────────────────────────

export async function listLeadScores(
  db: DB,
  page: number,
  limit: number,
  filters: { band?: string; parentType?: string; q?: string },
): Promise<{
  data: (typeof leadScores.$inferSelect & { band: string; parentType: string; parentId: string; parentDisplayId: string | null })[];
  meta: { page: number; limit: number; total: number };
}> {
  const offset = (page - 1) * limit;
  const conditions: ReturnType<typeof eq>[] = [];

  // Band filter — map to score ranges
  if (filters.band === "hot") {
    conditions.push(sql`${leadScores.scoreTotal} >= 75`);
  } else if (filters.band === "warm") {
    const warmCondition = and(sql`${leadScores.scoreTotal} >= 50`, sql`${leadScores.scoreTotal} < 75`);
    if (warmCondition != null) conditions.push(warmCondition);
  } else if (filters.band === "cold") {
    conditions.push(sql`${leadScores.scoreTotal} < 50`);
  }

  // Parent type filter
  if (filters.parentType === "general_lead") {
    conditions.push(sql`${leadScores.generalLeadId} IS NOT NULL`);
  } else if (filters.parentType === "website_booking_request") {
    conditions.push(sql`${leadScores.websiteBookingRequestId} IS NOT NULL`);
  } else if (filters.parentType === "route_signup") {
    conditions.push(sql`${leadScores.routeSignupId} IS NOT NULL`);
  } else if (filters.parentType === "evacuation_lead") {
    conditions.push(sql`${leadScores.evacuationLeadId} IS NOT NULL`);
  }

  // Search filter
  if (filters.q != null) {
    const searchCondition = or(
      ilike(leadScores.displayId, `%${filters.q}%`),
    );
    if (searchCondition != null) conditions.push(searchCondition);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const pagedRows = await db
    .select({
      id: leadScores.id,
      displayId: leadScores.displayId,
      generalLeadId: leadScores.generalLeadId,
      websiteBookingRequestId: leadScores.websiteBookingRequestId,
      routeSignupId: leadScores.routeSignupId,
      evacuationLeadId: leadScores.evacuationLeadId,
      fitMatchesCurrentWebsiteFlight: leadScores.fitMatchesCurrentWebsiteFlight,
      fitPriceAcknowledgedOk: leadScores.fitPriceAcknowledgedOk,
      intentDepositPaid: leadScores.intentDepositPaid,
      intentPaymentDetailsSent: leadScores.intentPaymentDetailsSent,
      intentRequestedPaymentDetails: leadScores.intentRequestedPaymentDetails,
      intentBookingSubmitted: leadScores.intentBookingSubmitted,
      intentBookingStarted: leadScores.intentBookingStarted,
      intentRouteSignupSubmitted: leadScores.intentRouteSignupSubmitted,
      engagementRespondedFast: leadScores.engagementRespondedFast,
      engagementRespondedSlow: leadScores.engagementRespondedSlow,
      negativeNoContactMethod: leadScores.negativeNoContactMethod,
      negativeOffNetworkRequest: leadScores.negativeOffNetworkRequest,
      negativePriceObjection: leadScores.negativePriceObjection,
      negativeGhostedAfterPaymentSent: leadScores.negativeGhostedAfterPaymentSent,
      customerHasFlown: leadScores.customerHasFlown,
      scoreFit: leadScores.scoreFit,
      scoreIntent: leadScores.scoreIntent,
      scoreEngagement: leadScores.scoreEngagement,
      scoreNegative: leadScores.scoreNegative,
      scoreTotal: leadScores.scoreTotal,
      scoreUpdatedAt: leadScores.scoreUpdatedAt,
      createdAt: leadScores.createdAt,
      updatedAt: leadScores.updatedAt,
      _totalCount: sql<number>`count(*) OVER()`.mapWith(Number),
    })
    .from(leadScores)
    .where(whereClause)
    .orderBy(desc(leadScores.scoreTotal))
    .limit(limit)
    .offset(offset);

  const total = pagedRows[0]?._totalCount ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- stripping window function column from results
  const rows = pagedRows.map(({ _totalCount, ...rest }) => rest);

  // Resolve general lead display IDs from D1
  const glIds = rows.flatMap((r) => r.generalLeadId != null ? [r.generalLeadId] : []);
  const glRows = glIds.length > 0
    ? await db.select({ id: generalLeads.id, displayId: generalLeads.displayId }).from(generalLeads).where(inArray(generalLeads.id, glIds))
    : [];
  const glDisplayIdMap = new Map(glRows.map((r) => [r.id, r.displayId]));

  const data = rows.map((row) => {
    const parentType = row.generalLeadId != null
      ? "general_lead"
      : row.websiteBookingRequestId != null
        ? "website_booking_request"
        : row.evacuationLeadId != null
          ? "evacuation_lead"
          : "route_signup";
    const parentId = row.generalLeadId ?? row.websiteBookingRequestId ?? row.evacuationLeadId ?? row.routeSignupId ?? "";

    // General lead display IDs resolved here; BOR/ROU resolved at route layer
    let parentDisplayId: string | null = null;
    if (row.generalLeadId != null) {
      parentDisplayId = glDisplayIdMap.get(row.generalLeadId) ?? null;
    }

    return { ...row, band: getLeadScoreBand(row.scoreTotal), parentType, parentId, parentDisplayId };
  });

  return { data, meta: { page, limit, total } };
}

// ─── updateLeadScoreFlags ────────────────────────────────────────

export async function updateLeadScoreFlags(
  db: DB,
  id: string,
  flags: Record<string, boolean | undefined>,
): Promise<typeof leadScores.$inferSelect> {
  const existing = await db
    .select()
    .from(leadScores)
    .where(eq(leadScores.id, id));

  const row = existing[0];
  if (row == null) {
    throw notFound(ERROR_CODES.LEAD_SCORE_NOT_FOUND, "Lead score not found");
  }

  // Build existing boolean map
  const existingFlags: Record<string, boolean> = {
    fitMatchesCurrentWebsiteFlight: row.fitMatchesCurrentWebsiteFlight,
    fitPriceAcknowledgedOk: row.fitPriceAcknowledgedOk,
    intentDepositPaid: row.intentDepositPaid,
    intentPaymentDetailsSent: row.intentPaymentDetailsSent,
    intentRequestedPaymentDetails: row.intentRequestedPaymentDetails,
    intentBookingSubmitted: row.intentBookingSubmitted,
    intentBookingStarted: row.intentBookingStarted,
    intentRouteSignupSubmitted: row.intentRouteSignupSubmitted,
    engagementRespondedFast: row.engagementRespondedFast,
    engagementRespondedSlow: row.engagementRespondedSlow,
    negativeNoContactMethod: row.negativeNoContactMethod,
    negativeOffNetworkRequest: row.negativeOffNetworkRequest,
    negativePriceObjection: row.negativePriceObjection,
    negativeGhostedAfterPaymentSent: row.negativeGhostedAfterPaymentSent,
    customerHasFlown: row.customerHasFlown,
  };

  // Apply hierarchy/exclusion enforcement
  const intentOverrides = enforceIntentHierarchy(existingFlags, flags);
  const engagementOverrides = enforceEngagementExclusion(existingFlags, flags);

  // Merge: existing → incoming → hierarchy overrides → engagement overrides
  const merged: Record<string, boolean> = { ...existingFlags };
  for (const [key, val] of Object.entries(flags)) {
    if (val !== undefined) {
      // eslint-disable-next-line security/detect-object-injection
      merged[key] = val;
    }
  }
  for (const [key, val] of Object.entries(intentOverrides)) {
    // eslint-disable-next-line security/detect-object-injection
    merged[key] = val;
  }
  for (const [key, val] of Object.entries(engagementOverrides)) {
    // eslint-disable-next-line security/detect-object-injection
    merged[key] = val;
  }

  // Recompute scores
  const scores = computeLeadScore(merged);
  const now = new Date().toISOString();

  await db.update(leadScores).set({
    fitMatchesCurrentWebsiteFlight: merged['fitMatchesCurrentWebsiteFlight'] ?? false,
    fitPriceAcknowledgedOk: merged['fitPriceAcknowledgedOk'] ?? false,
    intentDepositPaid: merged['intentDepositPaid'] ?? false,
    intentPaymentDetailsSent: merged['intentPaymentDetailsSent'] ?? false,
    intentRequestedPaymentDetails: merged['intentRequestedPaymentDetails'] ?? false,
    intentBookingSubmitted: merged['intentBookingSubmitted'] ?? false,
    intentBookingStarted: merged['intentBookingStarted'] ?? false,
    intentRouteSignupSubmitted: merged['intentRouteSignupSubmitted'] ?? false,
    engagementRespondedFast: merged['engagementRespondedFast'] ?? false,
    engagementRespondedSlow: merged['engagementRespondedSlow'] ?? false,
    negativeNoContactMethod: merged['negativeNoContactMethod'] ?? false,
    negativeOffNetworkRequest: merged['negativeOffNetworkRequest'] ?? false,
    negativePriceObjection: merged['negativePriceObjection'] ?? false,
    negativeGhostedAfterPaymentSent: merged['negativeGhostedAfterPaymentSent'] ?? false,
    customerHasFlown: merged['customerHasFlown'] ?? false,
    scoreFit: scores.scoreFit,
    scoreIntent: scores.scoreIntent,
    scoreEngagement: scores.scoreEngagement,
    scoreNegative: scores.scoreNegative,
    scoreTotal: scores.scoreTotal,
    scoreUpdatedAt: now,
    updatedAt: now,
  }).where(eq(leadScores.id, id));

  const updated = await db
    .select()
    .from(leadScores)
    .where(eq(leadScores.id, id));

  const result = updated[0];
  if (result == null) throw new Error(`Lead score ${id} not found after update`);
  return result;
}
