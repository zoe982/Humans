import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listMarketingAttributions,
  getMarketingAttribution,
} from "../../../src/services/marketing-attributions";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Minimal in-memory Supabase mock
// ---------------------------------------------------------------------------

interface MarketingAttributionRow {
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
}

interface SignupRow {
  id: string;
  marketing_attribution_id: string | null;
  first_name: string | null;
  last_name: string | null;
  display_id: string | null;
}

interface BookingRow {
  id: string;
  marketing_attribution_id: string | null;
  first_name: string | null;
  last_name: string | null;
  crm_display_id: string | null;
}

function now() {
  return new Date().toISOString();
}

function makeRow(overrides: Partial<MarketingAttributionRow> = {}): MarketingAttributionRow {
  const ts = now();
  return {
    id: `mat-${Date.now()}-${Math.random()}`,
    created_at: ts,
    crm_display_id: null,
    first_touch: null,
    last_touch: null,
    ft_captured_at: null,
    lt_captured_at: null,
    ft_landing_page_url: null,
    lt_landing_page_url: null,
    ft_referrer_url: null,
    lt_referrer_url: null,
    ft_utm_source: null,
    lt_utm_source: null,
    ft_utm_medium: null,
    lt_utm_medium: null,
    ft_utm_campaign: null,
    lt_utm_campaign: null,
    ft_utm_content: null,
    lt_utm_content: null,
    ft_utm_term: null,
    lt_utm_term: null,
    ft_gclid: null,
    lt_gclid: null,
    ft_gbraid: null,
    lt_gbraid: null,
    ft_wbraid: null,
    lt_wbraid: null,
    ft_fbclid: null,
    lt_fbclid: null,
    ft_fbp: null,
    lt_fbp: null,
    ft_fbc: null,
    lt_fbc: null,
    ft_li_fat_id: null,
    lt_li_fat_id: null,
    ...overrides,
  };
}

// Multi-table Supabase mock: marketing_attribution, announcement_signups, bookings
function makeSupabaseMock(
  attributions: MarketingAttributionRow[],
  signups: SignupRow[] = [],
  bookings: BookingRow[] = [],
) {
  const tables: Record<string, Record<string, unknown>[]> = {
    marketing_attribution: attributions,
    announcement_signups: signups,
    bookings: bookings,
  };

  function builder(rows: Record<string, unknown>[]) {
    let filtered = [...rows];
    const eqFilters: { col: string; val: unknown }[] = [];
    let updateData: Record<string, unknown> | null = null;

    const self: {
      select: (fields?: string) => typeof self;
      update: (data: Record<string, unknown>) => typeof self;
      eq: (col: string, val: unknown) => typeof self;
      order: (col: string, opts?: { ascending?: boolean }) => typeof self;
      overrideTypes: () => typeof self;
      single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
      then: (resolve: (result: { data: Record<string, unknown>[] | null; error: Error | null }) => void) => Promise<void>;
    } = {
      select() { return self; },
      update(data: Record<string, unknown>) { updateData = data; return self; },
      eq(col, val) { eqFilters.push({ col, val }); return self; },
      order() { return self; },
      overrideTypes() { return self; },
      single() {
        return Promise.resolve(execute()).then((res) => {
          if (res.error != null) return { data: null, error: res.error };
          const arr = res.data ?? [];
          return { data: arr[0] ?? null, error: null };
        });
      },
      then(resolve) {
        return Promise.resolve(execute()).then(resolve);
      },
    };

    function execute(): { data: Record<string, unknown>[] | null; error: Error | null } {
      // UPDATE
      if (updateData !== null) {
        filtered = [...rows];
        for (const f of eqFilters) {
          filtered = filtered.filter((r) => r[f.col] === f.val);
        }
        for (const r of filtered) {
          const idx = rows.findIndex((s) => s["id"] === r["id"]);
          if (idx !== -1) {
            rows[idx] = { ...rows[idx]!, ...updateData };
          }
        }
        const updated = filtered.map((r) => rows.find((s) => s["id"] === r["id"])!);
        return { data: updated, error: null };
      }

      // SELECT
      filtered = [...rows];
      for (const f of eqFilters) {
        filtered = filtered.filter((r) => r[f.col] === f.val);
      }
      return { data: filtered, error: null };
    }

    return self;
  }

  return {
    from(table: string) {
      const data = tables[table] ?? [];
      return builder(data as Record<string, unknown>[]);
    },
  } as unknown as SupabaseClient;
}

