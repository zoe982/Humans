import { eq } from "drizzle-orm";
import { humanPhoneNumbers, humans } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import type { DB } from "./types";

export async function listPhoneNumbers(db: DB) {
  const allPhones = await db.select().from(humanPhoneNumbers);
  const allHumans = await db.select().from(humans);

  const data = allPhones.map((p) => {
    const human = allHumans.find((h) => h.id === p.humanId);
    return {
      ...p,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
    };
  });

  return data;
}

export async function listPhoneNumbersForHuman(db: DB, humanId: string) {
  const results = await db
    .select()
    .from(humanPhoneNumbers)
    .where(eq(humanPhoneNumbers.humanId, humanId));
  return results;
}

export async function createPhoneNumber(
  db: DB,
  data: {
    humanId: string;
    phoneNumber: string;
    labelId?: string | null;
    hasWhatsapp?: boolean;
    isPrimary?: boolean;
  },
) {
  const now = new Date().toISOString();

  const phone = {
    id: createId(),
    humanId: data.humanId,
    phoneNumber: data.phoneNumber,
    labelId: data.labelId ?? null,
    hasWhatsapp: data.hasWhatsapp ?? false,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(humanPhoneNumbers).values(phone);
  return phone;
}

export async function updatePhoneNumber(
  db: DB,
  id: string,
  data: Record<string, unknown>,
) {
  const existing = await db.query.humanPhoneNumbers.findFirst({
    where: eq(humanPhoneNumbers.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.PHONE_NUMBER_NOT_FOUND, "Phone number not found");
  }

  await db
    .update(humanPhoneNumbers)
    .set(data)
    .where(eq(humanPhoneNumbers.id, id));

  const updated = await db.query.humanPhoneNumbers.findFirst({
    where: eq(humanPhoneNumbers.id, id),
  });
  return updated;
}

export async function deletePhoneNumber(db: DB, id: string) {
  const existing = await db.query.humanPhoneNumbers.findFirst({
    where: eq(humanPhoneNumbers.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.PHONE_NUMBER_NOT_FOUND, "Phone number not found");
  }

  await db.delete(humanPhoneNumbers).where(eq(humanPhoneNumbers.id, id));
}
