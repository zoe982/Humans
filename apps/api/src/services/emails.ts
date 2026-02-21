import { eq, and } from "drizzle-orm";
import { emails, humans, accounts, humanEmailLabelsConfig, accountEmailLabelsConfig } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

export async function listEmails(db: DB) {
  const allEmails = await db.select().from(emails);
  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);
  const humanLabels = await db.select().from(humanEmailLabelsConfig);
  const accountLabels = await db.select().from(accountEmailLabelsConfig);

  const data = allEmails.map((e) => {
    let ownerName: string | null = null;
    let ownerDisplayId: string | null = null;
    if (e.ownerType === "human") {
      const human = allHumans.find((h) => h.id === e.ownerId);
      ownerName = human ? `${human.firstName} ${human.lastName}` : null;
      ownerDisplayId = human?.displayId ?? null;
    } else {
      const account = allAccounts.find((a) => a.id === e.ownerId);
      ownerName = account?.name ?? null;
      ownerDisplayId = account?.displayId ?? null;
    }
    const labels = e.ownerType === "human" ? humanLabels : accountLabels;
    const label = e.labelId ? labels.find((l) => l.id === e.labelId) : null;
    return {
      ...e,
      ownerName,
      ownerDisplayId,
      labelName: label?.name ?? null,
    };
  });

  return data;
}

export async function getEmail(db: DB, id: string) {
  const allEmails = await db.select().from(emails).where(eq(emails.id, id));
  const email = allEmails[0];
  if (email == null) {
    throw notFound(ERROR_CODES.EMAIL_NOT_FOUND, "Email not found");
  }

  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);
  const humanLabels = await db.select().from(humanEmailLabelsConfig);
  const accountLabels = await db.select().from(accountEmailLabelsConfig);

  let ownerName: string | null = null;
  let ownerDisplayId: string | null = null;
  if (email.ownerType === "human") {
    const human = allHumans.find((h) => h.id === email.ownerId);
    ownerName = human ? `${human.firstName} ${human.lastName}` : null;
    ownerDisplayId = human?.displayId ?? null;
  } else {
    const account = allAccounts.find((a) => a.id === email.ownerId);
    ownerName = account?.name ?? null;
    ownerDisplayId = account?.displayId ?? null;
  }
  const labels = email.ownerType === "human" ? humanLabels : accountLabels;
  const label = email.labelId ? labels.find((l) => l.id === email.labelId) : null;

  return {
    ...email,
    ownerName,
    ownerDisplayId,
    labelName: label?.name ?? null,
  };
}

export async function updateEmail(
  db: DB,
  id: string,
  data: Record<string, unknown>,
) {
  const existing = await db.query.emails.findFirst({
    where: eq(emails.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.EMAIL_NOT_FOUND, "Email not found");
  }

  await db
    .update(emails)
    .set(data)
    .where(eq(emails.id, id));

  const updated = await db.query.emails.findFirst({
    where: eq(emails.id, id),
  });
  return updated;
}

export async function createEmail(
  db: DB,
  data: {
    humanId: string;
    email: string;
    labelId?: string | null;
    isPrimary?: boolean;
  },
) {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "EML");

  const email = {
    id: createId(),
    displayId,
    ownerType: "human" as const,
    ownerId: data.humanId,
    email: data.email,
    labelId: data.labelId ?? null,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(emails).values(email);
  return email;
}

export async function deleteEmail(db: DB, id: string) {
  const existing = await db.query.emails.findFirst({
    where: eq(emails.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.EMAIL_NOT_FOUND, "Email not found");
  }

  await db.delete(emails).where(eq(emails.id, id));
}
