import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  listReferralCodes,
  getReferralCode,
  createReferralCode,
  updateReferralCode,
  deleteReferralCode,
} from "../../../src/services/referral-codes";
import * as schema from "@humans/db/schema";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Minimal in-memory Supabase mock
// ---------------------------------------------------------------------------

interface ReferralCodeRow {
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

// makeSupabaseErrorMock returns a client where every operation on the given
// table immediately resolves with the supplied error.
function makeSupabaseErrorMock(errorMessage: string) {
  const err = new Error(errorMessage);
  const failingBuilder = () => {
    const self: {
      select: (fields?: string) => typeof self;
      insert: (data: unknown) => typeof self;
      update: (data: unknown) => typeof self;
      delete: () => typeof self;
      eq: (col: string, val: unknown) => typeof self;
      order: (col: string, opts?: { ascending?: boolean }) => typeof self;
      overrideTypes: () => typeof self;
      single: () => Promise<{ data: null; error: Error }>;
      maybeSingle: () => Promise<{ data: null; error: Error }>;
      then: (resolve: (result: { data: null; error: Error }) => void) => Promise<void>;
    } = {
      select() { return self; },
      insert() { return self; },
      update() { return self; },
      delete() { return self; },
      eq() { return self; },
      order() { return self; },
      overrideTypes() { return self; },
      single() { return Promise.resolve({ data: null, error: err }); },
      maybeSingle() { return Promise.resolve({ data: null, error: err }); },
      then(resolve) { return Promise.resolve(resolve({ data: null, error: err })); },
    };
    return self;
  };

  return {
    from(_table: string) {
      return failingBuilder();
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

// makeSupabaseFetchOkUpdateErrorMock returns a client where select succeeds
// (returning the given rows) but update returns an error.
function makeSupabaseFetchOkUpdateErrorMock(store: ReferralCodeRow[], errorMessage: string) {
  const updateErr = new Error(errorMessage);

  const builder = (rows: ReferralCodeRow[]) => {
    let eqFilters: { col: string; val: unknown }[] = [];
    let isUpdate = false;
    let isDelete = false;

    const self: {
      select: (fields?: string) => typeof self;
      update: (data: unknown) => typeof self;
      delete: () => typeof self;
      eq: (col: string, val: unknown) => typeof self;
      order: (col: string, opts?: { ascending?: boolean }) => typeof self;
      overrideTypes: () => typeof self;
      single: () => Promise<{ data: ReferralCodeRow | null; error: Error | null }>;
      maybeSingle: () => Promise<{ data: ReferralCodeRow | null; error: Error | null }>;
      then: (resolve: (result: { data: ReferralCodeRow[] | null; error: Error | null }) => void) => Promise<void>;
    } = {
      select() { return self; },
      update() { isUpdate = true; return self; },
      delete() { isDelete = true; return self; },
      eq(col, val) { eqFilters.push({ col, val }); return self; },
      order() { return self; },
      overrideTypes() { return self; },
      single() {
        if (isUpdate) return Promise.resolve({ data: null, error: updateErr });
        if (isDelete) return Promise.resolve({ data: null, error: updateErr });
        // select single
        let filtered = [...rows];
        for (const f of eqFilters) {
          filtered = filtered.filter((r) => (r as Record<string, unknown>)[f.col] === f.val);
        }
        return Promise.resolve({ data: filtered[0] ?? null, error: null });
      },
      maybeSingle() {
        if (isUpdate) return Promise.resolve({ data: null, error: updateErr });
        if (isDelete) return Promise.resolve({ data: null, error: updateErr });
        // select single
        let filtered = [...rows];
        for (const f of eqFilters) {
          filtered = filtered.filter((r) => (r as Record<string, unknown>)[f.col] === f.val);
        }
        return Promise.resolve({ data: filtered[0] ?? null, error: null });
      },
      then(resolve) {
        if (isUpdate) return Promise.resolve(resolve({ data: null, error: updateErr }));
        if (isDelete) return Promise.resolve(resolve({ data: null, error: updateErr }));
        // select multiple
        let filtered = [...rows];
        for (const f of eqFilters) {
          filtered = filtered.filter((r) => (r as Record<string, unknown>)[f.col] === f.val);
        }
        return Promise.resolve(resolve({ data: filtered, error: null }));
      },
    };
    return self;
  };

  return {
    from(_table: string) {
      return builder(store);
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

// makeSupabaseFetchOkDeleteErrorMock returns a client where the first select
// succeeds but delete returns an error.
function makeSupabaseFetchOkDeleteErrorMock(store: ReferralCodeRow[], errorMessage: string) {
  const deleteErr = new Error(errorMessage);
  let callCount = 0;

  const builder = (rows: ReferralCodeRow[]) => {
    let eqFilters: { col: string; val: unknown }[] = [];
    let isDelete = false;
    const callIndex = callCount++;

    const self: {
      select: (fields?: string) => typeof self;
      delete: () => typeof self;
      eq: (col: string, val: unknown) => typeof self;
      order: (col: string, opts?: { ascending?: boolean }) => typeof self;
      overrideTypes: () => typeof self;
      then: (resolve: (result: { data: ReferralCodeRow[] | null; error: Error | null }) => void) => Promise<void>;
    } = {
      select() { return self; },
      delete() { isDelete = true; return self; },
      eq(col, val) { eqFilters.push({ col, val }); return self; },
      order() { return self; },
      overrideTypes() { return self; },
      then(resolve) {
        if (isDelete) return Promise.resolve(resolve({ data: null, error: deleteErr }));
        // First select (existence check) succeeds; subsequent ones as well
        let filtered = [...rows];
        for (const f of eqFilters) {
          filtered = filtered.filter((r) => (r as Record<string, unknown>)[f.col] === f.val);
        }
        return Promise.resolve(resolve({ data: filtered, error: null }));
      },
    };
    void callIndex;
    return self;
  };

  return {
    from(_table: string) {
      return builder(store);
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

function makeSupabaseMock(store: ReferralCodeRow[]) {
  const builder = (rows: ReferralCodeRow[], error: Error | null = null) => {
    let filtered = [...rows];
    let eqFilters: { col: string; val: unknown }[] = [];
    let inFilters: { col: string; vals: unknown[] }[] = [];
    let selectFields: string | null = null;
    let insertData: Partial<ReferralCodeRow> | null = null;
    let updateData: Partial<ReferralCodeRow> | null = null;
    let doDelete = false;
    let orderField: string | null = null;
    let orderAsc = true;
    let singleMode = false;

    const self: {
      select: (fields?: string) => typeof self;
      insert: (data: Partial<ReferralCodeRow>) => typeof self;
      update: (data: Partial<ReferralCodeRow>) => typeof self;
      delete: () => typeof self;
      eq: (col: string, val: unknown) => typeof self;
      in: (col: string, vals: unknown[]) => typeof self;
      order: (col: string, opts?: { ascending?: boolean }) => typeof self;
      overrideTypes: () => typeof self;
      single: () => Promise<{ data: ReferralCodeRow | null; error: Error | null }>;
      maybeSingle: () => Promise<{ data: ReferralCodeRow | null; error: Error | null }>;
      then: (resolve: (result: { data: ReferralCodeRow[] | null; error: Error | null }) => void) => Promise<void>;
    } = {
      select(fields?: string) {
        selectFields = fields ?? "*";
        return self;
      },
      insert(data: Partial<ReferralCodeRow>) {
        insertData = data;
        return self;
      },
      update(data: Partial<ReferralCodeRow>) {
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
      overrideTypes() { return self; },
      single() {
        return Promise.resolve(execute()).then((res) => {
          if (res.error) return { data: null, error: res.error };
          const arr = res.data ?? [];
          return { data: arr[0] ?? null, error: null };
        });
      },
      maybeSingle() {
        return Promise.resolve(execute()).then((res) => {
          if (res.error) return { data: null, error: res.error };
          const arr = res.data ?? [];
          return { data: arr[0] ?? null, error: null };
        });
      },
      then(resolve: (result: { data: ReferralCodeRow[] | null; error: Error | null }) => void) {
        return Promise.resolve(execute()).then(resolve);
      },
    };

    function execute(): { data: ReferralCodeRow[] | null; error: Error | null } {
      if (error) return { data: null, error };

      // INSERT
      if (insertData !== null) {
        const now = new Date().toISOString();
        const newRow: ReferralCodeRow = {
          id: insertData.id ?? `ref-${Date.now()}-${Math.random()}`,
          display_id: insertData.display_id ?? "",
          code: insertData.code ?? "",
          description: insertData.description ?? null,
          is_active: insertData.is_active ?? true,
          max_uses: insertData.max_uses ?? null,
          expires_at: insertData.expires_at ?? null,
          whatsapp_clicks: 0,
          human_id: insertData.human_id ?? null,
          account_id: insertData.account_id ?? null,
          created_at: insertData.created_at ?? now,
          updated_at: null,
        };
        store.push(newRow);
        return { data: [newRow], error: null };
      }

      // DELETE
      if (doDelete) {
        let toRemove = [...store];
        for (const f of eqFilters) {
          toRemove = toRemove.filter((r) => (r as Record<string, unknown>)[f.col] === f.val);
        }
        for (const f of inFilters) {
          toRemove = toRemove.filter((r) => f.vals.includes((r as Record<string, unknown>)[f.col]));
        }
        for (const r of toRemove) {
          const idx = store.findIndex((s) => s.id === r.id);
          if (idx !== -1) store.splice(idx, 1);
        }
        return { data: [], error: null };
      }

      // UPDATE
      if (updateData !== null) {
        filtered = [...store];
        for (const f of eqFilters) {
          filtered = filtered.filter((r) => (r as Record<string, unknown>)[f.col] === f.val);
        }
        for (const r of filtered) {
          const idx = store.findIndex((s) => s.id === r.id);
          if (idx !== -1) {
            store[idx] = { ...store[idx]!, ...updateData } as ReferralCodeRow;
          }
        }
        // Return the updated rows
        const updated = filtered.map((r) => store.find((s) => s.id === r.id)!);
        return { data: updated, error: null };
      }

      // SELECT
      filtered = [...store];
      for (const f of eqFilters) {
        filtered = filtered.filter((r) => (r as Record<string, unknown>)[f.col] === f.val);
      }
      for (const f of inFilters) {
        filtered = filtered.filter((r) => f.vals.includes((r as Record<string, unknown>)[f.col]));
      }
      if (orderField) {
        filtered.sort((a, b) => {
          const av = (a as Record<string, unknown>)[orderField!] as string ?? "";
          const bv = (b as Record<string, unknown>)[orderField!] as string ?? "";
          return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      return { data: filtered, error: null };
    }

    return self;
  };

  const client = {
    from(table: string) {
      if (table === "referral_codes") {
        return builder(store);
      }
      // Unknown table — return empty result builder
      return builder([]);
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

function makeReferralCodeRow(
  overrides: Partial<ReferralCodeRow> = {},
): ReferralCodeRow {
  const ts = now();
  return {
    id: `ref-${seedCounter++}`,
    display_id: nextDisplayId("REF"),
    code: `CODE${seedCounter}`,
    description: null,
    is_active: true,
    max_uses: null,
    expires_at: null,
    whatsapp_clicks: 0,
    human_id: null,
    account_id: null,
    created_at: ts,
    updated_at: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// listReferralCodes
// ---------------------------------------------------------------------------

describe("listReferralCodes", () => {
  it("returns empty list when no referral codes exist", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseMock([]);

    const result = await listReferralCodes(supabase, db);
    expect(result).toHaveLength(0);
  });

  it("returns referral codes with null enrichment when no owner", async () => {
    const db = getTestDb();
    const row = makeReferralCodeRow({ id: "ref-1", code: "SUMMER10" });
    const supabase = makeSupabaseMock([row]);

    const result = await listReferralCodes(supabase, db);
    expect(result).toHaveLength(1);
    expect(result[0]!.code).toBe("SUMMER10");
    expect(result[0]!.humanName).toBeNull();
    expect(result[0]!.humanDisplayId).toBeNull();
    expect(result[0]!.accountName).toBeNull();
    expect(result[0]!.accountDisplayId).toBeNull();
  });

  it("enriches referral code with human name and displayId", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Alice", "Smith");
    const row = makeReferralCodeRow({ id: "ref-1", code: "ALICE20", human_id: "h-1" });
    const supabase = makeSupabaseMock([row]);

    const result = await listReferralCodes(supabase, db);
    expect(result).toHaveLength(1);
    expect(result[0]!.humanName).toBe("Alice Smith");
    expect(result[0]!.humanDisplayId).toMatch(/^HUM-/);
    expect(result[0]!.accountName).toBeNull();
  });

  it("enriches referral code with account name and displayId", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Acme Corp");
    const row = makeReferralCodeRow({ id: "ref-1", code: "ACME30", account_id: "acc-1" });
    const supabase = makeSupabaseMock([row]);

    const result = await listReferralCodes(supabase, db);
    expect(result).toHaveLength(1);
    expect(result[0]!.accountName).toBe("Acme Corp");
    expect(result[0]!.accountDisplayId).toMatch(/^ACC-/);
    expect(result[0]!.humanName).toBeNull();
  });

  it("returns multiple referral codes with mixed enrichment", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Bob", "Jones");
    await seedAccount(db, "acc-1", "Big Co");

    const rows = [
      makeReferralCodeRow({ id: "ref-1", code: "BOB", human_id: "h-1" }),
      makeReferralCodeRow({ id: "ref-2", code: "BIGCO", account_id: "acc-1" }),
      makeReferralCodeRow({ id: "ref-3", code: "ORPHAN" }),
    ];
    const supabase = makeSupabaseMock(rows);

    const result = await listReferralCodes(supabase, db);
    expect(result).toHaveLength(3);

    const bob = result.find((r) => r.id === "ref-1");
    expect(bob!.humanName).toBe("Bob Jones");
    expect(bob!.accountName).toBeNull();

    const bigco = result.find((r) => r.id === "ref-2");
    expect(bigco!.accountName).toBe("Big Co");
    expect(bigco!.humanName).toBeNull();

    const orphan = result.find((r) => r.id === "ref-3");
    expect(orphan!.humanName).toBeNull();
    expect(orphan!.accountName).toBeNull();
  });

  it("maps Supabase snake_case fields to camelCase API shape", async () => {
    const db = getTestDb();
    const row = makeReferralCodeRow({
      id: "ref-1",
      code: "CAMEL",
      is_active: false,
      max_uses: 100,
      expires_at: "2026-12-31",
      whatsapp_clicks: 5,
    });
    const supabase = makeSupabaseMock([row]);

    const result = await listReferralCodes(supabase, db);
    expect(result[0]!.isActive).toBe(false);
    expect(result[0]!.maxUses).toBe(100);
    expect(result[0]!.expiresAt).toBe("2026-12-31");
    expect(result[0]!.whatsappClicks).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// getReferralCode
// ---------------------------------------------------------------------------

describe("getReferralCode", () => {
  it("throws notFound when referral code does not exist", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseMock([]);

    await expect(getReferralCode(supabase, db, "nonexistent")).rejects.toThrowError(
      "Referral code not found",
    );
  });

  it("returns referral code with null enrichment when no owner", async () => {
    const db = getTestDb();
    const row = makeReferralCodeRow({ id: "ref-1", code: "BARE" });
    const supabase = makeSupabaseMock([row]);

    const result = await getReferralCode(supabase, db, "ref-1");
    expect(result.id).toBe("ref-1");
    expect(result.code).toBe("BARE");
    expect(result.humanName).toBeNull();
    expect(result.humanDisplayId).toBeNull();
    expect(result.accountName).toBeNull();
    expect(result.accountDisplayId).toBeNull();
  });

  it("returns referral code enriched with human data", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-1", "Carol", "King");
    const row = makeReferralCodeRow({ id: "ref-1", code: "CAROL", human_id: "h-1" });
    const supabase = makeSupabaseMock([row]);

    const result = await getReferralCode(supabase, db, "ref-1");
    expect(result.humanName).toBe("Carol King");
    expect(result.humanDisplayId).toMatch(/^HUM-/);
    expect(result.accountName).toBeNull();
  });

  it("returns referral code enriched with account data", async () => {
    const db = getTestDb();
    await seedAccount(db, "acc-1", "Widget Corp");
    const row = makeReferralCodeRow({ id: "ref-1", code: "WIDGET", account_id: "acc-1" });
    const supabase = makeSupabaseMock([row]);

    const result = await getReferralCode(supabase, db, "ref-1");
    expect(result.accountName).toBe("Widget Corp");
    expect(result.accountDisplayId).toMatch(/^ACC-/);
    expect(result.humanName).toBeNull();
  });

  it("maps all fields into camelCase API shape", async () => {
    const db = getTestDb();
    const row = makeReferralCodeRow({
      id: "ref-1",
      code: "FULLMAP",
      description: "A great code",
      is_active: true,
      max_uses: 50,
      expires_at: "2027-06-01",
      whatsapp_clicks: 12,
    });
    const supabase = makeSupabaseMock([row]);

    const result = await getReferralCode(supabase, db, "ref-1");
    expect(result.description).toBe("A great code");
    expect(result.isActive).toBe(true);
    expect(result.maxUses).toBe(50);
    expect(result.expiresAt).toBe("2027-06-01");
    expect(result.whatsappClicks).toBe(12);
    expect(result.displayId).toMatch(/^REF-/);
  });
});

// ---------------------------------------------------------------------------
// createReferralCode
// ---------------------------------------------------------------------------

describe("createReferralCode", () => {
  it("creates a referral code with required fields", async () => {
    const db = getTestDb();
    const store: ReferralCodeRow[] = [];
    const supabase = makeSupabaseMock(store);

    const result = await createReferralCode(supabase, db, { code: "NEWCODE" });

    expect(result.code).toBe("NEWCODE");
    expect(result.displayId).toMatch(/^REF-/);
    expect(result.description).toBeNull();
    expect(result.isActive).toBe(true);
    expect(result.humanId).toBeNull();
    expect(result.accountId).toBeNull();
    expect(store).toHaveLength(1);
  });

  it("creates a referral code with description", async () => {
    const db = getTestDb();
    const store: ReferralCodeRow[] = [];
    const supabase = makeSupabaseMock(store);

    const result = await createReferralCode(supabase, db, {
      code: "DESCRIBED",
      description: "My special code",
    });
    expect(result.description).toBe("My special code");
  });

  it("creates a referral code with isActive=false", async () => {
    const db = getTestDb();
    const store: ReferralCodeRow[] = [];
    const supabase = makeSupabaseMock(store);

    const result = await createReferralCode(supabase, db, {
      code: "INACTIVE",
      isActive: false,
    });
    expect(result.isActive).toBe(false);
  });

  it("creates a referral code linked to a human", async () => {
    const db = getTestDb();
    const store: ReferralCodeRow[] = [];
    const supabase = makeSupabaseMock(store);

    const result = await createReferralCode(supabase, db, {
      code: "HUMANCODE",
      humanId: "h-1",
    });
    expect(result.humanId).toBe("h-1");
    expect(result.accountId).toBeNull();
  });

  it("creates a referral code linked to an account", async () => {
    const db = getTestDb();
    const store: ReferralCodeRow[] = [];
    const supabase = makeSupabaseMock(store);

    const result = await createReferralCode(supabase, db, {
      code: "ACCTCODE",
      accountId: "acc-1",
    });
    expect(result.accountId).toBe("acc-1");
    expect(result.humanId).toBeNull();
  });

  it("generates unique display IDs for multiple creates", async () => {
    const db = getTestDb();
    const store: ReferralCodeRow[] = [];
    const supabase = makeSupabaseMock(store);

    const r1 = await createReferralCode(supabase, db, { code: "CODE1" });
    const r2 = await createReferralCode(supabase, db, { code: "CODE2" });

    expect(r1.displayId).not.toBe(r2.displayId);
    expect(r1.displayId).toMatch(/^REF-/);
    expect(r2.displayId).toMatch(/^REF-/);
  });
});

// ---------------------------------------------------------------------------
// updateReferralCode
// ---------------------------------------------------------------------------

describe("updateReferralCode", () => {
  it("throws notFound when referral code does not exist", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseMock([]);

    await expect(
      updateReferralCode(supabase, "nonexistent", { description: "new" }),
    ).rejects.toThrowError("Referral code not found");
  });

  it("updates the description field", async () => {
    const db = getTestDb();
    const row = makeReferralCodeRow({ id: "ref-1", code: "UPDATABLE", description: null });
    const supabase = makeSupabaseMock([row]);

    const result = await updateReferralCode(supabase, "ref-1", { description: "Updated desc" });
    expect(result.description).toBe("Updated desc");
  });

  it("updates isActive to false", async () => {
    const db = getTestDb();
    const row = makeReferralCodeRow({ id: "ref-1", code: "TOGGLE", is_active: true });
    const supabase = makeSupabaseMock([row]);

    const result = await updateReferralCode(supabase, "ref-1", { isActive: false });
    expect(result.isActive).toBe(false);
  });

  it("updates humanId", async () => {
    const db = getTestDb();
    const row = makeReferralCodeRow({ id: "ref-1", code: "REASSIGN", human_id: null });
    const supabase = makeSupabaseMock([row]);

    const result = await updateReferralCode(supabase, "ref-1", { humanId: "h-2" });
    expect(result.humanId).toBe("h-2");
  });

  it("clears humanId by setting it to null", async () => {
    const db = getTestDb();
    const row = makeReferralCodeRow({ id: "ref-1", code: "CLEARHUMAN", human_id: "h-1" });
    const supabase = makeSupabaseMock([row]);

    const result = await updateReferralCode(supabase, "ref-1", { humanId: null });
    expect(result.humanId).toBeNull();
  });

  it("updates accountId", async () => {
    const db = getTestDb();
    const row = makeReferralCodeRow({ id: "ref-1", code: "ACCTUPDATE", account_id: null });
    const supabase = makeSupabaseMock([row]);

    const result = await updateReferralCode(supabase, "ref-1", { accountId: "acc-2" });
    expect(result.accountId).toBe("acc-2");
  });

  it("returns full camelCase API shape after update", async () => {
    const db = getTestDb();
    const row = makeReferralCodeRow({ id: "ref-1", code: "SHAPE", whatsapp_clicks: 7 });
    const supabase = makeSupabaseMock([row]);

    const result = await updateReferralCode(supabase, "ref-1", { description: "shaped" });
    expect(result.code).toBe("SHAPE");
    expect(result.whatsappClicks).toBe(7);
    expect(result.description).toBe("shaped");
  });

  it("throws when Supabase returns an error on the existence fetch", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseErrorMock("DB connection failed");

    await expect(
      updateReferralCode(supabase, "ref-1", { description: "new" }),
    ).rejects.toThrowError("Supabase error: DB connection failed");
  });

  it("throws when Supabase returns an error on the update operation", async () => {
    const db = getTestDb();
    const row = makeReferralCodeRow({ id: "ref-upd-err", code: "UPERR" });
    const supabase = makeSupabaseFetchOkUpdateErrorMock([row], "Update failed");

    await expect(
      updateReferralCode(supabase, "ref-upd-err", { description: "should fail" }),
    ).rejects.toThrowError("Supabase error: Update failed");
  });
});

// ---------------------------------------------------------------------------
// deleteReferralCode
// ---------------------------------------------------------------------------

describe("deleteReferralCode", () => {
  it("throws notFound when referral code does not exist", async () => {
    const db = getTestDb();
    const supabase = makeSupabaseMock([]);

    await expect(deleteReferralCode(supabase, "nonexistent")).rejects.toThrowError(
      "Referral code not found",
    );
  });

  it("deletes an existing referral code", async () => {
    const store: ReferralCodeRow[] = [makeReferralCodeRow({ id: "ref-1", code: "TODELETE" })];
    const supabase = makeSupabaseMock(store);

    await deleteReferralCode(supabase, "ref-1");
    expect(store).toHaveLength(0);
  });

  it("deletes only the targeted referral code, leaving others intact", async () => {
    const store: ReferralCodeRow[] = [
      makeReferralCodeRow({ id: "ref-1", code: "KEEP" }),
      makeReferralCodeRow({ id: "ref-2", code: "GONE" }),
    ];
    const supabase = makeSupabaseMock(store);

    await deleteReferralCode(supabase, "ref-2");
    expect(store).toHaveLength(1);
    expect(store[0]!.id).toBe("ref-1");
  });

  it("throws when Supabase returns an error on the existence fetch", async () => {
    const supabase = makeSupabaseErrorMock("Fetch error on delete");

    await expect(deleteReferralCode(supabase, "ref-1")).rejects.toThrowError(
      "Supabase error: Fetch error on delete",
    );
  });

  it("throws when Supabase returns an error on the delete operation", async () => {
    const row = makeReferralCodeRow({ id: "ref-del-err", code: "DELERR" });
    const supabase = makeSupabaseFetchOkDeleteErrorMock([row], "Delete failed");

    await expect(deleteReferralCode(supabase, "ref-del-err")).rejects.toThrowError(
      "Supabase error: Delete failed",
    );
  });
});
