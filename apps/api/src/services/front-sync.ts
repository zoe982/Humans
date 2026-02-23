import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activities,
  emails,
  phones,
  colleagues,
  accountHumans,
  frontSyncRuns,
  generalLeads,
  geoInterestExpressions,
  routeInterestExpressions,
} from "@humans/db/schema";
import { createId } from "@humans/db";
import { eq, sql, and } from "drizzle-orm";
import { nextDisplayId } from "../lib/display-id";
import { normalizePhone, phonesMatch } from "../lib/phone-utils";
import type { DB } from "./types";

// --- Channel classification ---

const SOCIAL_CHANNEL_IDS = new Set(["cha_lxdeo", "cha_lxdcw"]); // Facebook, Instagram
const WHATSAPP_CHANNEL_IDS = new Set([
  "cha_m1868", // US +1 202-573-8145
  "cha_m3274", // Malta +356 2034 1713
  "cha_m17mo", // Malta Go +356 7954 9994
  "cha_lxdb4", // US 15558236373
  "cha_m17ts", // UK +44 1225 266970
  "cha_m17vk", // Switzerland +41 41 563 99 98
]);
const EMAIL_CHANNEL_IDS = new Set(["cha_lxe5c", "cha_ly6sg", "cha_m7tuo"]);

type ActivityType = "email" | "whatsapp_message" | "social_message";

function classifyChannel(
  channelId: string | undefined,
  handle: string,
): ActivityType {
  if (channelId) {
    if (SOCIAL_CHANNEL_IDS.has(channelId)) return "social_message";
    if (WHATSAPP_CHANNEL_IDS.has(channelId)) return "whatsapp_message";
    if (EMAIL_CHANNEL_IDS.has(channelId)) return "email";
  }
  // Fallback: infer from handle pattern
  if (handle.includes("@")) return "email";
  if (/^\+?\d[\d\s-]{6,}$/.test(handle)) return "whatsapp_message";
  return "social_message";
}

// --- Contact matching ---

interface MatchResult {
  humanId: string | null;
  accountId: string | null;
  routeSignupId: string | null;
  websiteBookingRequestId: string | null;
  generalLeadId: string | null;
  matchedEntity: string | null; // description for logging
}

async function matchByEmail(
  db: DB,
  supabase: SupabaseClient,
  emailHandle: string,
): Promise<MatchResult> {
  const noMatch: MatchResult = {
    humanId: null,
    accountId: null,
    routeSignupId: null,
    websiteBookingRequestId: null,
    generalLeadId: null,
    matchedEntity: null,
  };
  const lowerEmail = emailHandle.toLowerCase();

  // 1. Check D1 emails table (humans)
  const allEmails = await db.select().from(emails);
  const matched = allEmails.find(
    (e) => e.email.toLowerCase() === lowerEmail && e.ownerType === "human",
  );
  if (matched) {
    const accountId = await findAccountForHuman(db, matched.ownerId);
    return {
      ...noMatch,
      humanId: matched.ownerId,
      accountId,
      matchedEntity: `human:${matched.ownerId}`,
    };
  }

  // 2. Check Supabase announcement_signups
  const { data: signups } = await supabase
    .from("announcement_signups")
    .select("id")
    .ilike("email", lowerEmail)
    .limit(1);
  const signup = signups?.[0];
  if (signup) {
    const sid = signup["id"] as string;
    return {
      ...noMatch,
      routeSignupId: sid,
      matchedEntity: `signup:${sid}`,
    };
  }

  // 3. Check D1 general_leads by email
  const allLeads = await db.select({ id: generalLeads.id, email: generalLeads.email }).from(generalLeads);
  const matchedLead = allLeads.find(
    (l) => l.email && l.email.toLowerCase() === lowerEmail,
  );
  if (matchedLead) {
    return {
      ...noMatch,
      generalLeadId: matchedLead.id,
      matchedEntity: `general_lead:${matchedLead.id}`,
    };
  }

  // 4. Check Supabase bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id")
    .or(
      `client_email.ilike.${lowerEmail},email_for_notifications.ilike.${lowerEmail}`,
    )
    .limit(1);
  const booking = bookings?.[0];
  if (booking) {
    const bid = booking["id"] as string;
    return {
      ...noMatch,
      websiteBookingRequestId: bid,
      matchedEntity: `booking:${bid}`,
    };
  }

  return noMatch;
}

