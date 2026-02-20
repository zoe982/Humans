import { eq, and } from "drizzle-orm";
import { phones, humans, accounts, phoneLabelsConfig } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

export async function listPhoneNumbers(db: DB) {
  const allPhones = await db.select().from(phones);
  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);
  const allLabels = await db.select().from(phoneLabelsConfig);

  const data = allPhones.map((p) => {
    let ownerName: string | null = null;
    let ownerDisplayId: string | null = null;
    if (p.ownerType === "human") {
      const human = allHumans.find((h) => h.id === p.ownerId);
      ownerName = human ? `${human.firstName} ${human.lastName}` : null;
      ownerDisplayId = human?.displayId ?? null;
    } else {
      const account = allAccounts.find((a) => a.id === p.ownerId);
      ownerName = account?.name ?? null;
      ownerDisplayId = account?.displayId ?? null;
    }
    const label = p.labelId ? allLabels.find((l) => l.id === p.labelId) : null;
    return {
      ...p,
      ownerName,
      ownerDisplayId,
      labelName: label?.name ?? null,
    };
  });

  return data;
}

export async function listPhoneNumbersForHuman(db: DB, humanId: string) {
  const results = await db
    .select()
    .from(phones)
    .where(and(eq(phones.ownerType, "human"), eq(phones.ownerId, humanId)));
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
  const displayId = await nextDisplayId(db, "FON");

  const phone = {
    id: createId(),
    displayId,
    ownerType: "human" as const,
    ownerId: data.humanId,
    phoneNumber: data.phoneNumber,
    labelId: data.labelId ?? null,
    hasWhatsapp: data.hasWhatsapp ?? false,
    isPrimary: data.isPrimary ?? false,
    createdAt: now,
  };

  await db.insert(phones).values(phone);
  return phone;
}

export async function updatePhoneNumber(
  db: DB,
  id: string,
  data: Record<string, unknown>,
) {
  const existing = await db.query.phones.findFirst({
    where: eq(phones.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.PHONE_NUMBER_NOT_FOUND, "Phone number not found");
  }

  await db
    .update(phones)
    .set(data)
    .where(eq(phones.id, id));

  const updated = await db.query.phones.findFirst({
    where: eq(phones.id, id),
  });
  return updated;
}

export async function deletePhoneNumber(db: DB, id: string) {
  const existing = await db.query.phones.findFirst({
    where: eq(phones.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.PHONE_NUMBER_NOT_FOUND, "Phone number not found");
  }

  await db.delete(phones).where(eq(phones.id, id));
}
