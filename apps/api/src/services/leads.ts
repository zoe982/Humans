import { eq } from "drizzle-orm";
import { leadSources, leadEvents } from "@humans/db/schema";
import { createId } from "@humans/db";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

export async function listLeadSources(db: DB) {
  const sources = await db.select().from(leadSources);
  return sources;
}

export async function createLeadSource(
  db: DB,
  data: {
    name: string;
    [key: string]: unknown;
  },
) {
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

  await db.insert(leadSources).values(newSource);
  return newSource;
}

export async function listLeadEvents(db: DB, humanId?: string) {
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
    notes?: string | null;
    metadata?: unknown;
    [key: string]: unknown;
  },
  colleagueId?: string | null,
) {
  const displayId = await nextDisplayId(db, "LED");

  const newEvent = {
    id: createId(),
    displayId,
    ...data,
    notes: data.notes ?? null,
    metadata: data.metadata ?? null,
    createdByColleagueId: colleagueId ?? null,
    createdAt: new Date().toISOString(),
  };

  await db.insert(leadEvents).values(newEvent);
  return newEvent;
}
