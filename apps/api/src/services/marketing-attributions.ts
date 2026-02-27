import { ERROR_CODES } from "@humans/shared";
import { notFound } from "../lib/errors";
import { nextDisplayId } from "../lib/display-id";
import { assertUniqueIds } from "../lib/assert-unique-ids";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DB } from "./types";

interface SupabaseMarketingAttribution {
  id: string;
  created_at: string;
  crm_display_id: string | null;
  first_touch: Record<string, unknown> | null;
  last_touch: Record<string, unknown> | null;
  ft_captured_at: string | null;
  lt_captured_at: string | null;
  ft_landing_page_url: string | null;
  lt_landing_page_url: string | null;
  ft_referrer_url: string | null;
  lt_referrer_url: string | null;
  ft_utm_source: string | null;
  lt_utm_source: string | null;
  ft_utm_medium: string | null;
  lt_utm_medium: string | null;
  ft_utm_campaign: string | null;
  lt_utm_campaign: string | null;
  ft_utm_content: string | null;
  lt_utm_content: string | null;
  ft_utm_term: string | null;
  lt_utm_term: string | null;
  ft_gclid: string | null;
  lt_gclid: string | null;
  ft_gbraid: string | null;
  lt_gbraid: string | null;
  ft_wbraid: string | null;
  lt_wbraid: string | null;
  ft_fbclid: string | null;
  lt_fbclid: string | null;
  ft_fbp: string | null;
  lt_fbp: string | null;
  ft_fbc: string | null;
  lt_fbc: string | null;
  ft_li_fat_id: string | null;
  lt_li_fat_id: string | null;
  trigger_event: string | null;
  event_metadata: Record<string, unknown> | null;
}

interface MarketingAttributionApiShape {
  id: string;
  createdAt: string;
  crmDisplayId: string | null;
  firstTouch: Record<string, unknown> | null;
  lastTouch: Record<string, unknown> | null;
  ftCapturedAt: string | null;
  ltCapturedAt: string | null;
  ftLandingPageUrl: string | null;
  ltLandingPageUrl: string | null;
  ftReferrerUrl: string | null;
  ltReferrerUrl: string | null;
  ftUtmSource: string | null;
  ltUtmSource: string | null;
  ftUtmMedium: string | null;
  ltUtmMedium: string | null;
  ftUtmCampaign: string | null;
  ltUtmCampaign: string | null;
  ftUtmContent: string | null;
  ltUtmContent: string | null;
  ftUtmTerm: string | null;
  ltUtmTerm: string | null;
  ftGclid: string | null;
  ltGclid: string | null;
  ftGbraid: string | null;
  ltGbraid: string | null;
  ftWbraid: string | null;
  ltWbraid: string | null;
  ftFbclid: string | null;
  ltFbclid: string | null;
  ftFbp: string | null;
  ltFbp: string | null;
  ftFbc: string | null;
  ltFbc: string | null;
  ftLiFatId: string | null;
  ltLiFatId: string | null;
  triggerEvent: string | null;
  eventMetadata: Record<string, unknown> | null;
}

function toApiShape(row: SupabaseMarketingAttribution): MarketingAttributionApiShape {
  return {
    id: row.id,
    createdAt: row.created_at,
    crmDisplayId: row.crm_display_id,
    firstTouch: row.first_touch,
    lastTouch: row.last_touch,
    ftCapturedAt: row.ft_captured_at,
    ltCapturedAt: row.lt_captured_at,
    ftLandingPageUrl: row.ft_landing_page_url,
    ltLandingPageUrl: row.lt_landing_page_url,
    ftReferrerUrl: row.ft_referrer_url,
    ltReferrerUrl: row.lt_referrer_url,
    ftUtmSource: row.ft_utm_source,
    ltUtmSource: row.lt_utm_source,
    ftUtmMedium: row.ft_utm_medium,
    ltUtmMedium: row.lt_utm_medium,
    ftUtmCampaign: row.ft_utm_campaign,
    ltUtmCampaign: row.lt_utm_campaign,
    ftUtmContent: row.ft_utm_content,
    ltUtmContent: row.lt_utm_content,
    ftUtmTerm: row.ft_utm_term,
    ltUtmTerm: row.lt_utm_term,
    ftGclid: row.ft_gclid,
    ltGclid: row.lt_gclid,
    ftGbraid: row.ft_gbraid,
    ltGbraid: row.lt_gbraid,
    ftWbraid: row.ft_wbraid,
    ltWbraid: row.lt_wbraid,
    ftFbclid: row.ft_fbclid,
    ltFbclid: row.lt_fbclid,
    ftFbp: row.ft_fbp,
    ltFbp: row.lt_fbp,
    ftFbc: row.ft_fbc,
    ltFbc: row.lt_fbc,
    ftLiFatId: row.ft_li_fat_id,
    ltLiFatId: row.lt_li_fat_id,
    triggerEvent: row.trigger_event,
    eventMetadata: row.event_metadata,
  };
}

