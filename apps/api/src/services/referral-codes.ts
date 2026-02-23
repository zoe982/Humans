import { eq } from "drizzle-orm";
import { referralCodes, humans, accounts } from "@humans/db/schema";
import { createId } from "@humans/db";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { DB } from "./types";

export async function listReferralCodes(db: DB) {
  const allCodes = await db.select().from(referralCodes);
  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);

  const data = allCodes.map((rc) => {
    const human = rc.humanId ? allHumans.find((h) => h.id === rc.humanId) : null;
    const account = rc.accountId ? allAccounts.find((a) => a.id === rc.accountId) : null;
    return {
      ...rc,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
      humanDisplayId: human?.displayId ?? null,
      accountName: account?.name ?? null,
      accountDisplayId: account?.displayId ?? null,
    };
  });

  return data;
}

export async function getReferralCode(db: DB, id: string) {
  const result = await db.select().from(referralCodes).where(eq(referralCodes.id, id));
  const referralCode = result[0];
  if (referralCode == null) {
    throw notFound(ERROR_CODES.REFERRAL_CODE_NOT_FOUND, "Referral code not found");
  }

  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);

  const human = referralCode.humanId ? allHumans.find((h) => h.id === referralCode.humanId) : null;
  const account = referralCode.accountId ? allAccounts.find((a) => a.id === referralCode.accountId) : null;

  return {
    ...referralCode,
    humanName: human ? `${human.firstName} ${human.lastName}` : null,
    humanDisplayId: human?.displayId ?? null,
    accountName: account?.name ?? null,
    accountDisplayId: account?.displayId ?? null,
  };
}

export async function createReferralCode(
  db: DB,
  data: {
    code: string;
    description?: string | null;
    isActive?: boolean;
    humanId?: string | null;
    accountId?: string | null;
  },
) {
  const now = new Date().toISOString();
  const displayId = await nextDisplayId(db, "REF");

  const record = {
    id: createId(),
    displayId,
    code: data.code,
    description: data.description ?? null,
    isActive: data.isActive ?? true,
    humanId: data.humanId ?? null,
    accountId: data.accountId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(referralCodes).values(record);
  return record;
}

export async function updateReferralCode(
  db: DB,
  id: string,
  data: Record<string, unknown>,
) {
  const existing = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.REFERRAL_CODE_NOT_FOUND, "Referral code not found");
  }

  await db
    .update(referralCodes)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(referralCodes.id, id));

  const updated = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.id, id),
  });
  return updated;
}

export async function deleteReferralCode(db: DB, id: string) {
  const existing = await db.query.referralCodes.findFirst({
    where: eq(referralCodes.id, id),
  });
  if (existing == null) {
    throw notFound(ERROR_CODES.REFERRAL_CODE_NOT_FOUND, "Referral code not found");
  }

  await db.delete(referralCodes).where(eq(referralCodes.id, id));
}
