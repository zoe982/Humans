import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import { resolveOwnerSummary } from "../../../src/lib/owner-summary";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;

async function seedHuman(db: ReturnType<typeof getTestDb>, id: string, first: string, last: string) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.humans).values({
    id,
    displayId: `HUM-AAA-${String(seedCounter).padStart(3, "0")}`,
    firstName: first,
    lastName: last,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
}

async function seedAccount(db: ReturnType<typeof getTestDb>, id: string, name: string) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.accounts).values({
    id,
    displayId: `ACC-AAA-${String(seedCounter).padStart(3, "0")}`,
    name,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
}

async function seedGeneralLead(db: ReturnType<typeof getTestDb>, id: string, first: string, last: string) {
  seedCounter++;
  const ts = now();
  await db.insert(schema.generalLeads).values({
    id,
    displayId: `LEA-AAA-${String(seedCounter).padStart(3, "0")}`,
    firstName: first,
    lastName: last,
    status: "open",
    createdAt: ts,
    updatedAt: ts,
  });
}

describe("resolveOwnerSummary", () => {
  it("resolves a human owner", async () => {
    const db = getTestDb();
    await seedHuman(db, "h1", "John", "Doe");

    const result = await resolveOwnerSummary(db, { humanId: "h1", accountId: null, generalLeadId: null });

    expect(result).toEqual([
      { type: "human", id: "h1", displayId: expect.stringContaining("HUM-"), name: "John Doe" },
    ]);
  });

  it("resolves an account owner", async () => {
    const db = getTestDb();
    await seedAccount(db, "a1", "Test Corp");

    const result = await resolveOwnerSummary(db, { humanId: null, accountId: "a1", generalLeadId: null });

    expect(result).toEqual([
      { type: "account", id: "a1", displayId: expect.stringContaining("ACC-"), name: "Test Corp" },
    ]);
  });

  it("resolves a general lead owner", async () => {
    const db = getTestDb();
    await seedGeneralLead(db, "gl1", "Jane", "Smith");

    const result = await resolveOwnerSummary(db, { humanId: null, accountId: null, generalLeadId: "gl1" });

    expect(result).toEqual([
      { type: "generalLead", id: "gl1", displayId: expect.stringContaining("LEA-"), name: "Jane Smith" },
    ]);
  });

  it("returns empty array when no owner FKs set", async () => {
    const db = getTestDb();

    const result = await resolveOwnerSummary(db, { humanId: null, accountId: null, generalLeadId: null });

    expect(result).toEqual([]);
  });

  it("ignores FK pointing to missing record", async () => {
    const db = getTestDb();

    const result = await resolveOwnerSummary(db, { humanId: "nonexistent", accountId: null, generalLeadId: null });

    expect(result).toEqual([]);
  });

  it("returns empty array when accountId points to a missing record", async () => {
    const db = getTestDb();

    const result = await resolveOwnerSummary(db, { humanId: null, accountId: "nonexistent-acc", generalLeadId: null });

    expect(result).toEqual([]);
  });

  it("returns empty array when generalLeadId points to a missing record", async () => {
    const db = getTestDb();

    const result = await resolveOwnerSummary(db, { humanId: null, accountId: null, generalLeadId: "nonexistent-gl" });

    expect(result).toEqual([]);
  });

  it("resolves both human and account owners when both FKs are set", async () => {
    const db = getTestDb();
    await seedHuman(db, "h-multi", "Alice", "Jones");
    await seedAccount(db, "a-multi", "Multi Corp");

    const result = await resolveOwnerSummary(db, {
      humanId: "h-multi",
      accountId: "a-multi",
      generalLeadId: null,
    });

    expect(result).toHaveLength(2);
    const human = result.find((o) => o.type === "human");
    const account = result.find((o) => o.type === "account");
    expect(human).toMatchObject({ type: "human", id: "h-multi", name: "Alice Jones" });
    expect(account).toMatchObject({ type: "account", id: "a-multi", name: "Multi Corp" });
  });
});
