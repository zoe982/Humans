import { eq, isNull } from "drizzle-orm";
import { activities } from "@humans/db/schema";
import { normalizePhone } from "../lib/phone-utils";
import type { DB } from "./types";

/**
 * Find activities where frontContactHandle matches the given email
 * and humanId IS NULL, then reparent them to the specified human.
 */
export async function rematchActivitiesByEmail(
  db: DB,
  humanId: string,
  email: string,
): Promise<number> {
  const lowerEmail = email.toLowerCase();

  // Find unmatched activities whose contact handle matches this email
  const candidates = await db
    .select({ id: activities.id, frontContactHandle: activities.frontContactHandle })
    .from(activities)
    .where(isNull(activities.humanId));

  const toUpdate = candidates.filter(
    (a) => a.frontContactHandle?.toLowerCase() === lowerEmail,
  );

  if (toUpdate.length === 0) return 0;

  const now = new Date().toISOString();
  for (const activity of toUpdate) {
    await db
      .update(activities)
      .set({
        humanId,
        routeSignupId: null,
        websiteBookingRequestId: null,
        generalLeadId: null,
        updatedAt: now,
      })
      .where(eq(activities.id, activity.id));
  }

  return toUpdate.length;
}

/**
 * Find activities where frontContactHandle matches the given phone (suffix-9 matching)
 * and humanId IS NULL, then reparent them to the specified human.
 */
export async function rematchActivitiesByPhone(
  db: DB,
  humanId: string,
  phone: string,
): Promise<number> {
  const normalized = normalizePhone(phone);
  if (normalized.length < 9) return 0;
  const suffix = normalized.slice(-9);

  // Find unmatched activities whose contact handle looks like a phone
  const candidates = await db
    .select({ id: activities.id, frontContactHandle: activities.frontContactHandle })
    .from(activities)
    .where(isNull(activities.humanId));

  const toUpdate = candidates.filter((a) => {
    if (a.frontContactHandle == null) return false;
    const handleNorm = normalizePhone(a.frontContactHandle);
    return handleNorm.length >= 9 && handleNorm.slice(-9) === suffix;
  });

  if (toUpdate.length === 0) return 0;

  const now = new Date().toISOString();
  for (const activity of toUpdate) {
    await db
      .update(activities)
      .set({
        humanId,
        routeSignupId: null,
        websiteBookingRequestId: null,
        generalLeadId: null,
        updatedAt: now,
      })
      .where(eq(activities.id, activity.id));
  }

  return toUpdate.length;
}

/**
 * Find activities where frontContactHandle matches the given social handle
 * (normalized, case-insensitive, with/without leading @) and humanId IS NULL,
 * then reparent them to the specified human.
 */
export async function rematchActivitiesBySocialId(
  db: DB,
  humanId: string,
  handle: string,
): Promise<number> {
  const normalized = handle.replace(/^@/, "").toLowerCase();
  if (normalized === "") return 0;

  // Find unmatched activities whose contact handle matches this social handle
  const candidates = await db
    .select({ id: activities.id, frontContactHandle: activities.frontContactHandle })
    .from(activities)
    .where(isNull(activities.humanId));

  const toUpdate = candidates.filter((a) => {
    if (a.frontContactHandle == null) return false;
    const candidateNorm = a.frontContactHandle.replace(/^@/, "").toLowerCase();
    return candidateNorm === normalized;
  });

  if (toUpdate.length === 0) return 0;

  const now = new Date().toISOString();
  for (const activity of toUpdate) {
    await db
      .update(activities)
      .set({
        humanId,
        routeSignupId: null,
        websiteBookingRequestId: null,
        generalLeadId: null,
        updatedAt: now,
      })
      .where(eq(activities.id, activity.id));
  }

  return toUpdate.length;
}
