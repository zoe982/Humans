import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activities,
  emails,
  phones,
  colleagues,
  accountHumans,
  frontSyncRuns,
  generalLeads,
  humans,
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

// --- Cached reference data (fixes subrequest limits) ---

interface CachedReferenceData {
  allEmails: Array<{ id: string; email: string; ownerType: string; ownerId: string }>;
  allPhones: Array<{ id: string; phoneNumber: string; ownerType: string; ownerId: string }>;
  allColleagues: Array<{ id: string; email: string }>;
  allLeads: Array<{ id: string; email: string | null; phone: string | null }>;
  allAccountHumans: Array<{ accountId: string; humanId: string }>;
  allSignups: Array<{ id: string; email?: string; phone?: string; whatsapp_phone?: string }>;
  allBookings: Array<{ id: string; client_email?: string; email_for_notifications?: string; phone_number?: string; alt_whatsapp_phone_number?: string }>;
  humanNames: Map<string, { firstName: string; lastName: string; displayId: string }>;
}

async function preloadReferenceData(db: DB, supabase: SupabaseClient): Promise<CachedReferenceData> {
  const [
    emailRows,
    phoneRows,
    colleagueRows,
    leadRows,
    accountHumanRows,
    signupsResult,
    bookingsResult,
    humanRows,
  ] = await Promise.all([
    db.select({ id: emails.id, email: emails.email, ownerType: emails.ownerType, ownerId: emails.ownerId }).from(emails),
    db.select({ id: phones.id, phoneNumber: phones.phoneNumber, ownerType: phones.ownerType, ownerId: phones.ownerId }).from(phones),
    db.select({ id: colleagues.id, email: colleagues.email }).from(colleagues),
    db.select({ id: generalLeads.id, email: generalLeads.email, phone: generalLeads.phone }).from(generalLeads),
    db.select({ accountId: accountHumans.accountId, humanId: accountHumans.humanId }).from(accountHumans),
    supabase.from("announcement_signups").select("id, email, phone, whatsapp_phone"),
    supabase.from("bookings").select("id, client_email, email_for_notifications, phone_number, alt_whatsapp_phone_number"),
    db.select({ id: humans.id, firstName: humans.firstName, lastName: humans.lastName, displayId: humans.displayId }).from(humans),
  ]);

  const humanNames = new Map<string, { firstName: string; lastName: string; displayId: string }>();
  for (const h of humanRows) {
    humanNames.set(h.id, { firstName: h.firstName, lastName: h.lastName, displayId: h.displayId });
  }

  return {
    allEmails: emailRows,
    allPhones: phoneRows,
    allColleagues: colleagueRows,
    allLeads: leadRows,
    allAccountHumans: accountHumanRows,
    allSignups: (signupsResult.data ?? []) as CachedReferenceData["allSignups"],
    allBookings: (bookingsResult.data ?? []) as CachedReferenceData["allBookings"],
    humanNames,
  };
}

// --- Contact matching (sync, uses cache) ---

interface MatchResult {
  humanId: string | null;
  accountId: string | null;
  routeSignupId: string | null;
  websiteBookingRequestId: string | null;
  generalLeadId: string | null;
  matchedEntity: string | null; // description for logging
}

const NO_MATCH: MatchResult = {
  humanId: null,
  accountId: null,
  routeSignupId: null,
  websiteBookingRequestId: null,
  generalLeadId: null,
  matchedEntity: null,
};

function findAccountForHuman(cache: CachedReferenceData, humanId: string): string | null {
  const link = cache.allAccountHumans.find((ah) => ah.humanId === humanId);
  return link?.accountId ?? null;
}

function findColleagueByEmail(cache: CachedReferenceData, email: string): string | null {
  const match = cache.allColleagues.find(
    (c) => c.email.toLowerCase() === email.toLowerCase(),
  );
  return match?.id ?? null;
}

