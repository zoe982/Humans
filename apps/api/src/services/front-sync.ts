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
  socialIds,
  geoInterestExpressions,
  routeInterestExpressions,
} from "@humans/db/schema";
import { createId } from "@humans/db";
import { eq, sql, and, isNull, isNotNull } from "drizzle-orm";
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

export function classifyChannel(
  channelId: string | undefined,
  handle: string,
  messageType?: string,
): ActivityType {
  // Priority 1: Known channel ID
  if (channelId != null) {
    if (SOCIAL_CHANNEL_IDS.has(channelId)) return "social_message";
    if (WHATSAPP_CHANNEL_IDS.has(channelId)) return "whatsapp_message";
    if (EMAIL_CHANNEL_IDS.has(channelId)) return "email";
  }
  // Priority 2: Front message type field
  if (messageType === "email") return "email";
  if (messageType === "custom") {
    if (/^\+?\d[\d\s-]{6,}$/.test(handle)) return "whatsapp_message";
    return "social_message";
  }
  // Fallback: infer from handle pattern
  if (handle.includes("@")) return "email";
  if (/^\+?\d[\d\s-]{6,}$/.test(handle)) return "whatsapp_message";
  return "social_message";
}

// --- Author name resolution ---

/**
 * Resolve the human-readable author name for a Front message.
 * Fallback chain:
 * 1. message.author.name
 * 2. message.author.handle → colleague name (outbound) or raw handle
 * 3. recipients "from" role name
 * 4. recipients "from" role handle → colleague name (outbound) or raw handle
 * 5. conversation.recipient.name (inbound only)
 * 6. "Unknown"
 */
export function resolveAuthorName(
  message: {
    is_inbound: boolean;
    author?: { handle: string; name?: string };
    recipients: { handle: string; role: string; name?: string }[];
  },
  conversation: { recipient?: { handle: string; name?: string } },
  colleagues: { id: string; email: string; name: string }[],
): string {
  // 1. message.author.name
  if (message.author?.name != null && message.author.name !== "") {
    return message.author.name;
  }

  // 2. message.author.handle → colleague name or raw handle
  if (message.author?.handle != null && message.author.handle !== "") {
    const authorHandle = message.author.handle;
    const colleague = colleagues.find(
      (c) => c.email.toLowerCase() === authorHandle.toLowerCase(),
    );
    if (colleague != null) return colleague.name;
    return message.author.handle;
  }

  // 3. recipients "from" role name
  const fromRecipient = message.recipients.find((r) => r.role === "from");
  if (fromRecipient?.name != null && fromRecipient.name !== "") {
    return fromRecipient.name;
  }

  // 4. recipients "from" role handle → colleague name or raw handle
  if (fromRecipient?.handle != null && fromRecipient.handle !== "") {
    const colleague = colleagues.find(
      (c) => c.email.toLowerCase() === fromRecipient.handle.toLowerCase(),
    );
    if (colleague != null) return colleague.name;
    return fromRecipient.handle;
  }

  // 5. conversation.recipient.name (inbound only)
  if (message.is_inbound && conversation.recipient?.name != null && conversation.recipient.name !== "") {
    return conversation.recipient.name;
  }

  // 6. Fallback
  return "Unknown";
}

// --- Cached reference data (fixes subrequest limits) ---