async function ensureDisplayIds(
  supabase: SupabaseClient,
  db: DB,
  rows: SupabaseMarketingAttribution[],
): Promise<void> {
  for (const row of rows) {
    if (row.crm_display_id == null) {
      const displayId = await nextDisplayId(db, "MAT");
      const { error } = await supabase
        .from("marketing_attribution")
        .update({ crm_display_id: displayId })
        .eq("id", row.id);
      if (error == null) {
        row.crm_display_id = displayId;
      }
    }
  }
}

interface LinkedLead {
  leadType: "route_signup" | "booking_request";
  leadId: string;
  leadDisplayId: string | null;
  leadName: string | null;
}

async function findLinkedLeads(
  supabase: SupabaseClient,
  attributionIds: string[],
): Promise<Map<string, LinkedLead>> {
  const map = new Map<string, LinkedLead>();
  if (attributionIds.length === 0) return map;

  // Check announcement_signups
  for (const attrId of attributionIds) {
    const { data: signups } = await supabase
      .from("announcement_signups")
      .select("id, marketing_attribution_id, first_name, last_name, display_id")
      .eq("marketing_attribution_id", attrId)
      .overrideTypes<{ id: string; marketing_attribution_id: string; first_name: string | null; last_name: string | null; display_id: string | null }[], { merge: false }>();

    if (signups != null && signups.length > 0) {
      const s = signups[0];
      if (s == null) continue;
      const joined = [s.first_name, s.last_name].filter(Boolean).join(" ");
      const name = joined !== "" ? joined : null;
      map.set(attrId, {
        leadType: "route_signup",
        leadId: s.id,
        leadDisplayId: s.display_id,
        leadName: name,
      });
      continue;
    }

    // Check bookings
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, marketing_attribution_id, first_name, last_name, crm_display_id")
      .eq("marketing_attribution_id", attrId)
      .overrideTypes<{ id: string; marketing_attribution_id: string; first_name: string | null; last_name: string | null; crm_display_id: string | null }[], { merge: false }>();

    if (bookings != null && bookings.length > 0) {
      const b = bookings[0];
      if (b == null) continue;
      const joined = [b.first_name, b.last_name].filter(Boolean).join(" ");
      const name = joined !== "" ? joined : null;
      map.set(attrId, {
        leadType: "booking_request",
        leadId: b.id,
        leadDisplayId: b.crm_display_id,
        leadName: name,
      });
    }
  }

  return map;
}

export async function listMarketingAttributions(
  supabase: SupabaseClient,
  db: DB,
): Promise<(MarketingAttributionApiShape & { linkedLead: LinkedLead | null })[]> {
  const { data: attributions, error } = await supabase
    .from("marketing_attribution")
    .select("*")
    .order("created_at", { ascending: false })
    .overrideTypes<SupabaseMarketingAttribution[], { merge: false }>();

  if (error != null) throw new Error(`Supabase error: ${error.message}`);

  const typed: SupabaseMarketingAttribution[] = attributions;
  await ensureDisplayIds(supabase, db, typed);

  const linkedLeads = await findLinkedLeads(
    supabase,
    typed.map((a) => a.id),
  );

  const results = typed.map((row) => ({
    ...toApiShape(row),
    linkedLead: linkedLeads.get(row.id) ?? null,
  }));
  return assertUniqueIds(results, "marketing-attributions");
}

export async function getMarketingAttribution(
  supabase: SupabaseClient,
  db: DB,
  id: string,
): Promise<MarketingAttributionApiShape & { linkedLead: LinkedLead | null }> {
  const { data: attributions, error } = await supabase
    .from("marketing_attribution")
    .select("*")
    .eq("id", id)
    .overrideTypes<SupabaseMarketingAttribution[], { merge: false }>();

  if (error != null) throw new Error(`Supabase error: ${error.message}`);
  if (attributions.length === 0) {
    throw notFound(ERROR_CODES.MARKETING_ATTRIBUTION_NOT_FOUND, "Marketing attribution not found");
  }

  const typed: SupabaseMarketingAttribution[] = attributions;
  await ensureDisplayIds(supabase, db, typed);

  const linkedLeads = await findLinkedLeads(supabase, [id]);

  const first = typed[0];
  if (first == null) {
    throw notFound(ERROR_CODES.MARKETING_ATTRIBUTION_NOT_FOUND, "Marketing attribution not found");
  }
  return {
    ...toApiShape(first),
    linkedLead: linkedLeads.get(id) ?? null,
  };
}