function matchByEmail(cache: CachedReferenceData, emailHandle: string): MatchResult {
  const lowerEmail = emailHandle.toLowerCase();

  // 1. Check D1 emails table (humans)
  const matched = cache.allEmails.find(
    (e) => e.email.toLowerCase() === lowerEmail && e.ownerType === "human",
  );
  if (matched) {
    const accountId = findAccountForHuman(cache, matched.ownerId);
    return {
      ...NO_MATCH,
      humanId: matched.ownerId,
      accountId,
      matchedEntity: `human:${matched.ownerId}`,
    };
  }

  // 2. Check Supabase announcement_signups
  const signup = cache.allSignups.find(
    (s) => s.email && s.email.toLowerCase() === lowerEmail,
  );
  if (signup) {
    return {
      ...NO_MATCH,
      routeSignupId: signup.id,
      matchedEntity: `signup:${signup.id}`,
    };
  }

  // 3. Check D1 general_leads by email
  const matchedLead = cache.allLeads.find(
    (l) => l.email && l.email.toLowerCase() === lowerEmail,
  );
  if (matchedLead) {
    return {
      ...NO_MATCH,
      generalLeadId: matchedLead.id,
      matchedEntity: `general_lead:${matchedLead.id}`,
    };
  }

  // 4. Check Supabase bookings
  const booking = cache.allBookings.find(
    (b) =>
      (b.client_email && b.client_email.toLowerCase() === lowerEmail) ||
      (b.email_for_notifications && b.email_for_notifications.toLowerCase() === lowerEmail),
  );
  if (booking) {
    return {
      ...NO_MATCH,
      websiteBookingRequestId: booking.id,
      matchedEntity: `booking:${booking.id}`,
    };
  }

  return NO_MATCH;
}

function matchByPhone(cache: CachedReferenceData, phoneHandle: string): MatchResult {
  const normalized = normalizePhone(phoneHandle);
  const suffix = normalized.slice(-9);

  // 1. Check D1 phones table (humans)
  const matched = cache.allPhones.find(
    (p) => p.ownerType === "human" && phonesMatch(p.phoneNumber, phoneHandle),
  );
  if (matched) {
    const accountId = findAccountForHuman(cache, matched.ownerId);
    return {
      ...NO_MATCH,
      humanId: matched.ownerId,
      accountId,
      matchedEntity: `human:${matched.ownerId}`,
    };
  }

  // 2. Check Supabase announcement_signups by phone/whatsapp_phone
  const matchedSignup = cache.allSignups.find((s) => {
    const phone = s.phone;
    const wp = s.whatsapp_phone;
    return (
      (phone && normalizePhone(phone).slice(-9) === suffix) ||
      (wp && normalizePhone(wp).slice(-9) === suffix)
    );
  });
  if (matchedSignup) {
    return {
      ...NO_MATCH,
      routeSignupId: matchedSignup.id,
      matchedEntity: `signup:${matchedSignup.id}`,
    };
  }

  // 3. Check D1 general_leads by phone
  const matchedLead = cache.allLeads.find(
    (l) => l.phone && phonesMatch(l.phone, phoneHandle),
  );
  if (matchedLead) {
    return {
      ...NO_MATCH,
      generalLeadId: matchedLead.id,
      matchedEntity: `general_lead:${matchedLead.id}`,
    };
  }

  // 4. Check Supabase bookings by phone
  const matchedBooking = cache.allBookings.find((b) => {
    const phone = b.phone_number;
    const alt = b.alt_whatsapp_phone_number;
    return (
      (phone && normalizePhone(phone).slice(-9) === suffix) ||
      (alt && normalizePhone(alt).slice(-9) === suffix)
    );
  });
  if (matchedBooking) {
    return {
      ...NO_MATCH,
      websiteBookingRequestId: matchedBooking.id,
      matchedEntity: `booking:${matchedBooking.id}`,
    };
  }

  return NO_MATCH;
}

function matchContact(
  cache: CachedReferenceData,
  handle: string,
  type: ActivityType,
): MatchResult {
  if (type === "email") {
    return matchByEmail(cache, handle);
  }
  if (type === "whatsapp_message") {
    return matchByPhone(cache, handle);
  }
  // social_message — try email first, then phone
  if (handle.includes("@")) {
    return matchByEmail(cache, handle);
  }
  if (/\d/.test(handle)) {
    return matchByPhone(cache, handle);
  }
  return NO_MATCH;
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

async function frontPostComment(token: string, conversationId: string, body: string): Promise<void> {
  const res = await fetch(`https://api2.frontapp.com/conversations/${conversationId}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Front comment API ${res.status}: ${text}`);
  }
}

