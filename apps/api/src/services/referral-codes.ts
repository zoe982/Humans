import { eq } from "drizzle-orm";
import { humans, accounts } from "@humans/db/schema";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DB } from "./types";

interface SupabaseReferralCode {
  id: string;
  display_id: string;
  code: string;
  description: string | null;
  is_active: boolean;
  max_uses: number | null;
  expires_at: string | null;
  whatsapp_clicks: number;
  human_id: string | null;
  account_id: string | null;
  created_at: string;
  updated_at: string | null;
}

function toApiShape(row: SupabaseReferralCode) {
  return {
    id: row.id,
    displayId: row.display_id,
    code: row.code,
    description: row.description,
    isActive: row.is_active,
    maxUses: row.max_uses,
    expiresAt: row.expires_at,
    whatsappClicks: row.whatsapp_clicks,
    humanId: row.human_id,
    accountId: row.account_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listReferralCodes(supabase: SupabaseClient, db: DB) {
  const { data: codes, error } = await supabase
    .from("referral_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Supabase error: ${error.message}`);

  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);

  const data = (codes as SupabaseReferralCode[]).map((rc) => {
    const mapped = toApiShape(rc);
    const human = mapped.humanId ? allHumans.find((h) => h.id === mapped.humanId) : null;
    const account = mapped.accountId ? allAccounts.find((a) => a.id === mapped.accountId) : null;
    return {
      ...mapped,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
      humanDisplayId: human?.displayId ?? null,
      accountName: account?.name ?? null,
      accountDisplayId: account?.displayId ?? null,
    };
  });

  return data;
}

export async function getReferralCode(supabase: SupabaseClient, db: DB, id: string) {
  const { data: codes, error } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("id", id);

  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!codes || codes.length === 0) {
    throw notFound(ERROR_CODES.REFERRAL_CODE_NOT_FOUND, "Referral code not found");
  }

  const rc = toApiShape(codes[0] as SupabaseReferralCode);

  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);

  const human = rc.humanId ? allHumans.find((h) => h.id === rc.humanId) : null;
  const account = rc.accountId ? allAccounts.find((a) => a.id === rc.accountId) : null;

  return {
    ...rc,
    humanName: human ? `${human.firstName} ${human.lastName}` : null,
    humanDisplayId: human?.displayId ?? null,
    accountName: account?.name ?? null,
    accountDisplayId: account?.displayId ?? null,
  };
}

export async function createReferralCode(
  supabase: SupabaseClient,
  db: DB,
  data: {
    code: string;
    description?: string | null;
    isActive?: boolean;
    humanId?: string | null;
    accountId?: string | null;
  },
) {
  const displayId = await nextDisplayId(db, "REF");

  const { data: inserted, error } = await supabase
    .from("referral_codes")
    .insert({
      display_id: displayId,
      code: data.code,
      description: data.description ?? null,
      is_active: data.isActive ?? true,
      human_id: data.humanId ?? null,
      account_id: data.accountId ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Supabase error: ${error.message}`);

  return toApiShape(inserted as SupabaseReferralCode);
}

export async function updateReferralCode(
  supabase: SupabaseClient,
  id: string,
  data: {
    code?: string;
    description?: string | null;
    isActive?: boolean;
    humanId?: string | null;
    accountId?: string | null;
  },
) {
  // Check existence
  const { data: existing, error: fetchError } = await supabase
    .from("referral_codes")
    .select("id")
    .eq("id", id);

  if (fetchError) throw new Error(`Supabase error: ${fetchError.message}`);
  if (!existing || existing.length === 0) {
    throw notFound(ERROR_CODES.REFERRAL_CODE_NOT_FOUND, "Referral code not found");
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.code !== undefined) updates["code"] = data.code;
  if (data.description !== undefined) updates["description"] = data.description;
  if (data.isActive !== undefined) updates["is_active"] = data.isActive;
  if (data.humanId !== undefined) updates["human_id"] = data.humanId;
  if (data.accountId !== undefined) updates["account_id"] = data.accountId;

  const { data: updated, error } = await supabase
    .from("referral_codes")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(`Supabase error: ${error.message}`);

  return toApiShape(updated as SupabaseReferralCode);
}

export async function deleteReferralCode(supabase: SupabaseClient, id: string) {
  // Check existence
  const { data: existing, error: fetchError } = await supabase
    .from("referral_codes")
    .select("id")
    .eq("id", id);

  if (fetchError) throw new Error(`Supabase error: ${fetchError.message}`);
  if (!existing || existing.length === 0) {
    throw notFound(ERROR_CODES.REFERRAL_CODE_NOT_FOUND, "Referral code not found");
  }

  const { error } = await supabase
    .from("referral_codes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Supabase error: ${error.message}`);
}
