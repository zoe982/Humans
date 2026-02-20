import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activities,
  emails,
  phones,
  colleagues,
  accountHumans,
  frontSyncRuns,
  geoInterestExpressions,
  routeInterestExpressions,
} from "@humans/db/schema";
import { createId } from "@humans/db";
import { eq, sql } from "drizzle-orm";
import { nextDisplayId } from "../lib/display-id";
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

// --- Phone normalization ---

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function phonesMatch(a: string, b: string): boolean {
  const normA = normalizePhone(a);
  const normB = normalizePhone(b);
  if (normA.length < 9 || normB.length < 9) return false;
  return normA.slice(-9) === normB.slice(-9);
}

// --- Contact matching ---

interface MatchResult {
  humanId: string | null;
  accountId: string | null;
  routeSignupId: string | null;
  websiteBookingRequestId: string | null;
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
    matchedEntity: null,
  };
  const lowerEmail = emailHandle.toLowerCase();

  // 1. Check D1 emails table (humans)
  const allEmails = await db.select().from(emails);
  const matched = allEmails.find(
    (e) => e.email.toLowerCase() === lowerEmail && e.ownerType === "human",
  );
  if (matched) {
    // Auto-link account via account_humans junction
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

  // 3. Check Supabase bookings
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
    matchedEntity: null,
  };

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

  // 2. Check Supabase bookings by phone
  const normalized = normalizePhone(phoneHandle);
  const suffix = normalized.slice(-9);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, phone_number, alt_whatsapp_phone_number");
  if (bookings) {
    const matched = bookings.find((b) => {
      const phone = b["phone_number"] as string | null;
      const alt = b["alt_whatsapp_phone_number"] as string | null;
      return (
        (phone && normalizePhone(phone).slice(-9) === suffix) ||
        (alt && normalizePhone(alt).slice(-9) === suffix)
      );
    });
    if (matched) {
      const bid = matched["id"] as string;
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

export interface SyncResult {
  total: number;
  imported: number;
  skipped: number;
  unmatched: number;
  errors: string[];
  nextCursor: string | null;
  syncRunId: string;
  linkedToHumans: number;
  linkedToAccounts: number;
  linkedToRouteSignups: number;
  linkedToBookings: number;
  linkedToColleagues: number;
}

export async function syncFrontConversations(
  db: DB,
  supabase: SupabaseClient,
  frontToken: string,
  initiatedByColleagueId: string,
  cursor?: string,
  limit = 20,
  existingSyncRunId?: string,
): Promise<SyncResult> {
  // Create or fetch sync run
  let syncRunId: string;

  if (existingSyncRunId) {
    syncRunId = existingSyncRunId;
  } else {
    syncRunId = createId();
    const displayId = await nextDisplayId(db, "FRY");
    await db.insert(frontSyncRuns).values({
      id: syncRunId,
      displayId,
      status: "running",
      startedAt: new Date().toISOString(),
      initiatedByColleagueId,
      createdAt: new Date().toISOString(),
    });
  }

  const result: SyncResult = {
    total: 0,
    imported: 0,
    skipped: 0,
    unmatched: 0,
    errors: [],
    nextCursor: null,
    syncRunId,
    linkedToHumans: 0,
    linkedToAccounts: 0,
    linkedToRouteSignups: 0,
    linkedToBookings: 0,
    linkedToColleagues: 0,
  };

  try {
    // Fetch one page of conversations
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

        // Match contact (now includes accountId auto-linking)
        const match = await matchContact(db, supabase, contactHandle, activityType);

        for (const message of msgResponse._results) {
          result.total++;

          // Skip drafts
          if (message.is_draft) {
            result.skipped++;
            continue;
          }

          // Idempotency: skip if this message ID already exists
          if (existingFrontIds.has(message.id)) {
            result.skipped++;
            continue;
          }

          // Auto-link colleague based on message author
          let colleagueId: string | null = null;
          if (!message.is_inbound && message.author?.handle) {
            // Outbound: check if author is a colleague
            colleagueId = await findColleagueByEmail(
              db,
              message.author.handle,
            );
          } else if (message.is_inbound) {
            // Inbound: check recipients for colleague emails
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
          const authorInfo =
            message.author?.name ?? message.author?.handle ?? "Unknown";
          const contactName =
            conversation.recipient?.name ?? contactHandle;
          const noteLines: string[] = [];

          if (!match.matchedEntity) {
            noteLines.push(
              `[UNMATCHED] Contact: ${contactName} (${contactHandle})`,
            );
            result.unmatched++;
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
          const activityDate = new Date(
            message.created_at * 1000,
          ).toISOString();
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
            gmailId: null,
            frontId: message.id,
            frontConversationId: conversation.id,
            syncRunId,
            colleagueId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await db.insert(activities).values(activity);
          existingFrontIds.add(message.id);
          result.imported++;

          // Track linking stats
          if (match.humanId) result.linkedToHumans++;
          if (match.accountId) result.linkedToAccounts++;
          if (match.routeSignupId) result.linkedToRouteSignups++;
          if (match.websiteBookingRequestId) result.linkedToBookings++;
          if (colleagueId) result.linkedToColleagues++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Conversation ${conversation.id}: ${msg}`);
      }
    }

    // Update sync run with accumulated stats
    const isComplete = result.nextCursor == null;
    await db
      .update(frontSyncRuns)
      .set({
        ...(isComplete
          ? { status: "completed" as const, completedAt: new Date().toISOString() }
          : {}),
        totalMessages: sql`${frontSyncRuns.totalMessages} + ${result.total}`,
        imported: sql`${frontSyncRuns.imported} + ${result.imported}`,
        skipped: sql`${frontSyncRuns.skipped} + ${result.skipped}`,
        unmatched: sql`${frontSyncRuns.unmatched} + ${result.unmatched}`,
        errorCount: sql`${frontSyncRuns.errorCount} + ${result.errors.length}`,
        errorMessages:
          result.errors.length > 0
            ? JSON.stringify(result.errors)
            : undefined,
        linkedToHumans: sql`${frontSyncRuns.linkedToHumans} + ${result.linkedToHumans}`,
        linkedToAccounts: sql`${frontSyncRuns.linkedToAccounts} + ${result.linkedToAccounts}`,
        linkedToRouteSignups: sql`${frontSyncRuns.linkedToRouteSignups} + ${result.linkedToRouteSignups}`,
        linkedToBookings: sql`${frontSyncRuns.linkedToBookings} + ${result.linkedToBookings}`,
        linkedToColleagues: sql`${frontSyncRuns.linkedToColleagues} + ${result.linkedToColleagues}`,
      })
      .where(eq(frontSyncRuns.id, syncRunId));
  } catch (err) {
    // Mark sync run as failed
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

// --- Sync run management ---

export async function listSyncRuns(db: DB) {
  const runs = await db
    .select()
    .from(frontSyncRuns)
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