// --- Sync logic ---

export interface UnmatchedContact {
  handle: string;
  name: string | null;
  conversationId: string;
  conversationSubject: string;
  type: ActivityType;
  messageCount: number;
}

export interface SyncStats {
  total: number;
  imported: number;
  skipped: number;
  unmatched: number;
  errors: string[];
  unmatchedContacts: UnmatchedContact[];
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
    unmatchedContacts: [],
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
  target.unmatchedContacts.push(...source.unmatchedContacts);
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
  cache: CachedReferenceData,
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
  const match = matchContact(cache, contactHandle, activityType);

  // If no match, skip entire conversation and record unmatched contact
  if (!match.matchedEntity) {
    // Count new (non-draft, non-existing) messages that would have been imported
    let newMessageCount = 0;
    for (const message of msgResponse._results) {
      stats.total++;
      if (message.is_draft || existingFrontIds.has(message.id)) {
        stats.skipped++;
      } else {
        newMessageCount++;
        stats.unmatched++;
      }
    }

    if (newMessageCount > 0) {
      stats.unmatchedContacts.push({
        handle: contactHandle,
        name: conversation.recipient?.name ?? null,
        conversationId: conversation.id,
        conversationSubject: conversation.subject || "(no subject)",
        type: activityType,
        messageCount: newMessageCount,
      });
    }

    return stats;
  }

  const importedDisplayIds: string[] = [];

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
      colleagueId = findColleagueByEmail(cache, message.author.handle);
    } else if (message.is_inbound) {
      for (const recipient of message.recipients) {
        if (recipient.role === "to" || recipient.role === "cc") {
          const cid = findColleagueByEmail(cache, recipient.handle);
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
    const noteLines: string[] = [];

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
    importedDisplayIds.push(displayId);

    // Track linking stats
    if (match.humanId) stats.linkedToHumans++;
    if (match.accountId) stats.linkedToAccounts++;
    if (match.routeSignupId) stats.linkedToRouteSignups++;
    if (match.websiteBookingRequestId) stats.linkedToBookings++;
    if (match.generalLeadId) stats.linkedToGeneralLeads++;
    if (colleagueId) stats.linkedToColleagues++;
  }

  // Comment writeback to Front
  if (importedDisplayIds.length > 0) {
    const actIds = importedDisplayIds.join(", ");
    let commentBody = `Synced to Humans CRM: ${actIds}`;
    if (match.humanId) {
      const human = cache.humanNames.get(match.humanId);
      if (human) {
        commentBody += `\nLinked to: ${human.firstName} ${human.lastName} (${human.displayId})`;
      }
    }
    frontPostComment(frontToken, conversation.id, commentBody).catch((err) => {
      console.warn(`Failed to post Front comment for ${conversation.id}:`, err);
    });
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
  // Read-append-write for unmatchedContacts (multiple pages may contribute)
  let unmatchedContactsJson: string | undefined;
  if (stats.unmatchedContacts.length > 0) {
    const existing = await db
      .select({ unmatchedContacts: frontSyncRuns.unmatchedContacts })
      .from(frontSyncRuns)
      .where(eq(frontSyncRuns.id, syncRunId))
      .limit(1);
    const prev: UnmatchedContact[] = existing[0]?.unmatchedContacts
      ? JSON.parse(existing[0].unmatchedContacts)
      : [];
    unmatchedContactsJson = JSON.stringify([...prev, ...stats.unmatchedContacts]);
  }

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
      unmatchedContacts: unmatchedContactsJson,
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
    // Preload all reference data once
    const cache = await preloadReferenceData(db, supabase);

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
          db, cache, frontToken, conversation, syncRunId, existingFrontIds,
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
    // Preload all reference data once
    const cache = await preloadReferenceData(db, supabase);

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

    let nextUrl: string | null = `https://api2.frontapp.com/conversations?limit=10&q[updated_after]=${updatedAfter}`;

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
            db, cache, frontToken, conversation, syncRunId, existingFrontIds,
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
      unmatchedContacts: frontSyncRuns.unmatchedContacts,
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