function makeSupabaseErrorMock(errorMessage: string) {
  const err = new Error(errorMessage);
  const failingBuilder = () => {
    const self: {
      select: () => typeof self;
      eq: () => typeof self;
      order: () => typeof self;
      overrideTypes: () => typeof self;
      single: () => Promise<{ data: null; error: Error }>;
      then: (resolve: (result: { data: null; error: Error }) => void) => Promise<void>;
    } = {
      select() { return self; },
      eq() { return self; },
      order() { return self; },
      overrideTypes() { return self; },
      single() { return Promise.resolve({ data: null, error: err }); },
      then(resolve) { return Promise.resolve(resolve({ data: null, error: err })); },
    };
    return self;
  };

  return {
    from() { return failingBuilder(); },
  } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// listMarketingAttributions
// ---------------------------------------------------------------------------

describe("listMarketingAttributions", () => {
  it("returns empty list when no attributions exist", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseMock([]);

    const result = await listMarketingAttributions(supabase, db);
    expect(result).toHaveLength(0);
  });

  it("returns attributions with camelCase API shape", async () => {
    const db = getTestDb();
    const row = makeRow({
      id: "mat-1",
      ft_utm_source: "google",
      lt_utm_source: "facebook",
      ft_utm_medium: "cpc",
      lt_utm_medium: "social",
    });
    const supabase = makeSupabaseMock([row]);

    const result = await listMarketingAttributions(supabase, db);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("mat-1");
    expect(result[0]!.ftUtmSource).toBe("google");
    expect(result[0]!.ltUtmSource).toBe("facebook");
    expect(result[0]!.ftUtmMedium).toBe("cpc");
    expect(result[0]!.ltUtmMedium).toBe("social");
  });

  it("assigns crm_display_id lazily via ensureDisplayIds", async () => {
    const db = getTestDb();
    const row = makeRow({ id: "mat-1", crm_display_id: null });
    const supabase = makeSupabaseMock([row]);

    const result = await listMarketingAttributions(supabase, db);
    expect(result[0]!.crmDisplayId).toMatch(/^MAT-/);
  });

  it("preserves existing crm_display_id", async () => {
    const db = getTestDb();
    const row = makeRow({ id: "mat-1", crm_display_id: "MAT-AAA-001" });
    const supabase = makeSupabaseMock([row]);

    const result = await listMarketingAttributions(supabase, db);
    expect(result[0]!.crmDisplayId).toBe("MAT-AAA-001");
  });

  it("enriches with linked route signup", async () => {
    const db = getTestDb();
    const row = makeRow({ id: "mat-1" });
    const signup: SignupRow = {
      id: "rs-1",
      marketing_attribution_id: "mat-1",
      first_name: "Jane",
      last_name: "Doe",
      display_id: "SIG-001",
    };
    const supabase = makeSupabaseMock([row], [signup]);

    const result = await listMarketingAttributions(supabase, db);
    expect(result[0]!.linkedLead).toMatchObject({
      leadType: "route_signup",
      leadId: "rs-1",
      leadDisplayId: "SIG-001",
      leadName: "Jane Doe",
    });
  });

  it("enriches with linked booking request", async () => {
    const db = getTestDb();
    const row = makeRow({ id: "mat-2" });
    const booking: BookingRow = {
      id: "bk-1",
      marketing_attribution_id: "mat-2",
      first_name: "John",
      last_name: "Smith",
      crm_display_id: "BOR-AAA-001",
    };
    const supabase = makeSupabaseMock([row], [], [booking]);

    const result = await listMarketingAttributions(supabase, db);
    expect(result[0]!.linkedLead).toMatchObject({
      leadType: "booking_request",
      leadId: "bk-1",
      leadDisplayId: "BOR-AAA-001",
      leadName: "John Smith",
    });
  });

  it("returns null linkedLead when no lead is linked", async () => {
    const db = getTestDb();
    const row = makeRow({ id: "mat-3" });
    const supabase = makeSupabaseMock([row]);

    const result = await listMarketingAttributions(supabase, db);
    expect(result[0]!.linkedLead).toBeNull();
  });

  it("maps all 34+ columns into camelCase", async () => {
    const db = getTestDb();
    const row = makeRow({
      id: "mat-full",
      crm_display_id: "MAT-AAA-005",
      ft_landing_page_url: "https://example.com/landing",
      lt_landing_page_url: "https://example.com/retarget",
      ft_referrer_url: "https://google.com",
      lt_referrer_url: "https://facebook.com",
      ft_utm_campaign: "spring_sale",
      lt_utm_campaign: "retarget_q1",
      ft_utm_content: "ad1",
      lt_utm_content: "ad2",
      ft_utm_term: "pet travel",
      lt_utm_term: "dog flights",
      ft_gclid: "gclid-123",
      lt_gclid: "gclid-456",
      ft_fbclid: "fb-123",
      lt_fbclid: "fb-456",
      ft_li_fat_id: "li-123",
      lt_li_fat_id: "li-456",
      first_touch: { custom: "data1" },
      last_touch: { custom: "data2" },
    });
    const supabase = makeSupabaseMock([row]);

    const result = await listMarketingAttributions(supabase, db);
    const a = result[0]!;
    expect(a.ftLandingPageUrl).toBe("https://example.com/landing");
    expect(a.ltLandingPageUrl).toBe("https://example.com/retarget");
    expect(a.ftReferrerUrl).toBe("https://google.com");
    expect(a.ltReferrerUrl).toBe("https://facebook.com");
    expect(a.ftUtmCampaign).toBe("spring_sale");
    expect(a.ltUtmCampaign).toBe("retarget_q1");
    expect(a.ftUtmContent).toBe("ad1");
    expect(a.ltUtmContent).toBe("ad2");
    expect(a.ftUtmTerm).toBe("pet travel");
    expect(a.ltUtmTerm).toBe("dog flights");
    expect(a.ftGclid).toBe("gclid-123");
    expect(a.ltGclid).toBe("gclid-456");
    expect(a.ftFbclid).toBe("fb-123");
    expect(a.ltFbclid).toBe("fb-456");
    expect(a.ftLiFatId).toBe("li-123");
    expect(a.ltLiFatId).toBe("li-456");
    expect(a.firstTouch).toEqual({ custom: "data1" });
    expect(a.lastTouch).toEqual({ custom: "data2" });
  });

  it("throws when Supabase returns error on attribution fetch", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseErrorMock("Connection failed");

    await expect(listMarketingAttributions(supabase, db)).rejects.toThrowError(
      "Supabase error: Connection failed",
    );
  });
});