async function matchByPhone(
  db: DB,
  supabase: SupabaseClient,
  phoneHandle: string,
): Promise<MatchResult> {
  const noMatch: MatchResult = {
    humanId: null,
    accountId: null,
    routeSignupId: null,
    websiteBookingRequestId: null,
    generalLeadId: null,
    matchedEntity: null,
  };

  const normalized = normalizePhone(phoneHandle);
  const suffix = normalized.slice(-9);

  // 1. Check D1 phones table (humans)
  const allPhones = await db.select().from(phones);
  const matched = allPhones.find(
    (p) => p.ownerType === "human" && phonesMatch(p.phoneNumber, phoneHandle),
  );
  if (matched) {
    const accountId = await findAccountForHuman(db, matched.ownerId);
    return {
      ...noMatch,
      humanId: matched.ownerId,
      accountId,
      matchedEntity: `human:${matched.ownerId}`,
    };
  }

  // 2. Check Supabase announcement_signups by phone/whatsapp_phone
  const { data: signups } = await supabase
    .from("announcement_signups")
    .select("id, phone, whatsapp_phone");
  if (signups) {
    const matchedSignup = signups.find((s) => {
      const phone = s["phone"] as string | null;
      const wp = s["whatsapp_phone"] as string | null;
      return (
        (phone && normalizePhone(phone).slice(-9) === suffix) ||
        (wp && normalizePhone(wp).slice(-9) === suffix)
      );
    });
    if (matchedSignup) {
      const sid = matchedSignup["id"] as string;
      return {
        ...noMatch,
        routeSignupId: sid,
        matchedEntity: `signup:${sid}`,
      };
    }
  }

  // 3. Check D1 general_leads by phone
  const allLeads = await db.select({ id: generalLeads.id, phone: generalLeads.phone }).from(generalLeads);
  const matchedLead = allLeads.find(
    (l) => l.phone && phonesMatch(l.phone, phoneHandle),
  );
  if (matchedLead) {
    return {
      ...noMatch,
      generalLeadId: matchedLead.id,
      matchedEntity: `general_lead:${matchedLead.id}`,
    };
  }

  // 4. Check Supabase bookings by phone
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, phone_number, alt_whatsapp_phone_number");
  if (bookings) {
    const matchedBooking = bookings.find((b) => {
      const phone = b["phone_number"] as string | null;
      const alt = b["alt_whatsapp_phone_number"] as string | null;
      return (
        (phone && normalizePhone(phone).slice(-9) === suffix) ||
        (alt && normalizePhone(alt).slice(-9) === suffix)
      );
    });
    if (matchedBooking) {
      const bid = matchedBooking["id"] as string;
      return {
        ...noMatch,
        websiteBookingRequestId: bid,
        matchedEntity: `booking:${bid}`,
      };
    }
  }

  return noMatch;
}

async function matchContact(
  db: DB,
  supabase: SupabaseClient,
  handle: string,
  type: ActivityType,
): Promise<MatchResult> {
  if (type === "email") {
    return matchByEmail(db, supabase, handle);
  }
  if (type === "whatsapp_message") {
    return matchByPhone(db, supabase, handle);
  }
  // social_message — try email first, then phone
  if (handle.includes("@")) {
    return matchByEmail(db, supabase, handle);
  }
  if (/\d/.test(handle)) {
    return matchByPhone(db, supabase, handle);
  }
  return {
    humanId: null,
    accountId: null,
    routeSignupId: null,
    websiteBookingRequestId: null,
    generalLeadId: null,
    matchedEntity: null,
  };
}

// --- Auto-link helpers ---

async function findAccountForHuman(
  db: DB,
  humanId: string,
): Promise<string | null> {
  const links = await db
    .select({ accountId: accountHumans.accountId })
    .from(accountHumans)
    .where(eq(accountHumans.humanId, humanId))
    .limit(1);
  return links[0]?.accountId ?? null;
}

