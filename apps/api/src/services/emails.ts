import { eq } from "drizzle-orm";
import { humanEmails, humans } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import type { DB } from "./types";

export async function listEmails(db: DB) {
  const allEmails = await db.select().from(humanEmails);
  const allHumans = await db.select().from(humans);

  const data = allEmails.map((e) => {
    const human = allHumans.find((h) => h.id === e.humanId);
    return {
      ...e,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
    };
  });

  return data;
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

  const email = {
    id: createId(),
    humanId: data.humanId,
    email: data.email,
    labelId: data.labelId ?? null,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(humanEmails).values(email);
  return email;
}

export async function deleteEmail(db: DB, id: string) {
  const existing = await db.query.humanEmails.findFirst({
    where: eq(humanEmails.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.EMAIL_NOT_FOUND, "Email not found");
  }

  await db.delete(humanEmails).where(eq(humanEmails.id, id));
}