// ---------------------------------------------------------------------------
// getMarketingAttribution
// ---------------------------------------------------------------------------

describe("getMarketingAttribution", () => {
  it("throws MARKETING_ATTRIBUTION_NOT_FOUND when not found", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseMock([]);

    await expect(getMarketingAttribution(supabase, db, "nonexistent")).rejects.toThrowError(
      "Marketing attribution not found",
    );
  });

  it("returns attribution with camelCase API shape", async () => {
    const db = getTestDb();
    const row = makeRow({
      id: "mat-1",
      ft_utm_source: "google",
      lt_utm_source: "direct",
    });
    const supabase = makeSupabaseMock([row]);

    const result = await getMarketingAttribution(supabase, db, "mat-1");
    expect(result.id).toBe("mat-1");
    expect(result.ftUtmSource).toBe("google");
    expect(result.ltUtmSource).toBe("direct");
  });

  it("assigns crm_display_id lazily when null", async () => {
    const db = getTestDb();
    const row = makeRow({ id: "mat-1", crm_display_id: null });
    const supabase = makeSupabaseMock([row]);

    const result = await getMarketingAttribution(supabase, db, "mat-1");
    expect(result.crmDisplayId).toMatch(/^MAT-/);
  });

  it("enriches with linked signup", async () => {
    const db = getTestDb();
    const row = makeRow({ id: "mat-1" });
    const signup: SignupRow = {
      id: "rs-1",
      marketing_attribution_id: "mat-1",
      first_name: "Alice",
      last_name: "Wong",
      display_id: "SIG-002",
    };
    const supabase = makeSupabaseMock([row], [signup]);

    const result = await getMarketingAttribution(supabase, db, "mat-1");
    expect(result.linkedLead).toMatchObject({
      leadType: "route_signup",
      leadId: "rs-1",
      leadName: "Alice Wong",
    });
  });

  it("enriches with linked booking", async () => {
    const db = getTestDb();
    const row = makeRow({ id: "mat-1" });
    const booking: BookingRow = {
      id: "bk-1",
      marketing_attribution_id: "mat-1",
      first_name: "Bob",
      last_name: "Lee",
      crm_display_id: "BOR-AAA-002",
    };
    const supabase = makeSupabaseMock([row], [], [booking]);

    const result = await getMarketingAttribution(supabase, db, "mat-1");
    expect(result.linkedLead).toMatchObject({
      leadType: "booking_request",
      leadId: "bk-1",
      leadName: "Bob Lee",
    });
  });

  it("returns null linkedLead when no lead is linked", async () => {
    const db = getTestDb();
    const row = makeRow({ id: "mat-1" });
    const supabase = makeSupabaseMock([row]);

    const result = await getMarketingAttribution(supabase, db, "mat-1");
    expect(result.linkedLead).toBeNull();
  });

  it("throws when Supabase returns error", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseErrorMock("DB error");

    await expect(getMarketingAttribution(supabase, db, "mat-1")).rejects.toThrowError(
      "Supabase error: DB error",
    );
  });
});