interface CachedReferenceData {
  allEmails: { id: string; email: string; ownerType: string; ownerId: string }[];
  allPhones: { id: string; phoneNumber: string; ownerType: string; ownerId: string }[];
  allColleagues: { id: string; email: string; name: string }[];
  allLeads: { id: string; email: string | null; phone: string | null }[];
  allAccountHumans: { accountId: string; humanId: string }[];
  allSignups: { id: string; email?: string | null; phone?: string | null; whatsapp_phone?: string | null }[];
  allBookings: { id: string; client_email?: string | null; email_for_notifications?: string | null; phone_number?: string | null; alt_whatsapp_phone_number?: string | null }[];
  allSocialIds: { id: string; handle: string; humanId: string | null; accountId: string | null }[];
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
    socialIdRows,
  ] = await Promise.all([
    db.select({ id: emails.id, email: emails.email, ownerType: emails.ownerType, ownerId: emails.ownerId }).from(emails),
    db.select({ id: phones.id, phoneNumber: phones.phoneNumber, ownerType: phones.ownerType, ownerId: phones.ownerId }).from(phones),
    db.select({ id: colleagues.id, email: colleagues.email, name: colleagues.name }).from(colleagues),
    db.select({ id: generalLeads.id, email: generalLeads.email, phone: generalLeads.phone }).from(generalLeads),
    db.select({ accountId: accountHumans.accountId, humanId: accountHumans.humanId }).from(accountHumans),
    supabase.from("announcement_signups").select("id, email, phone, whatsapp_phone"),
    supabase.from("bookings").select("id, client_email, email_for_notifications, phone_number, alt_whatsapp_phone_number"),
    db.select({ id: humans.id, firstName: humans.firstName, lastName: humans.lastName, displayId: humans.displayId }).from(humans),
    db.select({ id: socialIds.id, handle: socialIds.handle, humanId: socialIds.humanId, accountId: socialIds.accountId }).from(socialIds),
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
    allSocialIds: socialIdRows,
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

function findColleagueIdByEmail(
  colleagueRows: { id: string; email: string; name: string }[],
  email: string,
): string | null {
  const match = colleagueRows.find(
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
  if (matched != null) {
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
    (s) => s.email?.toLowerCase() === lowerEmail,
  );
  if (signup != null) {
    return {
      ...NO_MATCH,
      routeSignupId: signup.id,
      matchedEntity: `signup:${signup.id}`,
    };
  }

  // 3. Check D1 general_leads by email
  const matchedLead = cache.allLeads.find(
    (l) => l.email?.toLowerCase() === lowerEmail,
  );
  if (matchedLead != null) {
    return {
      ...NO_MATCH,
      generalLeadId: matchedLead.id,
      matchedEntity: `general_lead:${matchedLead.id}`,
    };
  }

  // 4. Check Supabase bookings
  const booking = cache.allBookings.find(
    (b) =>
      b.client_email?.toLowerCase() === lowerEmail ||
      b.email_for_notifications?.toLowerCase() === lowerEmail,
  );
  if (booking != null) {
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
  if (matched != null) {
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
      (phone != null && normalizePhone(phone).slice(-9) === suffix) ||
      (wp != null && normalizePhone(wp).slice(-9) === suffix)
    );
  });
  if (matchedSignup != null) {
    return {
      ...NO_MATCH,
      routeSignupId: matchedSignup.id,
      matchedEntity: `signup:${matchedSignup.id}`,
    };
  }

  // 3. Check D1 general_leads by phone
  const matchedLead = cache.allLeads.find(
    (l) => l.phone != null && phonesMatch(l.phone, phoneHandle),
  );
  if (matchedLead != null) {
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
      (phone != null && normalizePhone(phone).slice(-9) === suffix) ||
      (alt != null && normalizePhone(alt).slice(-9) === suffix)
    );
  });
  if (matchedBooking != null) {
    return {
      ...NO_MATCH,
      websiteBookingRequestId: matchedBooking.id,
      matchedEntity: `booking:${matchedBooking.id}`,
    };
  }

  return NO_MATCH;
}

function normalizeSocialHandle(handle: string): string {
  return handle.replace(/^@/, "").toLowerCase();
}

function matchBySocialId(cache: CachedReferenceData, handle: string): MatchResult {
  const normalized = normalizeSocialHandle(handle);
  const match = cache.allSocialIds.find(
    (s) => normalizeSocialHandle(s.handle) === normalized,
  );
  if (match == null) return NO_MATCH;
  if (match.humanId == null) return NO_MATCH;

  const accountId = match.accountId ?? findAccountForHuman(cache, match.humanId);
  return {
    ...NO_MATCH,
    humanId: match.humanId,
    accountId,
    matchedEntity: `human:${match.humanId}`,
  };
}

