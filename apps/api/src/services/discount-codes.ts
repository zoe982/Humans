import { eq } from "drizzle-orm";
import { humans, accounts } from "@humans/db/schema";
import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DB } from "./types";

interface SupabaseDiscountCode {
  id: string;
  code: string;
  description: string | null;
  percent_off: number;
  is_active: boolean;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
  crm_display_id: string | null;
  human_id: string | null;
  account_id: string | null;
}

function toApiShape(row: SupabaseDiscountCode) {
  return {
    id: row.id,
    code: row.code,
    description: row.description,
    percentOff: row.percent_off,
    isActive: row.is_active,
    maxUses: row.max_uses,
    timesUsed: row.times_used,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    crmDisplayId: row.crm_display_id,
    humanId: row.human_id,
    accountId: row.account_id,
  };
}

/**
 * Auto-assign crm_display_id to discount codes that don't have one yet.
 */
async function ensureDiscountCodeDisplayIds(
  supabase: SupabaseClient,
  db: DB,
  rows: SupabaseDiscountCode[],
): Promise<void> {
  for (const row of rows) {
    if (row.crm_display_id == null) {
      const displayId = await nextDisplayId(db, "DIS");
      const { error } = await supabase
        .from("discount_codes")
        .update({ crm_display_id: displayId })
        .eq("id", row.id);
      if (!error) {
        row.crm_display_id = displayId;
      }
    }
  }
}

export async function listDiscountCodes(supabase: SupabaseClient, db: DB) {
  const { data: codes, error } = await supabase
    .from("discount_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Supabase error: ${error.message}`);

  const typedCodes = codes as SupabaseDiscountCode[];
  await ensureDiscountCodeDisplayIds(supabase, db, typedCodes);

  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);

  const data = typedCodes.map((dc) => {
    const mapped = toApiShape(dc);
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

export async function getDiscountCode(supabase: SupabaseClient, db: DB, id: string) {
  const { data: codes, error } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("id", id);

  if (error) throw new Error(`Supabase error: ${error.message}`);
  if (!codes || codes.length === 0) {
    throw notFound(ERROR_CODES.DISCOUNT_CODE_NOT_FOUND, "Discount code not found");
  }

  const typedCodes = codes as SupabaseDiscountCode[];
  await ensureDiscountCodeDisplayIds(supabase, db, typedCodes);

  const dc = toApiShape(typedCodes[0]);

  const allHumans = await db.select().from(humans);
  const allAccounts = await db.select().from(accounts);

  const human = dc.humanId ? allHumans.find((h) => h.id === dc.humanId) : null;
  const account = dc.accountId ? allAccounts.find((a) => a.id === dc.accountId) : null;

  // Fetch linked flights via junction table
  const { data: flightLinks } = await supabase
    .from("discount_code_flights")
    .select("flight_id")
    .eq("discount_code_id", id);

  let linkedFlights: { id: string; crmDisplayId: string | null; originCity: string | null; destinationCity: string | null; flightDate: string | null }[] = [];

  if (flightLinks && flightLinks.length > 0) {
    const flightIds = flightLinks.map((fl: { flight_id: string }) => fl.flight_id);
    const { data: flights } = await supabase
      .from("flights")
      .select("id, crm_display_id, origin_city, destination_city, flight_date")
      .in("id", flightIds);

    if (flights) {
      linkedFlights = (flights as { id: string; crm_display_id: string | null; origin_city: string | null; destination_city: string | null; flight_date: string | null }[]).map((f) => ({
        id: f.id,
        crmDisplayId: f.crm_display_id,
        originCity: f.origin_city,
        destinationCity: f.destination_city,
        flightDate: f.flight_date,
      }));
    }
  }

  return {
    ...dc,
    humanName: human ? `${human.firstName} ${human.lastName}` : null,
    humanDisplayId: human?.displayId ?? null,
    accountName: account?.name ?? null,
    accountDisplayId: account?.displayId ?? null,
    linkedFlights,
  };
}

export async function updateDiscountCode(
  supabase: SupabaseClient,
  id: string,
  data: {
    humanId?: string | null;
    accountId?: string | null;
  },
) {
  const { data: existing, error: fetchError } = await supabase
    .from("discount_codes")
    .select("id")
    .eq("id", id);

  if (fetchError) throw new Error(`Supabase error: ${fetchError.message}`);
  if (!existing || existing.length === 0) {
    throw notFound(ERROR_CODES.DISCOUNT_CODE_NOT_FOUND, "Discount code not found");
  }

  const updates: Record<string, unknown> = {};
  if (data.humanId !== undefined) updates["human_id"] = data.humanId;
  if (data.accountId !== undefined) updates["account_id"] = data.accountId;

  const { data: updated, error } = await supabase
    .from("discount_codes")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(`Supabase error: ${error.message}`);

  return toApiShape(updated as SupabaseDiscountCode);
}

export async function getDiscountCodesForFlight(supabase: SupabaseClient, db: DB, flightId: string) {
  const { data: flightLinks } = await supabase
    .from("discount_code_flights")
    .select("discount_code_id")
    .eq("flight_id", flightId);

  if (!flightLinks || flightLinks.length === 0) return [];

  const codeIds = flightLinks.map((fl: { discount_code_id: string }) => fl.discount_code_id);
  const { data: codes, error } = await supabase
    .from("discount_codes")
    .select("*")
    .in("id", codeIds);

  if (error) throw new Error(`Supabase error: ${error.message}`);

  const typedCodes = (codes ?? []) as SupabaseDiscountCode[];
  await ensureDiscountCodeDisplayIds(supabase, db, typedCodes);

  const allHumans = await db.select().from(humans);

  return typedCodes.map((dc) => {
    const mapped = toApiShape(dc);
    const human = mapped.humanId ? allHumans.find((h) => h.id === mapped.humanId) : null;
    return {
      ...mapped,
      humanName: human ? `${human.firstName} ${human.lastName}` : null,
    };
  });
}

export async function getDiscountCodesForHuman(supabase: SupabaseClient, humanId: string) {
  const { data: codes } = await supabase
    .from("discount_codes")
    .select("id, crm_display_id, code, description, percent_off, is_active")
    .eq("human_id", humanId);

  return (codes ?? []).map((dc: { id: string; crm_display_id: string | null; code: string; description: string | null; percent_off: number; is_active: boolean }) => ({
    id: dc.id,
    crmDisplayId: dc.crm_display_id,
    code: dc.code,
    description: dc.description,
    percentOff: dc.percent_off,
    isActive: dc.is_active,
  }));
}

export async function getDiscountCodesForAccount(supabase: SupabaseClient, accountId: string) {
  const { data: codes } = await supabase
    .from("discount_codes")
    .select("id, crm_display_id, code, description, percent_off, is_active")
    .eq("account_id", accountId);

  return (codes ?? []).map((dc: { id: string; crm_display_id: string | null; code: string; description: string | null; percent_off: number; is_active: boolean }) => ({
    id: dc.id,
    crmDisplayId: dc.crm_display_id,
    code: dc.code,
    description: dc.description,
    percentOff: dc.percent_off,
    isActive: dc.is_active,
  }));
}
