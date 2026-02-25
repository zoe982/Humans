import { eq } from "drizzle-orm";
import { leadSources, leadEvents, type LeadEventType } from "@humans/db/schema";
import { createId } from "@humans/db";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

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

  const newSource = {
    id: createId(),
    displayId,
    ...data,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(leadSources).values(newSource as typeof leadSources.$inferInsert);
  return newSource;
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

  const newEvent = {
    id: createId(),
    displayId,
    ...data,
    humanId: data.humanId,
    eventType: data.eventType,
    notes: data.notes ?? null,
    metadata: (data.metadata ?? null) as Record<string, unknown> | null,
    createdByColleagueId: colleagueId ?? null,
    createdAt: new Date().toISOString(),
  };

  await db.insert(leadEvents).values(newEvent as typeof leadEvents.$inferInsert);
  return newEvent;
}