function matchContact(
  cache: CachedReferenceData,
  handle: string,
  type: ActivityType,
): MatchResult {
  // Try type-specific match first
  let result: MatchResult = NO_MATCH;

  if (type === "email") {
    result = matchByEmail(cache, handle);
  } else if (type === "whatsapp_message") {
    result = matchByPhone(cache, handle);
  } else {
    // social_message — try email first, then phone
    if (handle.includes("@")) {
      result = matchByEmail(cache, handle);
    }
    if (result.matchedEntity == null && /\d/.test(handle)) {
      result = matchByPhone(cache, handle);
    }
  }

  // Universal fallback: try social IDs
  if (result.matchedEntity == null) {
    result = matchBySocialId(cache, handle);
  }

  return result;
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
  recipients: { handle: string; role: string; name?: string }[];
}

interface FrontConversation {
  id: string;
  subject: string;
  recipient?: { handle: string; name?: string };
  last_message?: { created_at: number };
  _links?: { related?: { messages?: { href: string } } };
}

interface FrontPaginatedResponse<T> {
  _results: T[];
  _pagination: FrontPagination;
}

async function frontFetch(url: string, token: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Front API ${res.status.toString()}: ${text}`);
  }
  const text = await res.text();
  const parsed: unknown = JSON.parse(text);
  return parsed;
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
    throw new Error(`Front comment API ${res.status.toString()}: ${text}`);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFrontConversation(value: unknown): value is FrontConversation {
  return isRecord(value) && typeof value["id"] === "string";
}

function isPaginated<T>(value: unknown): value is FrontPaginatedResponse<T> {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value["_results"])) return false;
  if (!isRecord(value["_pagination"])) return false;
  return true;
}

function assertPaginated<T>(raw: unknown, label: string): FrontPaginatedResponse<T> {
  if (!isPaginated<T>(raw)) {
    throw new Error(`Invalid Front API paginated response: ${label}`);
  }
  return raw;
}

function assertRecord(raw: unknown, label: string): Record<string, unknown> {
  if (!isRecord(raw)) {
    throw new Error(`Invalid Front API response: ${label}`);
  }
  return raw;
}

interface FrontResultsResponse<T> {
  _results: T[];
}

function isResultsResponse<T>(value: unknown): value is FrontResultsResponse<T> {
  return isRecord(value) && Array.isArray(value["_results"]);
}

function assertResultsArray<T>(raw: unknown, label: string): FrontResultsResponse<T> {
  if (!isResultsResponse<T>(raw)) {
    throw new Error(`Invalid Front API results response: ${label}`);
  }
  return raw;
}

function isUnmatchedContact(value: unknown): value is UnmatchedContact {
  if (!isRecord(value)) return false;
  return (
    typeof value["handle"] === "string" &&
    (value["name"] === null || typeof value["name"] === "string") &&
    typeof value["conversationId"] === "string" &&
    typeof value["conversationSubject"] === "string" &&
    typeof value["type"] === "string" &&
    typeof value["messageCount"] === "number"
  );
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

function mergeStats(target: SyncStats, source: SyncStats): void {
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
  const msgResponse = assertPaginated<FrontMessage>(await frontFetch(messagesUrl, frontToken), "messages");

  // Determine the contact handle from the conversation
  const contactHandle = conversation.recipient?.handle ?? "";

  // If the conversation recipient is a colleague (e.g., team member
  // CC'd the shared inbox from personal email), find the actual
  // external contact from message recipients.
  let effectiveContactHandle = contactHandle;
  let senderColleagueId: string | null = null;

  if (contactHandle !== "") {
    const recipientColleagueId = findColleagueByEmail(cache, contactHandle);
    if (recipientColleagueId != null) {
      senderColleagueId = recipientColleagueId;
      // Look through messages for the actual external "to" recipient
      for (const message of msgResponse._results) {
        for (const r of message.recipients) {
          if (r.role === "to" && findColleagueByEmail(cache, r.handle) == null) {
            effectiveContactHandle = r.handle;
            break;
          }
        }
        if (effectiveContactHandle !== contactHandle) break;
      }
    }
  }

  // Classify using message type from first non-draft message
  const firstMsg = msgResponse._results.find((m) => !m.is_draft);
  const activityType = classifyChannel(undefined, effectiveContactHandle, firstMsg?.type);

  // Match contact
  const match = matchContact(cache, effectiveContactHandle, activityType);

  // If no match, skip entire conversation and record unmatched contact
  if (match.matchedEntity == null) {
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
        conversationSubject: conversation.subject !== "" ? conversation.subject : "(no subject)",
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
    if (!message.is_inbound) {
      // Try author handle first, then from-recipient handle
      if (message.author?.handle != null) {
        colleagueId = findColleagueByEmail(cache, message.author.handle);
      }
      if (colleagueId == null) {
        const fromR = message.recipients.find(r => r.role === "from");
        if (fromR != null) {
          colleagueId = findColleagueByEmail(cache, fromR.handle);
        }
      }
    } else {
      for (const recipient of message.recipients) {
        if (recipient.role === "to" || recipient.role === "cc") {
          const cid = findColleagueByEmail(cache, recipient.handle);
          if (cid != null) {
            colleagueId = cid;
            break;
          }
        }
      }
      // If no colleague found in to/cc, check if the "from" is a colleague
      if (colleagueId == null) {
        const fromRecipient = message.recipients.find(r => r.role === "from");
        if (fromRecipient != null) {
          colleagueId = findColleagueByEmail(cache, fromRecipient.handle);
        }
      }
    }
    // Final fallback: use the senderColleagueId from conversation recipient
    if (colleagueId == null && senderColleagueId != null) {
      colleagueId = senderColleagueId;
    }

    // Build notes with metadata
    const direction = message.is_inbound ? "Inbound" : "Outbound";
    const authorInfo = resolveAuthorName(message, conversation, cache.allColleagues);
    const noteLines: string[] = [];

    noteLines.push(`${direction} from ${authorInfo}`);
    if (message.text !== "") {
      noteLines.push(message.text);
    } else if (message.blurb !== "") {
      noteLines.push(message.blurb);
    }

    const subject =
      conversation.subject !== ""
        ? conversation.subject
        : `${activityType === "email" ? "Email" : activityType === "whatsapp_message" ? "WhatsApp" : "Social"} conversation`;
    const activityDate = new Date(message.created_at * 1000).toISOString();
    const displayId = await nextDisplayId(db, "ACT");

    const activity = {
      id: createId(),
      displayId,
      type: activityType,
      subject: subject.slice(0, 500),
      body: message.text !== "" ? message.text : message.blurb !== "" ? message.blurb : null,
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
      frontContactHandle: effectiveContactHandle !== "" ? effectiveContactHandle : null,
      senderName: authorInfo !== "Unknown" ? authorInfo : null,
      direction: message.is_inbound ? "inbound" : "outbound",
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
    if (match.humanId != null) stats.linkedToHumans++;
    if (match.accountId != null) stats.linkedToAccounts++;
    if (match.routeSignupId != null) stats.linkedToRouteSignups++;
    if (match.websiteBookingRequestId != null) stats.linkedToBookings++;
    if (match.generalLeadId != null) stats.linkedToGeneralLeads++;
    if (colleagueId != null) stats.linkedToColleagues++;
  }

  // Comment writeback to Front
  if (importedDisplayIds.length > 0) {
    const actIds = importedDisplayIds.join(", ");
    let commentBody = `Synced to Humans CRM: ${actIds}`;
    if (match.humanId != null) {
      const human = cache.humanNames.get(match.humanId);
      if (human != null) {
        commentBody += `\nLinked to: ${human.firstName} ${human.lastName} (${human.displayId})`;
      }
    }
    frontPostComment(frontToken, conversation.id, commentBody).catch((err: unknown) => {
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
): Promise<void> {
  // Read-append-write for unmatchedContacts (multiple pages may contribute)
  let unmatchedContactsJson: string | undefined;
  if (stats.unmatchedContacts.length > 0) {
    const existing = await db
      .select({ unmatchedContacts: frontSyncRuns.unmatchedContacts })
      .from(frontSyncRuns)
      .where(eq(frontSyncRuns.id, syncRunId))
      .limit(1);
    const existingUnmatched = existing[0]?.unmatchedContacts;
    const parsedJson: unknown = existingUnmatched != null ? JSON.parse(existingUnmatched) : [];
    const prev: UnmatchedContact[] = Array.isArray(parsedJson)
      ? parsedJson.filter(isUnmatchedContact)
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
      cursor ?? `https://api2.frontapp.com/conversations?limit=${limit.toString()}`;
    const convResponse = assertPaginated<FrontConversation>(await frontFetch(conversationsUrl, frontToken), "conversations");

    result.nextCursor = convResponse._pagination.next ?? null;

    // Pre-fetch existing frontIds for idempotency check
    const existingActivities = await db
      .select({ frontId: activities.frontId })
      .from(activities);
    const existingFrontIds = new Set(
      existingActivities.map((a) => a.frontId).filter((id): id is string => id != null),
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

    const updatedAfter = lastRun[0] != null
      ? Math.floor(new Date(lastRun[0].startedAt).getTime() / 1000)
      : Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);

    // Pre-fetch existing frontIds for idempotency check
    const existingActivities = await db
      .select({ frontId: activities.frontId })
      .from(activities);
    const existingFrontIds = new Set(
      existingActivities.map((a) => a.frontId).filter((id): id is string => id != null),
    );

    let nextUrl: string | null = `https://api2.frontapp.com/conversations?limit=10&q[updated_after]=${updatedAfter.toString()}`;

    while (nextUrl != null) {
      // Wall-clock safety valve
      if (Date.now() - startTime > WALL_CLOCK_LIMIT_MS) {
        break;
      }

      const convResponse: FrontPaginatedResponse<FrontConversation> = assertPaginated<FrontConversation>(await frontFetch(nextUrl, frontToken), "conversations");

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

// --- Debug helpers for unmatched contacts ---

export interface MatchAttempt {
  source: string;
  searchedFor: string;
  found: boolean;
  detail?: string;
}

function debugMatchByEmail(cache: CachedReferenceData, emailHandle: string): MatchAttempt[] {
  const lowerEmail = emailHandle.toLowerCase();
  const attempts: MatchAttempt[] = [];

  // 1. emails table (humans)
  const emailMatch = cache.allEmails.find(
    (e) => e.email.toLowerCase() === lowerEmail && e.ownerType === "human",
  );
  attempts.push({
    source: "Emails table (humans)",
    searchedFor: lowerEmail,
    found: emailMatch != null,
    detail: emailMatch != null ? `human:${emailMatch.ownerId}` : undefined,
  });
  if (emailMatch != null) return attempts;

  // 2. announcement_signups
  const signup = cache.allSignups.find(
    (s) => s.email?.toLowerCase() === lowerEmail,
  );
  attempts.push({
    source: "Announcement signups",
    searchedFor: lowerEmail,
    found: signup != null,
    detail: signup != null ? `signup:${signup.id}` : undefined,
  });
  if (signup != null) return attempts;

  // 3. general_leads
  const lead = cache.allLeads.find(
    (l) => l.email?.toLowerCase() === lowerEmail,
  );
  attempts.push({
    source: "General leads",
    searchedFor: lowerEmail,
    found: lead != null,
    detail: lead != null ? `general_lead:${lead.id}` : undefined,
  });
  if (lead != null) return attempts;

  // 4. bookings
  const booking = cache.allBookings.find(
    (b) =>
      b.client_email?.toLowerCase() === lowerEmail ||
      b.email_for_notifications?.toLowerCase() === lowerEmail,
  );
  attempts.push({
    source: "Bookings",
    searchedFor: lowerEmail,
    found: booking != null,
    detail: booking != null ? `booking:${booking.id}` : undefined,
  });

  // 5. colleagues
  const colleague = cache.allColleagues.find(
    (c) => c.email.toLowerCase() === lowerEmail,
  );
  attempts.push({
    source: "Colleagues",
    searchedFor: lowerEmail,
    found: colleague != null,
    detail: colleague != null ? `colleague:${colleague.id}` : undefined,
  });

  return attempts;
}

function debugMatchByPhone(cache: CachedReferenceData, phoneHandle: string): MatchAttempt[] {
  const normalized = normalizePhone(phoneHandle);
  const suffix = normalized.slice(-9);
  const attempts: MatchAttempt[] = [];

  // 1. phones table (humans)
  const phoneMatch = cache.allPhones.find(
    (p) => p.ownerType === "human" && phonesMatch(p.phoneNumber, phoneHandle),
  );
  attempts.push({
    source: "Phones table (humans)",
    searchedFor: `${phoneHandle} (normalized suffix: ${suffix})`,
    found: phoneMatch != null,
    detail: phoneMatch != null ? `human:${phoneMatch.ownerId}` : undefined,
  });
  if (phoneMatch != null) return attempts;

  // 2. announcement_signups
  const signup = cache.allSignups.find((s) => {
    const phone = s.phone;
    const wp = s.whatsapp_phone;
    return (
      (phone != null && normalizePhone(phone).slice(-9) === suffix) ||
      (wp != null && normalizePhone(wp).slice(-9) === suffix)
    );
  });
  attempts.push({
    source: "Announcement signups (phone/whatsapp)",
    searchedFor: `suffix ${suffix}`,
    found: signup != null,
    detail: signup != null ? `signup:${signup.id}` : undefined,
  });
  if (signup != null) return attempts;

  // 3. general_leads
  const lead = cache.allLeads.find(
    (l) => l.phone != null && phonesMatch(l.phone, phoneHandle),
  );
  attempts.push({
    source: "General leads (phone)",
    searchedFor: phoneHandle,
    found: lead != null,
    detail: lead != null ? `general_lead:${lead.id}` : undefined,
  });
  if (lead != null) return attempts;

  // 4. bookings
  const booking = cache.allBookings.find((b) => {
    const phone = b.phone_number;
    const alt = b.alt_whatsapp_phone_number;
    return (
      (phone != null && normalizePhone(phone).slice(-9) === suffix) ||
      (alt != null && normalizePhone(alt).slice(-9) === suffix)
    );
  });
  attempts.push({
    source: "Bookings (phone)",
    searchedFor: `suffix ${suffix}`,
    found: booking != null,
    detail: booking != null ? `booking:${booking.id}` : undefined,
  });

  return attempts;
}

function debugMatchBySocialId(cache: CachedReferenceData, handle: string): MatchAttempt[] {
  const normalized = normalizeSocialHandle(handle);
  const match = cache.allSocialIds.find(
    (s) => normalizeSocialHandle(s.handle) === normalized,
  );
  return [{
    source: "Social IDs",
    searchedFor: `${handle} (normalized: ${normalized})`,
    found: match?.humanId != null,
    detail: match?.humanId != null ? `human:${match.humanId}` : match != null ? "Social ID found but no humanId linked" : undefined,
  }];
}

export function debugMatchContact(
  cache: CachedReferenceData,
  handle: string,
  type: ActivityType,
): MatchAttempt[] {
  let attempts: MatchAttempt[] = [];
  let matched = false;

  if (type === "email") {
    attempts = debugMatchByEmail(cache, handle);
    matched = attempts.some((a) => a.found);
  } else if (type === "whatsapp_message") {
    attempts = debugMatchByPhone(cache, handle);
    matched = attempts.some((a) => a.found);
  } else {
    // social_message — try email first, then phone
    if (handle.includes("@")) {
      attempts = debugMatchByEmail(cache, handle);
      matched = attempts.some((a) => a.found);
    }
    if (!matched && /\d/.test(handle)) {
      attempts = [...attempts, ...debugMatchByPhone(cache, handle)];
      matched = attempts.some((a) => a.found);
    }
    if (!matched && !handle.includes("@") && !/\d/.test(handle)) {
      attempts.push({ source: "No email/phone strategy", searchedFor: handle, found: false, detail: "Handle is not an email or phone number" });
    }
  }

  // Always append social ID debug step
  const socialAttempts = debugMatchBySocialId(cache, handle);
  if (matched) {
    attempts.push({
      ...socialAttempts[0],
      detail: `${socialAttempts[0].detail ?? "Not checked"} (skipped — already matched above)`,
    });
  } else {
    attempts.push(...socialAttempts);
  }

  return attempts;
}

export async function debugUnmatchedContact(
  db: DB,
  supabase: SupabaseClient,
  frontToken: string,
  conversationId: string,
  contactHandle: string,
): Promise<{ conversation: Record<string, unknown>; messages: FrontMessage[]; matchAttempts: MatchAttempt[] }> {
  const cache = await preloadReferenceData(db, supabase);

  const conversation = assertRecord(await frontFetch(
    `https://api2.frontapp.com/conversations/${conversationId}`,
    frontToken,
  ), "conversation");

  // Fetch messages via the conversation's messages link
  const links = isRecord(conversation["_links"]) ? conversation["_links"] : undefined;
  const related = links !== undefined && isRecord(links["related"]) ? links["related"] : undefined;
  const messagesLink = related !== undefined && isRecord(related["messages"]) ? related["messages"] : undefined;
  const messagesHref = messagesLink !== undefined && typeof messagesLink["href"] === "string"
    ? messagesLink["href"]
    : `https://api2.frontapp.com/conversations/${conversationId}/messages`;

  const messagesResponse = assertResultsArray<FrontMessage>(await frontFetch(
    messagesHref,
    frontToken,
  ), "conversation-messages");

  // Use message type from first non-draft message for classification
  const firstMsg = messagesResponse._results.find((m) => !m.is_draft);
  const activityType = classifyChannel(undefined, contactHandle, firstMsg?.type);
  const matchAttempts = debugMatchContact(cache, contactHandle, activityType);

  return {
    conversation,
    messages: messagesResponse._results,
    matchAttempts,
  };
}

// --- Sync run management ---

export async function listSyncRuns(db: DB): Promise<{ id: string; displayId: string; status: string; startedAt: string; completedAt: string | null; totalMessages: number | null; imported: number | null; skipped: number | null; unmatched: number | null; errorCount: number | null; errorMessages: string | null; unmatchedContacts: string | null; linkedToHumans: number | null; linkedToAccounts: number | null; linkedToRouteSignups: number | null; linkedToBookings: number | null; linkedToColleagues: number | null; linkedToGeneralLeads: number | null; initiatedByColleagueId: string | null; initiatedByName: string | null; createdAt: string }[]> {
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

export async function getSyncRun(db: DB, id: string): Promise<typeof frontSyncRuns.$inferSelect | null> {
  const run = await db.query.frontSyncRuns.findFirst({
    where: eq(frontSyncRuns.id, id),
  });
  return run ?? null;
}

export async function revertSyncRun(db: DB, syncRunId: string): Promise<{ deleted: number; skipped: number; error?: string }> {
  const run = await db.query.frontSyncRuns.findFirst({
    where: eq(frontSyncRuns.id, syncRunId),
  });
  if (run == null) return { deleted: 0, skipped: 0, error: "Sync run not found" };
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

// --- Reclassify mistyped activities ---

export async function reclassifyActivities(
  db: DB,
  frontToken: string,
  cursor?: string,
): Promise<{ updated: number; checked: number; errors: string[]; nextCursor: string | null }> {
  const BATCH_SIZE = 20;
  let updated = 0;
  let checked = 0;
  const errors: string[] = [];

  // Get distinct front_conversation_ids with their current types
  const rows = await db
    .select({
      frontConversationId: activities.frontConversationId,
      frontContactHandle: activities.frontContactHandle,
      type: activities.type,
    })
    .from(activities)
    .where(sql`${activities.frontConversationId} IS NOT NULL`)
    .groupBy(activities.frontConversationId)
    .orderBy(activities.frontConversationId);

  // Simple cursor-based pagination: skip conversations until we pass the cursor
  let started = cursor == null;
  let processed = 0;
  let nextCursor: string | null = null;

  for (const row of rows) {
    if (!started) {
      if (row.frontConversationId === cursor) {
        started = true;
      }
      continue;
    }

    if (processed >= BATCH_SIZE) {
      nextCursor = row.frontConversationId;
      break;
    }

    processed++;
    checked++;

    const convId = row.frontConversationId;
    if (convId == null) continue;

    try {
      const msgResponse = assertResultsArray<FrontMessage>(await frontFetch(
        `https://api2.frontapp.com/conversations/${convId}/messages`,
        frontToken,
      ), "reclassify-messages");

      const firstMsg = msgResponse._results.find((m) => !m.is_draft);
      const handle = row.frontContactHandle ?? firstMsg?.author?.handle ?? "";
      const correctType = classifyChannel(undefined, handle, firstMsg?.type);

      if (correctType !== row.type) {
        await db
          .update(activities)
          .set({ type: correctType, updatedAt: new Date().toISOString() })
          .where(
            and(
              eq(activities.frontConversationId, convId),
              sql`${activities.type} != ${correctType}`,
            ),
          );
        updated++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${convId}: ${msg}`);
    }
  }

  return { updated, checked, errors, nextCursor };
}

// --- Backfill author names for existing activities ---

export async function backfillAuthorNames(
  db: DB,
  frontToken: string,
  cursor?: string,
): Promise<{
  updated: number;
  checked: number;
  errors: string[];
  nextCursor: string | null;
}> {
  const BATCH_SIZE = 20;

  // Load colleague data for author resolution
  const colleagueRows = await db
    .select({ id: colleagues.id, email: colleagues.email, name: colleagues.name })
    .from(colleagues);

  // Get activities that need backfilling: no sender_name but have a front_id
  const rows = await db
    .select({
      id: activities.id,
      frontId: activities.frontId,
      frontConversationId: activities.frontConversationId,
      direction: activities.direction,
      senderName: activities.senderName,
    })
    .from(activities)
    .where(
      and(
        isNull(activities.senderName),
        isNotNull(activities.frontId),
      ),
    )
    .orderBy(activities.frontConversationId);

  let updated = 0;
  let checked = 0;
  const errors: string[] = [];
  let nextCursor: string | null = null;

  // Group activities by conversation for batch processing
  const conversationGroups = new Map<string, typeof rows>();
  for (const row of rows) {
    if (row.frontConversationId == null) continue;
    const group = conversationGroups.get(row.frontConversationId);
    if (group != null) {
      group.push(row);
    } else {
      conversationGroups.set(row.frontConversationId, [row]);
    }
  }

  const conversationIds = [...conversationGroups.keys()];

  // Handle cursor-based pagination
  let startIdx = 0;
  if (cursor != null) {
    const cursorIdx = conversationIds.indexOf(cursor);
    startIdx = cursorIdx >= 0 ? cursorIdx + 1 : 0;
  }

  let processed = 0;

  for (let i = startIdx; i < conversationIds.length; i++) {
    if (processed >= BATCH_SIZE) {
      // eslint-disable-next-line security/detect-object-injection
      nextCursor = conversationIds[i];
      break;
    }

    // eslint-disable-next-line security/detect-object-injection
    const convId = conversationIds[i];
    if (convId == null) continue;
    const convActivities = conversationGroups.get(convId);
    if (convActivities == null) continue;

    processed++;

    try {
      // Fetch conversation for recipient info
      const convRaw = assertRecord(
        await frontFetch(`https://api2.frontapp.com/conversations/${convId}`, frontToken),
        "backfill-conversation",
      );
      if (!isFrontConversation(convRaw)) {
        throw new Error(`Invalid Front conversation response for ${convId}`);
      }
      const conversation = convRaw;

      // Fetch messages
      const msgResponse = assertPaginated<FrontMessage>(
        await frontFetch(
          `https://api2.frontapp.com/conversations/${convId}/messages`,
          frontToken,
        ),
        "backfill-messages",
      );

      // Build a map of front message ID → message
      const messageMap = new Map<string, FrontMessage>();
      for (const msg of msgResponse._results) {
        messageMap.set(msg.id, msg);
      }

      // Update each activity
      for (const act of convActivities) {
        checked++;
        if (act.frontId == null) continue;

        const message = messageMap.get(act.frontId);
        if (message == null) continue;

        const authorName = resolveAuthorName(message, conversation, colleagueRows);

        // Also try to fix colleague linking for outbound messages
        let colleagueId: string | null = null;
        if (!message.is_inbound) {
          if (message.author?.handle != null) {
            colleagueId = findColleagueIdByEmail(colleagueRows, message.author.handle);
          }
          if (colleagueId == null) {
            const fromR = message.recipients.find(r => r.role === "from");
            if (fromR != null) {
              colleagueId = findColleagueIdByEmail(colleagueRows, fromR.handle);
            }
          }
        }

        const updates: Record<string, string> = {
          updatedAt: new Date().toISOString(),
        };
        if (authorName !== "Unknown") {
          updates["senderName"] = authorName;
        }

        await db
          .update(activities)
          .set({
            senderName: authorName !== "Unknown" ? authorName : null,
            ...(colleagueId != null ? { colleagueId } : {}),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(activities.id, act.id));

        updated++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${convId}: ${msg}`);
    }
  }

  return { updated, checked, errors, nextCursor };
}
