import { eq } from "drizzle-orm";
import { leadSources, leadSourceCategories, leadEvents, type LeadEventType, type LeadSourceCategory } from "@humans/db/schema";
import { createId } from "@humans/db";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

const leadSourceCategoriesSet = new Set<string>(leadSourceCategories);

function isLeadSourceCategory(value: string): value is LeadSourceCategory {
  return leadSourceCategoriesSet.has(value);
}

function toLeadSourceCategory(value: unknown): LeadSourceCategory {
  return typeof value === "string" && isLeadSourceCategory(value) ? value : "direct";
}

export async function listLeadSources(db: DB): Promise<(typeof leadSources.$inferSelect)[]> {
  const sources = await db.select().from(leadSources);
  return sources;
}

export async function createLeadSource(
  db: DB,
  data: {
    name: string;
    [key: string]: unknown;
  },
): Promise<Record<string, unknown>> {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "LES");

  const insertRecord: typeof leadSources.$inferInsert = {
    id: createId(),
    displayId,
    name: data.name,
    category: toLeadSourceCategory(data["category"]),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(leadSources).values(insertRecord);
  return { ...insertRecord, ...data };
}

export async function listLeadEvents(db: DB, humanId?: string): Promise<(typeof leadEvents.$inferSelect)[]> {
  if (humanId != null && humanId !== "") {
    const events = await db
      .select()
      .from(leadEvents)
      .where(eq(leadEvents.humanId, humanId));
    return events;
  }

  const events = await db.select().from(leadEvents);
  return events;
}

export async function createLeadEvent(
  db: DB,
  data: {
    humanId: string;
    eventType: LeadEventType;
    notes?: string | null | undefined;
    metadata?: unknown;
    [key: string]: unknown;
  },
  colleagueId?: string | null,
): Promise<Record<string, unknown>> {
  const displayId = await nextDisplayId(db, "LED");

  const rawMetadata = data.metadata;
  const metadata: Record<string, unknown> | null =
    rawMetadata != null && typeof rawMetadata === "object" && !Array.isArray(rawMetadata)
      ? Object.fromEntries(Object.entries(rawMetadata))
      : null;

  const insertRecord: typeof leadEvents.$inferInsert = {
    id: createId(),
    displayId,
    humanId: data.humanId,
    eventType: data.eventType,
    notes: data.notes ?? null,
    metadata,
    createdByColleagueId: colleagueId ?? null,
    createdAt: new Date().toISOString(),
  };

  await db.insert(leadEvents).values(insertRecord);
  return { ...insertRecord, ...data };
}
