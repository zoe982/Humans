import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listDiscountCodes,
  getDiscountCode,
  updateDiscountCode,
  getDiscountCodesForFlight,
  getDiscountCodesForHuman,
  getDiscountCodesForAccount,
} from "../../../src/services/discount-codes";
import * as schema from "@humans/db/schema";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Row types for in-memory mock stores
// ---------------------------------------------------------------------------

interface DiscountCodeRow {
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

interface FlightLinkRow {
  discount_code_id: string;
  flight_id: string;
}

interface FlightRow {
  id: string;
  crm_display_id: string | null;
  origin_city: string | null;
  destination_city: string | null;
  flight_date: string | null;
}

interface MockStores {
  discount_codes: DiscountCodeRow[];
  discount_code_flights: FlightLinkRow[];
  flights: FlightRow[];
}

// ---------------------------------------------------------------------------
// Chainable Supabase builder mock
// ---------------------------------------------------------------------------

function makeSupabaseMock(stores: MockStores) {
  function tableBuilder(tableName: keyof MockStores) {
    let eqFilters: { col: string; val: unknown }[] = [];
    let inFilters: { col: string; vals: unknown[] }[] = [];
    let insertData: Record<string, unknown> | null = null;
    let updateData: Record<string, unknown> | null = null;
    let doDelete = false;
    let orderField: string | null = null;
    let orderAsc = true;
    let singleMode = false;
    let selectFields = "*";

    function execute(): { data: unknown[] | null; error: Error | null } {
      const store = stores[tableName] as Record<string, unknown>[];

      // INSERT
      if (insertData !== null) {
        const newRow = { ...insertData };
        if (!newRow["id"]) newRow["id"] = `${tableName}-${Date.now()}-${Math.random()}`;
        store.push(newRow as Record<string, unknown>);
        return { data: [newRow], error: null };
      }

      // DELETE
      if (doDelete) {
        let toRemove = [...store];
        for (const f of eqFilters) {
          toRemove = toRemove.filter((r) => r[f.col] === f.val);
        }
        for (const r of toRemove) {
          const idx = store.findIndex((s) => s["id"] === r["id"]);
          if (idx !== -1) store.splice(idx, 1);
        }
        return { data: [], error: null };
      }

      // UPDATE
      if (updateData !== null) {
        let matched = [...store];
        for (const f of eqFilters) {
          matched = matched.filter((r) => r[f.col] === f.val);
        }
        for (const r of matched) {
          const idx = store.findIndex((s) => s["id"] === r["id"]);
          if (idx !== -1) {
            store[idx] = { ...store[idx]!, ...updateData } as Record<string, unknown>;
          }
        }
        const updated = matched.map((r) => store.find((s) => s["id"] === r["id"])!);
        return { data: updated, error: null };
      }

      // SELECT
      let filtered = [...store];
      for (const f of eqFilters) {
        filtered = filtered.filter((r) => r[f.col] === f.val);
      }
      for (const f of inFilters) {
        filtered = filtered.filter((r) => f.vals.includes(r[f.col]));
      }
      if (orderField) {
        filtered.sort((a, b) => {
          const av = (a[orderField!] as string) ?? "";
          const bv = (b[orderField!] as string) ?? "";
          return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }

      // Field projection for partial selects (discount codes for human/account)
      if (selectFields !== "*") {
        const fields = selectFields.split(",").map((f) => f.trim());
        filtered = filtered.map((row) => {
          const projected: Record<string, unknown> = {};
          for (const f of fields) projected[f] = row[f];
          return projected;
        });
      }

      return { data: filtered, error: null };
    }

    const self = {
      select(fields = "*") {
        selectFields = fields;
        return self;
      },
      insert(data: Record<string, unknown>) {
        insertData = data;
        return self;
      },
      update(data: Record<string, unknown>) {
        updateData = data;
        return self;
      },
      delete() {
        doDelete = true;
        return self;
      },
      eq(col: string, val: unknown) {
        eqFilters.push({ col, val });
        return self;
      },
      in(col: string, vals: unknown[]) {
        inFilters.push({ col, vals });
        return self;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        orderField = col;
        orderAsc = opts?.ascending ?? true;
        return self;
      },
      single(): Promise<{ data: unknown; error: Error | null }> {
        return Promise.resolve(execute()).then((res) => {
          if (res.error) return { data: null, error: res.error };
          const arr = res.data ?? [];
          return { data: arr[0] ?? null, error: null };
        });
      },
      then(
        resolve: (result: { data: unknown[] | null; error: Error | null }) => void,
      ): Promise<void> {
        return Promise.resolve(execute()).then(resolve);
      },
    };

    return self;
  }

  const client = {
    from(table: string) {
      return tableBuilder(table as keyof MockStores);
    },
  };

  return client as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;
function nextDisplayId(prefix: string) {
  seedCounter++;
  return `${prefix}-${String(seedCounter).padStart(6, "0")}`;
}

async function seedHuman(
  db: ReturnType<typeof getTestDb>,
  id = "h-1",
  first = "John",
  last = "Doe",
) {
  const ts = now();
  await db.insert(schema.humans).values({
    id,
    displayId: nextDisplayId("HUM"),
    firstName: first,
    lastName: last,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedAccount(
  db: ReturnType<typeof getTestDb>,
  id = "acc-1",
  name = "Test Corp",
) {
  const ts = now();
  await db.insert(schema.accounts).values({
    id,
    displayId: nextDisplayId("ACC"),
    name,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

function makeDiscountCodeRow(overrides: Partial<DiscountCodeRow> = {}): DiscountCodeRow {
  seedCounter++;
  return {
    id: `dc-${seedCounter}`,
    code: `CODE${seedCounter}`,
    description: null,
    percent_off: 10,
    is_active: true,
    max_uses: null,
    times_used: 0,
    expires_at: null,
    created_at: now(),
    created_by: null,
    crm_display_id: null,
    human_id: null,
    account_id: null,
    ...overrides,
  };
}

function makeFlightRow(overrides: Partial<FlightRow> = {}): FlightRow {
  seedCounter++;
  return {
    id: `flt-${seedCounter}`,
    crm_display_id: `FLY-${String(seedCounter).padStart(6, "0")}`,
    origin_city: "London",
    destination_city: "Malta",
    flight_date: "2026-06-01",
    ...overrides,
  };
}

function makeStores(
  codes: DiscountCodeRow[] = [],
  links: FlightLinkRow[] = [],
  flights: FlightRow[] = [],
): MockStores {
  return {
    discount_codes: codes,
    discount_code_flights: links,
    flights,
  };
}

// ---------------------------------------------------------------------------
// listDiscountCodes
// ---------------------------------------------------------------------------

describe("listDiscountCodes", () => {
  it("returns empty list when no discount codes exist", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseMock(makeStores());

    const result = await listDiscountCodes(supabase, db);
    expect(result).toHaveLength(0);
  });

  it("returns discount codes with null enrichment when no owner", async () => {
    const db = getTestDb();
    const row = makeDiscountCodeRow({ id: "dc-1", code: "SUMMER20" });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await listDiscountCodes(supabase, db);
    expect(result).toHaveLength(1);
    expect(result[0]!.code).toBe("SUMMER20");
    expect(result[0]!.humanName).toBeNull();
    expect(result[0]!.humanDisplayId).toBeNull();
    expect(result[0]!.accountName).toBeNull();
    expect(result[0]!.accountDisplayId).toBeNull();
  });

  it("enriches discount code with human name and displayId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    const row = makeDiscountCodeRow({ id: "dc-1", code: "ALICE10", human_id: "h-1" });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await listDiscountCodes(supabase, db);
    expect(result).toHaveLength(1);
    expect(result[0]!.humanName).toBe("Alice Smith");
    expect(result[0]!.humanDisplayId).toMatch(/^HUM-/);
    expect(result[0]!.accountName).toBeNull();
  });

  it("enriches discount code with account name and displayId", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Acme Corp");
    const row = makeDiscountCodeRow({ id: "dc-1", code: "ACME30", account_id: "acc-1" });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await listDiscountCodes(supabase, db);
    expect(result).toHaveLength(1);
    expect(result[0]!.accountName).toBe("Acme Corp");
    expect(result[0]!.accountDisplayId).toMatch(/^ACC-/);
    expect(result[0]!.humanName).toBeNull();
  });

  it("returns multiple codes with mixed enrichment", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Bob", "Jones");
    await seedAccount(db, "acc-1", "Big Co");

    const codes = [
      makeDiscountCodeRow({ id: "dc-1", code: "BOB", human_id: "h-1" }),
      makeDiscountCodeRow({ id: "dc-2", code: "BIGCO", account_id: "acc-1" }),
      makeDiscountCodeRow({ id: "dc-3", code: "ORPHAN" }),
    ];
    const supabase = makeSupabaseMock(makeStores(codes));

    const result = await listDiscountCodes(supabase, db);
    expect(result).toHaveLength(3);

    const bob = result.find((r) => r.id === "dc-1");
    expect(bob!.humanName).toBe("Bob Jones");
    expect(bob!.accountName).toBeNull();

    const bigco = result.find((r) => r.id === "dc-2");
    expect(bigco!.accountName).toBe("Big Co");
    expect(bigco!.humanName).toBeNull();
  });

  it("assigns crm_display_id to codes that are missing one", async () => {
    const db = getTestDb();
    const row = makeDiscountCodeRow({ id: "dc-1", code: "NODISPLAY", crm_display_id: null });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await listDiscountCodes(supabase, db);
    // After ensureDiscountCodeDisplayIds runs, crmDisplayId is set
    expect(result[0]!.crmDisplayId).toMatch(/^DIS-/);
  });

  it("does not reassign crm_display_id to codes that already have one", async () => {
    const db = getTestDb();
    const row = makeDiscountCodeRow({
      id: "dc-1",
      code: "EXISTING",
      crm_display_id: "DIS-AAA-001",
    });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await listDiscountCodes(supabase, db);
    expect(result[0]!.crmDisplayId).toBe("DIS-AAA-001");
  });

  it("maps snake_case fields to camelCase API shape", async () => {
    const db = getTestDb();
    const row = makeDiscountCodeRow({
      id: "dc-1",
      code: "CAMEL",
      percent_off: 25,
      is_active: false,
      max_uses: 200,
      times_used: 5,
      expires_at: "2026-12-31",
      created_by: "col-1",
    });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await listDiscountCodes(supabase, db);
    expect(result[0]!.percentOff).toBe(25);
    expect(result[0]!.isActive).toBe(false);
    expect(result[0]!.maxUses).toBe(200);
    expect(result[0]!.timesUsed).toBe(5);
    expect(result[0]!.expiresAt).toBe("2026-12-31");
    expect(result[0]!.createdBy).toBe("col-1");
  });
});

// ---------------------------------------------------------------------------
// getDiscountCode
// ---------------------------------------------------------------------------

describe("getDiscountCode", () => {
  it("throws notFound when discount code does not exist", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseMock(makeStores());

    await expect(getDiscountCode(supabase, db, "nonexistent")).rejects.toThrowError(
      "Discount code not found",
    );
  });

  it("returns discount code with null enrichment and no linked flights", async () => {
    const db = getTestDb();
    const row = makeDiscountCodeRow({ id: "dc-1", code: "BARE", crm_display_id: "DIS-AAA-001" });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await getDiscountCode(supabase, db, "dc-1");
    expect(result.id).toBe("dc-1");
    expect(result.code).toBe("BARE");
    expect(result.humanName).toBeNull();
    expect(result.humanDisplayId).toBeNull();
    expect(result.accountName).toBeNull();
    expect(result.accountDisplayId).toBeNull();
    expect(result.linkedFlights).toHaveLength(0);
  });

  it("returns discount code enriched with human data", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "King");
    const row = makeDiscountCodeRow({
      id: "dc-1",
      code: "CAROL",
      human_id: "h-1",
      crm_display_id: "DIS-AAA-002",
    });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await getDiscountCode(supabase, db, "dc-1");
    expect(result.humanName).toBe("Carol King");
    expect(result.humanDisplayId).toMatch(/^HUM-/);
    expect(result.accountName).toBeNull();
  });

  it("returns discount code enriched with account data", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Widget Corp");
    const row = makeDiscountCodeRow({
      id: "dc-1",
      code: "WIDGET",
      account_id: "acc-1",
      crm_display_id: "DIS-AAA-003",
    });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await getDiscountCode(supabase, db, "dc-1");
    expect(result.accountName).toBe("Widget Corp");
    expect(result.accountDisplayId).toMatch(/^ACC-/);
    expect(result.humanName).toBeNull();
  });

  it("returns linked flights when discount code has flight links", async () => {
    const db = getTestDb();
    const row = makeDiscountCodeRow({
      id: "dc-1",
      code: "FLIGHT10",
      crm_display_id: "DIS-AAA-004",
    });
    const flight = makeFlightRow({
      id: "flt-1",
      crm_display_id: "FLY-AAA-001",
      origin_city: "London",
      destination_city: "Malta",
      flight_date: "2026-06-15",
    });
    const link: FlightLinkRow = { discount_code_id: "dc-1", flight_id: "flt-1" };
    const supabase = makeSupabaseMock(makeStores([row], [link], [flight]));

    const result = await getDiscountCode(supabase, db, "dc-1");
    expect(result.linkedFlights).toHaveLength(1);
    expect(result.linkedFlights[0]!.id).toBe("flt-1");
    expect(result.linkedFlights[0]!.originCity).toBe("London");
    expect(result.linkedFlights[0]!.destinationCity).toBe("Malta");
    expect(result.linkedFlights[0]!.flightDate).toBe("2026-06-15");
    expect(result.linkedFlights[0]!.crmDisplayId).toBe("FLY-AAA-001");
  });

  it("returns empty linkedFlights when code has flight links but flights table is empty", async () => {
    const db = getTestDb();
    const row = makeDiscountCodeRow({
      id: "dc-1",
      code: "NOFLIGHT",
      crm_display_id: "DIS-AAA-005",
    });
    const link: FlightLinkRow = { discount_code_id: "dc-1", flight_id: "flt-ghost" };
    const supabase = makeSupabaseMock(makeStores([row], [link], []));

    const result = await getDiscountCode(supabase, db, "dc-1");
    expect(result.linkedFlights).toHaveLength(0);
  });

  it("assigns crm_display_id if missing", async () => {
    const db = getTestDb();
    const row = makeDiscountCodeRow({ id: "dc-1", code: "ASSIGNME", crm_display_id: null });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await getDiscountCode(supabase, db, "dc-1");
    expect(result.crmDisplayId).toMatch(/^DIS-/);
  });
});

// ---------------------------------------------------------------------------
// updateDiscountCode
// ---------------------------------------------------------------------------

describe("updateDiscountCode", () => {
  it("throws notFound when discount code does not exist", async () => {
    const supabase = makeSupabaseMock(makeStores());

    await expect(
      updateDiscountCode(supabase, "nonexistent", { humanId: "h-1" }),
    ).rejects.toThrowError("Discount code not found");
  });

  it("updates humanId to link a human", async () => {
    const row = makeDiscountCodeRow({ id: "dc-1", code: "LINKHUMAN", human_id: null });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await updateDiscountCode(supabase, "dc-1", { humanId: "h-1" });
    expect(result.humanId).toBe("h-1");
  });

  it("clears humanId by setting it to null", async () => {
    const row = makeDiscountCodeRow({ id: "dc-1", code: "CLEARHUMAN", human_id: "h-1" });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await updateDiscountCode(supabase, "dc-1", { humanId: null });
    expect(result.humanId).toBeNull();
  });

  it("updates accountId to link an account", async () => {
    const row = makeDiscountCodeRow({ id: "dc-1", code: "LINKACCT", account_id: null });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await updateDiscountCode(supabase, "dc-1", { accountId: "acc-1" });
    expect(result.accountId).toBe("acc-1");
  });

  it("clears accountId by setting it to null", async () => {
    const row = makeDiscountCodeRow({ id: "dc-1", code: "CLEARACCT", account_id: "acc-1" });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await updateDiscountCode(supabase, "dc-1", { accountId: null });
    expect(result.accountId).toBeNull();
  });

  it("updates both humanId and accountId simultaneously", async () => {
    const row = makeDiscountCodeRow({
      id: "dc-1",
      code: "BOTH",
      human_id: null,
      account_id: null,
    });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await updateDiscountCode(supabase, "dc-1", {
      humanId: "h-2",
      accountId: "acc-2",
    });
    expect(result.humanId).toBe("h-2");
    expect(result.accountId).toBe("acc-2");
  });

  it("does not mutate fields that are not in the update payload", async () => {
    const row = makeDiscountCodeRow({
      id: "dc-1",
      code: "PRESERVE",
      percent_off: 15,
      description: "Original",
    });
    const supabase = makeSupabaseMock(makeStores([row]));

    const result = await updateDiscountCode(supabase, "dc-1", { humanId: "h-1" });
    expect(result.percentOff).toBe(15);
    expect(result.description).toBe("Original");
    expect(result.code).toBe("PRESERVE");
  });
});

// ---------------------------------------------------------------------------
// getDiscountCodesForFlight
// ---------------------------------------------------------------------------

describe("getDiscountCodesForFlight", () => {
  it("returns empty list when flight has no linked discount codes", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseMock(makeStores());

    const result = await getDiscountCodesForFlight(supabase, db, "flt-1");
    expect(result).toHaveLength(0);
  });

  it("returns discount codes linked to the flight", async () => {
    const db = getTestDb();
    const code1 = makeDiscountCodeRow({ id: "dc-1", code: "FLIGHT10", crm_display_id: "DIS-AAA-001" });
    const code2 = makeDiscountCodeRow({ id: "dc-2", code: "FLIGHT20", crm_display_id: "DIS-AAA-002" });
    const links: FlightLinkRow[] = [
      { discount_code_id: "dc-1", flight_id: "flt-1" },
      { discount_code_id: "dc-2", flight_id: "flt-1" },
    ];
    const supabase = makeSupabaseMock(makeStores([code1, code2], links));

    const result = await getDiscountCodesForFlight(supabase, db, "flt-1");
    expect(result).toHaveLength(2);
    const codes = result.map((r) => r.code);
    expect(codes).toContain("FLIGHT10");
    expect(codes).toContain("FLIGHT20");
  });

  it("does not return codes linked to a different flight", async () => {
    const db = getTestDb();
    const code = makeDiscountCodeRow({ id: "dc-1", code: "OTHER", crm_display_id: "DIS-AAA-003" });
    const link: FlightLinkRow = { discount_code_id: "dc-1", flight_id: "flt-other" };
    const supabase = makeSupabaseMock(makeStores([code], [link]));

    const result = await getDiscountCodesForFlight(supabase, db, "flt-1");
    expect(result).toHaveLength(0);
  });

  it("enriches flight codes with human name", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Grace", "Hopper");
    const code = makeDiscountCodeRow({
      id: "dc-1",
      code: "GRACE",
      human_id: "h-1",
      crm_display_id: "DIS-AAA-004",
    });
    const link: FlightLinkRow = { discount_code_id: "dc-1", flight_id: "flt-1" };
    const supabase = makeSupabaseMock(makeStores([code], [link]));

    const result = await getDiscountCodesForFlight(supabase, db, "flt-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.humanName).toBe("Grace Hopper");
  });

  it("assigns crm_display_id to codes that are missing one", async () => {
    const db = getTestDb();
    const code = makeDiscountCodeRow({ id: "dc-1", code: "NODISPLAY", crm_display_id: null });
    const link: FlightLinkRow = { discount_code_id: "dc-1", flight_id: "flt-1" };
    const supabase = makeSupabaseMock(makeStores([code], [link]));

    const result = await getDiscountCodesForFlight(supabase, db, "flt-1");
    expect(result[0]!.crmDisplayId).toMatch(/^DIS-/);
  });
});

// ---------------------------------------------------------------------------
// getDiscountCodesForHuman
// ---------------------------------------------------------------------------

describe("getDiscountCodesForHuman", () => {
  it("returns empty list when human has no discount codes", async () => {
    const supabase = makeSupabaseMock(makeStores());

    const result = await getDiscountCodesForHuman(supabase, "h-1");
    expect(result).toHaveLength(0);
  });

  it("returns discount codes linked to the human", async () => {
    const code1 = makeDiscountCodeRow({
      id: "dc-1",
      code: "HUMAN10",
      human_id: "h-1",
      crm_display_id: "DIS-AAA-001",
      description: "Ten percent",
      percent_off: 10,
      is_active: true,
    });
    const code2 = makeDiscountCodeRow({
      id: "dc-2",
      code: "HUMAN20",
      human_id: "h-1",
      crm_display_id: "DIS-AAA-002",
      description: null,
      percent_off: 20,
      is_active: false,
    });
    // Code belonging to a different human — should not be returned
    const otherCode = makeDiscountCodeRow({
      id: "dc-3",
      code: "OTHER",
      human_id: "h-2",
      crm_display_id: "DIS-AAA-003",
    });
    const supabase = makeSupabaseMock(makeStores([code1, code2, otherCode]));

    const result = await getDiscountCodesForHuman(supabase, "h-1");
    expect(result).toHaveLength(2);

    const ids = result.map((r) => r.id);
    expect(ids).toContain("dc-1");
    expect(ids).toContain("dc-2");
    expect(ids).not.toContain("dc-3");
  });

  it("maps fields into camelCase API shape", async () => {
    const code = makeDiscountCodeRow({
      id: "dc-1",
      code: "CAMEL",
      human_id: "h-1",
      crm_display_id: "DIS-AAA-005",
      percent_off: 15,
      is_active: true,
      description: "Some desc",
    });
    const supabase = makeSupabaseMock(makeStores([code]));

    const result = await getDiscountCodesForHuman(supabase, "h-1");
    expect(result[0]!.crmDisplayId).toBe("DIS-AAA-005");
    expect(result[0]!.percentOff).toBe(15);
    expect(result[0]!.isActive).toBe(true);
    expect(result[0]!.description).toBe("Some desc");
  });
});

// ---------------------------------------------------------------------------
// getDiscountCodesForAccount
// ---------------------------------------------------------------------------

describe("getDiscountCodesForAccount", () => {
  it("returns empty list when account has no discount codes", async () => {
    const supabase = makeSupabaseMock(makeStores());

    const result = await getDiscountCodesForAccount(supabase, "acc-1");
    expect(result).toHaveLength(0);
  });

  it("returns discount codes linked to the account", async () => {
    const code1 = makeDiscountCodeRow({
      id: "dc-1",
      code: "ACCT10",
      account_id: "acc-1",
      crm_display_id: "DIS-AAA-001",
      percent_off: 10,
      is_active: true,
    });
    const code2 = makeDiscountCodeRow({
      id: "dc-2",
      code: "ACCT20",
      account_id: "acc-1",
      crm_display_id: "DIS-AAA-002",
      percent_off: 20,
      is_active: false,
    });
    const otherCode = makeDiscountCodeRow({
      id: "dc-3",
      code: "OTHER",
      account_id: "acc-2",
      crm_display_id: "DIS-AAA-003",
    });
    const supabase = makeSupabaseMock(makeStores([code1, code2, otherCode]));

    const result = await getDiscountCodesForAccount(supabase, "acc-1");
    expect(result).toHaveLength(2);

    const ids = result.map((r) => r.id);
    expect(ids).toContain("dc-1");
    expect(ids).toContain("dc-2");
    expect(ids).not.toContain("dc-3");
  });

  it("maps fields into camelCase API shape", async () => {
    const code = makeDiscountCodeRow({
      id: "dc-1",
      code: "ACCTCAMEL",
      account_id: "acc-1",
      crm_display_id: "DIS-AAB-001",
      percent_off: 30,
      is_active: false,
      description: "Account deal",
    });
    const supabase = makeSupabaseMock(makeStores([code]));

    const result = await getDiscountCodesForAccount(supabase, "acc-1");
    expect(result[0]!.crmDisplayId).toBe("DIS-AAB-001");
    expect(result[0]!.percentOff).toBe(30);
    expect(result[0]!.isActive).toBe(false);
    expect(result[0]!.description).toBe("Account deal");
  });
});