async function findColleagueByEmail(
  db: DB,
  email: string,
): Promise<string | null> {
  const allColleagues = await db
    .select({ id: colleagues.id, email: colleagues.email })
    .from(colleagues);
  const match = allColleagues.find(
    (c) => c.email.toLowerCase() === email.toLowerCase(),
  );
  return match?.id ?? null;
}

// --- Front API helpers ---

interface FrontPagination {
  next?: string | null;
}

interface FrontMessage {
  id: string;
  type: string;
  is_inbound: boolean;
  is_draft: boolean;
  created_at: number;
  blurb: string;
  body: string;
  text: string;
  author?: { handle: string; name?: string };
  recipients: { handle: string; role: string }[];
}

interface FrontConversation {
  id: string;
  subject: string;
  recipient?: { handle: string; name?: string };
  last_message?: { created_at: number };
  _links?: { related?: { messages?: { href: string } } };
}

async function frontFetch<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Front API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// --- Sync logic ---

export interface SyncStats {
  total: number;
  imported: number;
  skipped: number;
  unmatched: number;
  errors: string[];
  linkedToHumans: number;
  linkedToAccounts: number;
  linkedToRouteSignups: number;
  linkedToBookings: number;
  linkedToColleagues: number;
  linkedToGeneralLeads: number;
}

export interface SyncResult extends SyncStats {
  nextCursor: string | null;
  syncRunId: string;
}

function emptySyncStats(): SyncStats {
  return {
    total: 0,
    imported: 0,
    skipped: 0,
    unmatched: 0,
    errors: [],
    linkedToHumans: 0,
    linkedToAccounts: 0,
    linkedToRouteSignups: 0,
    linkedToBookings: 0,
    linkedToColleagues: 0,
    linkedToGeneralLeads: 0,
  };
}

function mergeStats(target: SyncStats, source: SyncStats) {
  target.total += source.total;
  target.imported += source.imported;
  target.skipped += source.skipped;
  target.unmatched += source.unmatched;
  target.errors.push(...source.errors);
  target.linkedToHumans += source.linkedToHumans;
  target.linkedToAccounts += source.linkedToAccounts;
  target.linkedToRouteSignups += source.linkedToRouteSignups;
  target.linkedToBookings += source.linkedToBookings;
  target.linkedToColleagues += source.linkedToColleagues;
  target.linkedToGeneralLeads += source.linkedToGeneralLeads;
}

