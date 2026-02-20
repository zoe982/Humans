import { eq } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";
import { activities, emails, phones } from "@humans/db/schema";
import { createId } from "@humans/db";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

// --- Channel classification ---

const SOCIAL_CHANNEL_IDS = new Set(["cha_lxdeo", "cha_lxdcw"]); // Facebook, Instagram
const WHATSAPP_CHANNEL_IDS = new Set([
  "cha_m1868",  // US +1 202-573-8145
  "cha_m3274",  // Malta +356 2034 1713
  "cha_m17mo",  // Malta Go +356 7954 9994
  "cha_lxdb4",  // US 15558236373
  "cha_m17ts",  // UK +44 1225 266970
  "cha_m17vk",  // Switzerland +41 41 563 99 98
]);
const EMAIL_CHANNEL_IDS = new Set(["cha_lxe5c", "cha_ly6sg", "cha_m7tuo"]);

type ActivityType = "email" | "whatsapp_message" | "social_message";

function classifyChannel(channelId: string | undefined, handle: string): ActivityType {
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
  routeSignupId: string | null;
  websiteBookingRequestId: string | null;
  matchedEntity: string | null; // description for logging
}

async function matchByEmail(
  db: DB,
  supabase: SupabaseClient,
  emailHandle: string,
): Promise<MatchResult> {
  const noMatch: MatchResult = { humanId: null, routeSignupId: null, websiteBookingRequestId: null, matchedEntity: null };
  const lowerEmail = emailHandle.toLowerCase();

  // 1. Check D1 emails table (humans)
  const allEmails = await db.select().from(emails);
  const matched = allEmails.find((e) => e.email.toLowerCase() === lowerEmail && e.ownerType === "human");
  if (matched) {
    return { ...noMatch, humanId: matched.ownerId, matchedEntity: `human:${matched.ownerId}` };
  }

  // 2. Check Supabase announcement_signups
  const { data: signups } = await supabase
    .from("announcement_signups")
    .select("id")
    .ilike("email", lowerEmail)
    .limit(1);
  if (signups && signups.length > 0) {
    return { ...noMatch, routeSignupId: signups[0].id, matchedEntity: `signup:${signups[0].id}` };
  }

  // 3. Check Supabase bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id")
    .or(`client_email.ilike.${lowerEmail},email_for_notifications.ilike.${lowerEmail}`)
    .limit(1);
  if (bookings && bookings.length > 0) {
    return { ...noMatch, websiteBookingRequestId: bookings[0].id, matchedEntity: `booking:${bookings[0].id}` };
  }

  return noMatch;
}

async function matchByPhone(
  db: DB,
  supabase: SupabaseClient,
  phoneHandle: string,
): Promise<MatchResult> {
  const noMatch: MatchResult = { humanId: null, routeSignupId: null, websiteBookingRequestId: null, matchedEntity: null };

  // 1. Check D1 phones table (humans)
  const allPhones = await db.select().from(phones);
  const matched = allPhones.find((p) => p.ownerType === "human" && phonesMatch(p.phoneNumber, phoneHandle));
  if (matched) {
    return { ...noMatch, humanId: matched.ownerId, matchedEntity: `human:${matched.ownerId}` };
  }

  // 2. Check Supabase bookings by phone
  const normalized = normalizePhone(phoneHandle);
  const suffix = normalized.slice(-9);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, phone_number, alt_whatsapp_phone_number");
  if (bookings) {
    const match = bookings.find((b: Record<string, unknown>) => {
      const phone = b.phone_number as string | null;
      const alt = b.alt_whatsapp_phone_number as string | null;
      return (phone && normalizePhone(phone).slice(-9) === suffix) ||
             (alt && normalizePhone(alt).slice(-9) === suffix);
    });
    if (match) {
      return { ...noMatch, websiteBookingRequestId: (match as Record<string, unknown>).id as string, matchedEntity: `booking:${(match as Record<string, unknown>).id}` };
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
  return { humanId: null, routeSignupId: null, websiteBookingRequestId: null, matchedEntity: null };
}

// --- Front API helpers ---

interface FrontPagination {
  next?: string | null;
}

interface FrontRecipient {
  handle: string;
  role: string;
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
  recipients: FrontRecipient[];
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
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
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
}

export async function syncFrontConversations(
  db: DB,
  supabase: SupabaseClient,
  frontToken: string,
  colleagueId: string,
  cursor?: string,
  limit = 20,
): Promise<SyncResult> {
  const result: SyncResult = {
    total: 0,
    imported: 0,
    skipped: 0,
    unmatched: 0,
    errors: [],
    nextCursor: null,
  };

  // Fetch one page of conversations
  const conversationsUrl = cursor ?? `https://api2.frontapp.com/conversations?limit=${limit}`;
  const convResponse = await frontFetch<{
    _results: FrontConversation[];
    _pagination: FrontPagination;
  }>(conversationsUrl, frontToken);

  result.nextCursor = convResponse._pagination.next ?? null;

  // Pre-fetch existing frontIds for idempotency check
  const existingActivities = await db.select({ frontId: activities.frontId }).from(activities);
  const existingFrontIds = new Set(existingActivities.map((a) => a.frontId).filter(Boolean));

  for (const conversation of convResponse._results) {
    try {
      // Fetch all messages for this conversation
      const messagesUrl = `https://api2.frontapp.com/conversations/${conversation.id}/messages`;
      const msgResponse = await frontFetch<{
        _results: FrontMessage[];
        _pagination: FrontPagination;
      }>(messagesUrl, frontToken);

      // Determine the contact handle and channel from the conversation
      const contactHandle = conversation.recipient?.handle ?? "";

      // Get channel ID from the first message's recipients to classify the channel
      const firstMsg = msgResponse._results[0];
      let channelId: string | undefined;
      if (firstMsg) {
        // Front messages don't directly expose channel_id, so we classify by handle pattern
        // and fall back to our known channel sets
        channelId = undefined; // We'll rely on handle-based classification
      }

      const activityType = classifyChannel(channelId, contactHandle);

      // Match contact
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

        // Build notes with metadata
        const direction = message.is_inbound ? "Inbound" : "Outbound";
        const authorInfo = message.author?.name ?? message.author?.handle ?? "Unknown";
        const contactName = conversation.recipient?.name ?? contactHandle;
        const noteLines: string[] = [];

        if (!match.matchedEntity) {
          noteLines.push(`[UNMATCHED] Contact: ${contactName} (${contactHandle})`);
          result.unmatched++;
        }

        noteLines.push(`${direction} from ${authorInfo}`);
        if (message.text) {
          noteLines.push(message.text);
        } else if (message.blurb) {
          noteLines.push(message.blurb);
        }

        const subject = conversation.subject || `${activityType === "email" ? "Email" : activityType === "whatsapp_message" ? "WhatsApp" : "Social"} conversation`;
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
          accountId: null,
          routeSignupId: match.routeSignupId,
          websiteBookingRequestId: match.websiteBookingRequestId,
          gmailId: null,
          frontId: message.id,
          frontConversationId: conversation.id,
          createdByColleagueId: colleagueId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.insert(activities).values(activity);
        existingFrontIds.add(message.id); // Prevent duplicates within same batch
        result.imported++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Conversation ${conversation.id}: ${msg}`);
    }
  }

  return result;
}
