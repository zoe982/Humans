import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb } from "../setup";
import { getHumanDetailFull } from "../../../src/services/humans";
import { humans, activities, opportunities, opportunityHumans, generalLeads, agreements, agreementTypesConfig, humanRelationships, humanRelationshipLabelsConfig, humanEmailLabelsConfig, humanPhoneLabelsConfig, socialIdPlatformsConfig } from "@humans/db/schema";
import { createId } from "@humans/db";

// Minimal Supabase mock that returns empty arrays
function createMockSupabase() {
  return {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  };
}

describe("getHumanDetailFull", () => {
  const db = getTestDb();
  const supabase = createMockSupabase();

  const humanId = "h-full-1";
  const now = new Date().toISOString();

  beforeEach(async () => {
    // Seed a human
    await db.insert(humans).values({
      id: humanId,
      displayId: "HUM-AAA-001",
      firstName: "Alice",
      lastName: "Smith",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });

  it("returns human detail with all related entities in one response", async () => {
    // Seed an activity
    const activityId = createId();
    await db.insert(activities).values({
      id: activityId,
      displayId: "ACT-AAA-001",
      type: "email",
      subject: "Test activity",
      activityDate: now,
      humanId,
      createdAt: now,
      updatedAt: now,
    });

    // Seed an opportunity linked to this human
    const oppId = createId();
    await db.insert(opportunities).values({
      id: oppId,
      displayId: "OPP-AAA-001",
      stage: "open",
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(opportunityHumans).values({
      id: createId(),
      opportunityId: oppId,
      humanId,
      createdAt: now,
    });

    // Seed a general lead
    const leadId = createId();
    await db.insert(generalLeads).values({
      id: leadId,
      displayId: "LEA-AAA-001",
      status: "open",
      firstName: "Test",
      lastName: "Lead",
      convertedHumanId: humanId,
      createdAt: now,
      updatedAt: now,
    });

    // Seed an agreement
    const agreementId = createId();
    await db.insert(agreements).values({
      id: agreementId,
      displayId: "AGR-AAA-001",
      title: "Test agreement",
      status: "open",
      humanId,
      createdAt: now,
      updatedAt: now,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- mock supabase is structurally compatible
    const result = await getHumanDetailFull(supabase as never, db, humanId);

    // Human detail present
    expect(result.human.id).toBe(humanId);
    expect(result.human.firstName).toBe("Alice");

    // Activities present
    expect(result.activities.data.length).toBeGreaterThanOrEqual(1);
    expect(result.activities.data[0]).toMatchObject({ subject: "Test activity" });

    // Opportunities present
    expect(result.opportunities.data.length).toBeGreaterThanOrEqual(1);

    // General leads present
    expect(result.generalLeads.data.length).toBeGreaterThanOrEqual(1);

    // Agreements present
    expect(result.agreements.data.length).toBeGreaterThanOrEqual(1);
    expect(result.agreements.data[0]).toMatchObject({ title: "Test agreement" });

    // Relationships present (empty for this test)
    expect(result.relationships).toStrictEqual([]);
  });

  it("returns empty arrays for human with no related data", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- mock supabase
    const result = await getHumanDetailFull(supabase as never, db, humanId);

    expect(result.human.id).toBe(humanId);
    expect(result.activities.data).toStrictEqual([]);
    expect(result.opportunities.data).toStrictEqual([]);
    expect(result.generalLeads.data).toStrictEqual([]);
    expect(result.agreements.data).toStrictEqual([]);
    expect(result.relationships).toStrictEqual([]);
  });

  it("throws 404 for non-existent human", async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- mock supabase
      getHumanDetailFull(supabase as never, db, "nonexistent-id"),
    ).rejects.toThrowError("Human not found");
  });
});