/** Process a single conversation and its messages, creating activities. */
async function processConversation(
  db: DB,
  supabase: SupabaseClient,
  frontToken: string,
  conversation: FrontConversation,
  syncRunId: string,
  existingFrontIds: Set<string>,
): Promise<SyncStats> {
  const stats = emptySyncStats();

  // Fetch all messages for this conversation
  const messagesUrl = `https://api2.frontapp.com/conversations/${conversation.id}/messages`;
  const msgResponse = await frontFetch<{
    _results: FrontMessage[];
    _pagination: FrontPagination;
  }>(messagesUrl, frontToken);

  // Determine the contact handle from the conversation
  const contactHandle = conversation.recipient?.handle ?? "";

  // Classify by handle pattern
  const activityType = classifyChannel(undefined, contactHandle);

  // Match contact
  const match = await matchContact(db, supabase, contactHandle, activityType);

  for (const message of msgResponse._results) {
    stats.total++;

    // Skip drafts
    if (message.is_draft) {
      stats.skipped++;
      continue;
    }

    // Idempotency: skip if this message ID already exists
    if (existingFrontIds.has(message.id)) {
      stats.skipped++;
      continue;
    }

    // Auto-link colleague based on message author
    let colleagueId: string | null = null;
    if (!message.is_inbound && message.author?.handle) {
      colleagueId = await findColleagueByEmail(db, message.author.handle);
    } else if (message.is_inbound) {
      for (const recipient of message.recipients) {
        if (recipient.role === "to" || recipient.role === "cc") {
          const cid = await findColleagueByEmail(db, recipient.handle);
          if (cid) {
            colleagueId = cid;
            break;
          }
        }
      }
    }

    // Build notes with metadata
    const direction = message.is_inbound ? "Inbound" : "Outbound";
    const authorInfo = message.author?.name ?? message.author?.handle ?? "Unknown";
    const contactName = conversation.recipient?.name ?? contactHandle;
    const noteLines: string[] = [];

    if (!match.matchedEntity) {
      noteLines.push(`[UNMATCHED] Contact: ${contactName} (${contactHandle})`);
      stats.unmatched++;
    }

    noteLines.push(`${direction} from ${authorInfo}`);
    if (message.text) {
      noteLines.push(message.text);
    } else if (message.blurb) {
      noteLines.push(message.blurb);
    }

    const subject =
      conversation.subject ||
      `${activityType === "email" ? "Email" : activityType === "whatsapp_message" ? "WhatsApp" : "Social"} conversation`;
    const activityDate = new Date(message.created_at * 1000).toISOString();
    const displayId = await nextDisplayId(db, "ACT");

    const activity = {
      id: createId(),
      displayId,
      type: activityType,
      subject: subject.slice(0, 500),
      body: message.text || message.blurb || null,
      notes: noteLines.join("\n"),
      activityDate,
      humanId: match.humanId,
      accountId: match.accountId,
      routeSignupId: match.routeSignupId,
      websiteBookingRequestId: match.websiteBookingRequestId,
      generalLeadId: match.generalLeadId,
      gmailId: null,
      frontId: message.id,
      frontConversationId: conversation.id,
      frontContactHandle: contactHandle || null,
      syncRunId,
      colleagueId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(activities).values(activity);
    existingFrontIds.add(message.id);
    stats.imported++;

    // Track linking stats
    if (match.humanId) stats.linkedToHumans++;
    if (match.accountId) stats.linkedToAccounts++;
    if (match.routeSignupId) stats.linkedToRouteSignups++;
    if (match.websiteBookingRequestId) stats.linkedToBookings++;
    if (match.generalLeadId) stats.linkedToGeneralLeads++;
    if (colleagueId) stats.linkedToColleagues++;
  }

  return stats;
}

/** Flush accumulated stats to the sync run record in D1. */
async function updateSyncRunStats(
  db: DB,
  syncRunId: string,
  stats: SyncStats,
  markComplete: boolean,
) {
  await db
    .update(frontSyncRuns)
    .set({
      ...(markComplete
        ? { status: "completed" as const, completedAt: new Date().toISOString() }
        : {}),
      totalMessages: sql`${frontSyncRuns.totalMessages} + ${stats.total}`,
      imported: sql`${frontSyncRuns.imported} + ${stats.imported}`,
      skipped: sql`${frontSyncRuns.skipped} + ${stats.skipped}`,
      unmatched: sql`${frontSyncRuns.unmatched} + ${stats.unmatched}`,
      errorCount: sql`${frontSyncRuns.errorCount} + ${stats.errors.length}`,
      errorMessages:
        stats.errors.length > 0
          ? JSON.stringify(stats.errors)
          : undefined,
      linkedToHumans: sql`${frontSyncRuns.linkedToHumans} + ${stats.linkedToHumans}`,
      linkedToAccounts: sql`${frontSyncRuns.linkedToAccounts} + ${stats.linkedToAccounts}`,
      linkedToRouteSignups: sql`${frontSyncRuns.linkedToRouteSignups} + ${stats.linkedToRouteSignups}`,
      linkedToBookings: sql`${frontSyncRuns.linkedToBookings} + ${stats.linkedToBookings}`,
      linkedToColleagues: sql`${frontSyncRuns.linkedToColleagues} + ${stats.linkedToColleagues}`,
      linkedToGeneralLeads: sql`${frontSyncRuns.linkedToGeneralLeads} + ${stats.linkedToGeneralLeads}`,
    })
    .where(eq(frontSyncRuns.id, syncRunId));
}

/** Create a new sync run record and return its ID. */
export async function createSyncRun(
  db: DB,
  initiatedByColleagueId: string | null,
): Promise<string> {
  const syncRunId = createId();
  const displayId = await nextDisplayId(db, "FRY");
  await db.insert(frontSyncRuns).values({
    id: syncRunId,
    displayId,
    status: "running",
    startedAt: new Date().toISOString(),
    initiatedByColleagueId,
    createdAt: new Date().toISOString(),
  });
  return syncRunId;
}

/** Manual sync: processes one page of conversations (called by admin UI). */
export async function syncFrontConversations(
  db: DB,
  supabase: SupabaseClient,
  frontToken: string,
  initiatedByColleagueId: string,
  cursor?: string,
  limit = 20,
  existingSyncRunId?: string,
): Promise<SyncResult> {
  const syncRunId = existingSyncRunId ?? await createSyncRun(db, initiatedByColleagueId);

  const result: SyncResult = {
    ...emptySyncStats(),
    nextCursor: null,
    syncRunId,
  };

  try {
    const conversationsUrl =
      cursor ?? `https://api2.frontapp.com/conversations?limit=${limit}`;
    const convResponse = await frontFetch<{
      _results: FrontConversation[];
      _pagination: FrontPagination;
    }>(conversationsUrl, frontToken);

    result.nextCursor = convResponse._pagination.next ?? null;

    // Pre-fetch existing frontIds for idempotency check
    const existingActivities = await db
      .select({ frontId: activities.frontId })
      .from(activities);
    const existingFrontIds = new Set(
      existingActivities.map((a) => a.frontId).filter(Boolean),
    );

    for (const conversation of convResponse._results) {
      try {
        const convStats = await processConversation(
          db, supabase, frontToken, conversation, syncRunId, existingFrontIds,
        );
        mergeStats(result, convStats);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Conversation ${conversation.id}: ${msg}`);
      }
    }

    const isComplete = result.nextCursor == null;
    await updateSyncRunStats(db, syncRunId, result, isComplete);
  } catch (err) {
    await db
      .update(frontSyncRuns)
      .set({
        status: "failed",
        completedAt: new Date().toISOString(),
        errorCount: 1,
        errorMessages: JSON.stringify([
          err instanceof Error ? err.message : String(err),
        ]),
      })
      .where(eq(frontSyncRuns.id, syncRunId));
    throw err;
  }

  return result;
}

/** Incremental sync: auto-pages through recent conversations (called by cron). */
export async function syncFrontConversationsIncremental(
  db: DB,
  supabase: SupabaseClient,
  frontToken: string,
): Promise<SyncResult> {
  const syncRunId = await createSyncRun(db, null);
  const result: SyncResult = {
    ...emptySyncStats(),
    nextCursor: null,
    syncRunId,
  };

  const startTime = Date.now();
  const WALL_CLOCK_LIMIT_MS = 25_000; // 25s safety valve

  try {
    // Determine updated_after from last completed sync run
    const lastRun = await db
      .select({ startedAt: frontSyncRuns.startedAt })
      .from(frontSyncRuns)
      .where(and(eq(frontSyncRuns.status, "completed"), sql`${frontSyncRuns.id} != ${syncRunId}`))
      .orderBy(sql`${frontSyncRuns.startedAt} DESC`)
      .limit(1);

    const updatedAfter = lastRun[0]
      ? Math.floor(new Date(lastRun[0].startedAt).getTime() / 1000)
      : Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

    // Pre-fetch existing frontIds for idempotency check
    const existingActivities = await db
      .select({ frontId: activities.frontId })
      .from(activities);
    const existingFrontIds = new Set(
      existingActivities.map((a) => a.frontId).filter(Boolean),
    );

    let nextUrl: string | null = `https://api2.frontapp.com/conversations?limit=20&q[updated_after]=${updatedAfter}`;

    while (nextUrl) {
      // Wall-clock safety valve
      if (Date.now() - startTime > WALL_CLOCK_LIMIT_MS) {
        break;
      }

      const convResponse = await frontFetch<{
        _results: FrontConversation[];
        _pagination: FrontPagination;
      }>(nextUrl, frontToken);

      for (const conversation of convResponse._results) {
        if (Date.now() - startTime > WALL_CLOCK_LIMIT_MS) break;

        try {
          const convStats = await processConversation(
            db, supabase, frontToken, conversation, syncRunId, existingFrontIds,
          );
          mergeStats(result, convStats);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          result.errors.push(`Conversation ${conversation.id}: ${msg}`);
        }
      }

      nextUrl = convResponse._pagination.next ?? null;
    }

    await updateSyncRunStats(db, syncRunId, result, true);
  } catch (err) {
    await db
      .update(frontSyncRuns)
      .set({
        status: "failed",
        completedAt: new Date().toISOString(),
        errorCount: 1,
        errorMessages: JSON.stringify([
          err instanceof Error ? err.message : String(err),
        ]),
      })
      .where(eq(frontSyncRuns.id, syncRunId));
    // Don't throw in cron context — just mark as failed
  }

  return result;
}

// --- Sync run management ---

export async function listSyncRuns(db: DB) {
  const runs = await db
    .select({
      id: frontSyncRuns.id,
      displayId: frontSyncRuns.displayId,
      status: frontSyncRuns.status,
      startedAt: frontSyncRuns.startedAt,
      completedAt: frontSyncRuns.completedAt,
      totalMessages: frontSyncRuns.totalMessages,
      imported: frontSyncRuns.imported,
      skipped: frontSyncRuns.skipped,
      unmatched: frontSyncRuns.unmatched,
      errorCount: frontSyncRuns.errorCount,
      errorMessages: frontSyncRuns.errorMessages,
      linkedToHumans: frontSyncRuns.linkedToHumans,
      linkedToAccounts: frontSyncRuns.linkedToAccounts,
      linkedToRouteSignups: frontSyncRuns.linkedToRouteSignups,
      linkedToBookings: frontSyncRuns.linkedToBookings,
      linkedToColleagues: frontSyncRuns.linkedToColleagues,
      linkedToGeneralLeads: frontSyncRuns.linkedToGeneralLeads,
      initiatedByColleagueId: frontSyncRuns.initiatedByColleagueId,
      initiatedByName: colleagues.name,
      createdAt: frontSyncRuns.createdAt,
    })
    .from(frontSyncRuns)
    .leftJoin(colleagues, eq(frontSyncRuns.initiatedByColleagueId, colleagues.id))
    .orderBy(frontSyncRuns.startedAt);
  // Reverse for desc order (D1 doesn't always support desc well)
  return runs.reverse();
}

export async function getSyncRun(db: DB, id: string) {
  const run = await db.query.frontSyncRuns.findFirst({
    where: eq(frontSyncRuns.id, id),
  });
  return run ?? null;
}

export async function revertSyncRun(db: DB, syncRunId: string) {
  const run = await db.query.frontSyncRuns.findFirst({
    where: eq(frontSyncRuns.id, syncRunId),
  });
  if (!run) return { deleted: 0, skipped: 0, error: "Sync run not found" };
  if (run.status === "reverted")
    return { deleted: 0, skipped: 0, error: "Already reverted" };

  // Find all activities from this sync run
  const syncActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.syncRunId, syncRunId));

  let deleted = 0;
  let skipped = 0;

  for (const activity of syncActivities) {
    // Skip activities that have been modified since import
    if (activity.updatedAt !== activity.createdAt) {
      skipped++;
      continue;
    }

    // Nullify activityId on any geo-interest or route-interest expressions
    await db
      .update(geoInterestExpressions)
      .set({ activityId: null })
      .where(eq(geoInterestExpressions.activityId, activity.id));
    await db
      .update(routeInterestExpressions)
      .set({ activityId: null })
      .where(eq(routeInterestExpressions.activityId, activity.id));

    await db.delete(activities).where(eq(activities.id, activity.id));
    deleted++;
  }

  // Update sync run status
  await db
    .update(frontSyncRuns)
    .set({ status: "reverted" })
    .where(eq(frontSyncRuns.id, syncRunId));

  return { deleted, skipped };
}
