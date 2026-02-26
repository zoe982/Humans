import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import {
  computeLeadScore,
  ensureLeadScore,
  getLeadScore,
  getLeadScoreByParent,
  listLeadScores,
  updateLeadScoreFlags,
} from "../../../src/services/lead-scores";
import * as schema from "@humans/db/schema";

function now() {
  return new Date().toISOString();
}

let seedCounter = 0;

async function seedGeneralLead(db: ReturnType<typeof getTestDb>, id = "gl-1") {
  seedCounter++;
  const ts = now();
  await db.insert(schema.generalLeads).values({
    id,
    displayId: `LEA-${String(seedCounter).padStart(6, "0")}`,
    status: "open",
    firstName: "Test",
    lastName: "Lead",
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

async function seedDisplayIdCounter(db: ReturnType<typeof getTestDb>, prefix = "SCO") {
  await db.insert(schema.displayIdCounters).values({ prefix, counter: 0 });
}

// ─── computeLeadScore ────────────────────────────────────────────

describe("computeLeadScore", () => {
  it("returns all zeros for no flags set", () => {
    const result = computeLeadScore({});
    expect(result).toStrictEqual({
      scoreFit: 0,
      scoreIntent: 0,
      scoreEngagement: 0,
      scoreNegative: 0,
      scoreTotal: 0,
    });
  });

  // ── Fit ──

  it("scores fit: matches flight = 30", () => {
    const result = computeLeadScore({ fitMatchesCurrentWebsiteFlight: true });
    expect(result.scoreFit).toBe(30);
    expect(result.scoreTotal).toBe(30);
  });

  it("scores fit: price ack = 5", () => {
    const result = computeLeadScore({ fitPriceAcknowledgedOk: true });
    expect(result.scoreFit).toBe(5);
  });

  it("scores fit: both flags = min(35, 30+5) = 35", () => {
    const result = computeLeadScore({
      fitMatchesCurrentWebsiteFlight: true,
      fitPriceAcknowledgedOk: true,
    });
    expect(result.scoreFit).toBe(35);
  });

  // ── Intent ──

  it("scores intent: deposit paid = 50 (highest)", () => {
    const result = computeLeadScore({ intentDepositPaid: true });
    expect(result.scoreIntent).toBe(50);
  });

  it("scores intent: payment details sent = 35", () => {
    const result = computeLeadScore({ intentPaymentDetailsSent: true });
    expect(result.scoreIntent).toBe(35);
  });

  it("scores intent: requested payment details = 25", () => {
    const result = computeLeadScore({ intentRequestedPaymentDetails: true });
    expect(result.scoreIntent).toBe(25);
  });

  it("scores intent: booking submitted = 20", () => {
    const result = computeLeadScore({ intentBookingSubmitted: true });
    expect(result.scoreIntent).toBe(20);
  });

  it("scores intent: booking started = 10", () => {
    const result = computeLeadScore({ intentBookingStarted: true });
    expect(result.scoreIntent).toBe(10);
  });

  it("scores intent: route signup submitted = 5", () => {
    const result = computeLeadScore({ intentRouteSignupSubmitted: true });
    expect(result.scoreIntent).toBe(5);
  });

  it("scores intent: takes max when multiple set", () => {
    const result = computeLeadScore({
      intentDepositPaid: true,
      intentBookingStarted: true,
    });
    expect(result.scoreIntent).toBe(50);
  });

  // ── Engagement ──

  it("scores engagement: fast = 15", () => {
    const result = computeLeadScore({ engagementRespondedFast: true });
    expect(result.scoreEngagement).toBe(15);
  });

  it("scores engagement: slow = 8", () => {
    const result = computeLeadScore({ engagementRespondedSlow: true });
    expect(result.scoreEngagement).toBe(8);
  });

  it("scores engagement: both set takes max (fast)", () => {
    const result = computeLeadScore({
      engagementRespondedFast: true,
      engagementRespondedSlow: true,
    });
    expect(result.scoreEngagement).toBe(15);
  });

  // ── Negative ──

  it("scores negative: no contact method = 30", () => {
    const result = computeLeadScore({ negativeNoContactMethod: true });
    expect(result.scoreNegative).toBe(30);
  });

  it("scores negative: off network = 25", () => {
    const result = computeLeadScore({ negativeOffNetworkRequest: true });
    expect(result.scoreNegative).toBe(25);
  });

  it("scores negative: price objection = 20", () => {
    const result = computeLeadScore({ negativePriceObjection: true });
    expect(result.scoreNegative).toBe(20);
  });

  it("scores negative: ghosted = 15", () => {
    const result = computeLeadScore({ negativeGhostedAfterPaymentSent: true });
    expect(result.scoreNegative).toBe(15);
  });

  it("caps negative at 60", () => {
    const result = computeLeadScore({
      negativeNoContactMethod: true,
      negativeOffNetworkRequest: true,
      negativePriceObjection: true,
      negativeGhostedAfterPaymentSent: true,
    });
    // 30 + 25 + 20 + 15 = 90, capped at 60
    expect(result.scoreNegative).toBe(60);
  });

  // ── Total computation ──

  it("subtracts negative from positive", () => {
    const result = computeLeadScore({
      fitMatchesCurrentWebsiteFlight: true, // 30
      negativeNoContactMethod: true, // -30
    });
    expect(result.scoreTotal).toBe(0);
  });

  it("clamps total to 0 minimum", () => {
    const result = computeLeadScore({
      negativeNoContactMethod: true,
      negativeOffNetworkRequest: true,
    });
    expect(result.scoreTotal).toBe(0);
  });

  it("clamps total to 100 maximum", () => {
    const result = computeLeadScore({
      fitMatchesCurrentWebsiteFlight: true, // 30
      fitPriceAcknowledgedOk: true, // 5
      intentDepositPaid: true, // 50
      engagementRespondedFast: true, // 15
    });
    // 35 + 50 + 15 = 100
    expect(result.scoreTotal).toBe(100);
  });

  // ── Overrides ──

  it("override: deposit paid raises total to at least 90", () => {
    const result = computeLeadScore({
      intentDepositPaid: true, // intent=50
    });
    expect(result.scoreTotal).toBe(90);
  });

  it("override: deposit paid doesn't lower total if already above 90", () => {
    const result = computeLeadScore({
      fitMatchesCurrentWebsiteFlight: true, // 30
      fitPriceAcknowledgedOk: true, // 5
      intentDepositPaid: true, // 50
      engagementRespondedFast: true, // 15
    });
    // 35 + 50 + 15 = 100, already above 90
    expect(result.scoreTotal).toBe(100);
  });

  it("override: customer has flown raises total to at least 95", () => {
    const result = computeLeadScore({
      customerHasFlown: true,
    });
    expect(result.scoreTotal).toBe(95);
  });

  it("override: customer has flown doesn't lower total if already above 95", () => {
    const result = computeLeadScore({
      fitMatchesCurrentWebsiteFlight: true,
      fitPriceAcknowledgedOk: true,
      intentDepositPaid: true,
      engagementRespondedFast: true,
      customerHasFlown: true,
    });
    expect(result.scoreTotal).toBe(100);
  });

  // ── Hard cap ──

  it("hard cap: no contact AND no deposit caps at 20", () => {
    const result = computeLeadScore({
      fitMatchesCurrentWebsiteFlight: true, // 30
      fitPriceAcknowledgedOk: true, // 5
      engagementRespondedFast: true, // 15
      negativeNoContactMethod: true, // -30
    });
    // Without hard cap: 35 + 15 - 30 = 20
    // With hard cap: min(20, 20) = 20
    expect(result.scoreTotal).toBe(20);
  });

  it("hard cap does not apply when deposit is paid", () => {
    const result = computeLeadScore({
      intentDepositPaid: true,
      negativeNoContactMethod: true,
    });
    // Deposit override → max(50 - 30, 90) = 90
    expect(result.scoreTotal).toBe(90);
  });

  it("hard cap applies even with high positive scores", () => {
    const result = computeLeadScore({
      fitMatchesCurrentWebsiteFlight: true, // 30
      fitPriceAcknowledgedOk: true, // 5
      intentBookingSubmitted: true, // 20
      engagementRespondedFast: true, // 15
      negativeNoContactMethod: true, // -30
    });
    // 35 + 20 + 15 - 30 = 40, hard cap → min(40, 20) = 20
    expect(result.scoreTotal).toBe(20);
  });
});

// ─── ensureLeadScore ─────────────────────────────────────────────

describe("ensureLeadScore", () => {
  it("creates a new lead score for general_lead", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");

    const result = await ensureLeadScore(db, "general_lead", "gl-1");
    expect(result.id).toBeDefined();
    expect(result.displayId).toMatch(/^SCO-/);
    expect(result.generalLeadId).toBe("gl-1");
    expect(result.scoreTotal).toBe(0);
  });

  it("returns existing score if already created (idempotent)", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");

    const first = await ensureLeadScore(db, "general_lead", "gl-1");
    const second = await ensureLeadScore(db, "general_lead", "gl-1");
    expect(first.id).toBe(second.id);
  });

  it("creates a lead score for website_booking_request", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);

    const result = await ensureLeadScore(db, "website_booking_request", "bor-1");
    expect(result.websiteBookingRequestId).toBe("bor-1");
    expect(result.generalLeadId).toBeNull();
  });

  it("creates a lead score for route_signup", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);

    const result = await ensureLeadScore(db, "route_signup", "rou-1");
    expect(result.routeSignupId).toBe("rou-1");
  });
});

// ─── getLeadScore ────────────────────────────────────────────────

describe("getLeadScore", () => {
  it("returns a lead score by id", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");

    const created = await ensureLeadScore(db, "general_lead", "gl-1");
    const result = await getLeadScore(db, created.id);
    expect(result.id).toBe(created.id);
    expect(result.displayId).toBe(created.displayId);
  });

  it("throws not found for missing id", async () => {
    const db = getTestDb();
    await expect(getLeadScore(db, "nonexistent")).rejects.toThrowError("Lead score not found");
  });
});

// ─── getLeadScoreByParent ────────────────────────────────────────

describe("getLeadScoreByParent", () => {
  it("returns lead score by general_lead parent", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");
    await ensureLeadScore(db, "general_lead", "gl-1");

    const result = await getLeadScoreByParent(db, "general_lead", "gl-1");
    expect(result).not.toBeNull();
    expect(result!.generalLeadId).toBe("gl-1");
  });

  it("returns null for missing parent", async () => {
    const db = getTestDb();
    const result = await getLeadScoreByParent(db, "general_lead", "nonexistent");
    expect(result).toBeNull();
  });
});

// ─── listLeadScores ──────────────────────────────────────────────

describe("listLeadScores", () => {
  it("returns empty list when no scores", async () => {
    const db = getTestDb();
    const result = await listLeadScores(db, 1, 25, {});
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it("returns all lead scores with pagination", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");
    await seedGeneralLead(db, "gl-2");
    await ensureLeadScore(db, "general_lead", "gl-1");
    await ensureLeadScore(db, "general_lead", "gl-2");

    const result = await listLeadScores(db, 1, 25, {});
    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
  });

  it("filters by parentType", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");
    await ensureLeadScore(db, "general_lead", "gl-1");
    await ensureLeadScore(db, "website_booking_request", "bor-1");

    const result = await listLeadScores(db, 1, 25, { parentType: "general_lead" });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.generalLeadId).toBe("gl-1");
  });

  it("filters by band", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");
    const score = await ensureLeadScore(db, "general_lead", "gl-1");
    // Update to make it hot
    await updateLeadScoreFlags(db, score.id, {
      fitMatchesCurrentWebsiteFlight: true,
      intentDepositPaid: true,
    });

    const hot = await listLeadScores(db, 1, 25, { band: "hot" });
    expect(hot.data).toHaveLength(1);

    const cold = await listLeadScores(db, 1, 25, { band: "cold" });
    expect(cold.data).toHaveLength(0);
  });

  it("paginates correctly", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");
    await seedGeneralLead(db, "gl-2");
    await seedGeneralLead(db, "gl-3");
    await ensureLeadScore(db, "general_lead", "gl-1");
    await ensureLeadScore(db, "general_lead", "gl-2");
    await ensureLeadScore(db, "general_lead", "gl-3");

    const page1 = await listLeadScores(db, 1, 2, {});
    expect(page1.data).toHaveLength(2);
    expect(page1.meta.total).toBe(3);
    expect(page1.meta.page).toBe(1);
    expect(page1.meta.limit).toBe(2);

    const page2 = await listLeadScores(db, 2, 2, {});
    expect(page2.data).toHaveLength(1);
  });
});

// ─── updateLeadScoreFlags ────────────────────────────────────────

describe("updateLeadScoreFlags", () => {
  it("updates a single flag and recomputes scores", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");
    const score = await ensureLeadScore(db, "general_lead", "gl-1");

    const updated = await updateLeadScoreFlags(db, score.id, {
      fitMatchesCurrentWebsiteFlight: true,
    });

    expect(updated.fitMatchesCurrentWebsiteFlight).toBe(true);
    expect(updated.scoreFit).toBe(30);
    expect(updated.scoreTotal).toBe(30);
  });

  it("enforces intent hierarchy: setting higher unticks lower", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");
    const score = await ensureLeadScore(db, "general_lead", "gl-1");

    // Set booking started first
    await updateLeadScoreFlags(db, score.id, { intentBookingStarted: true });

    // Now set deposit paid → should untick booking started
    const updated = await updateLeadScoreFlags(db, score.id, { intentDepositPaid: true });

    expect(updated.intentDepositPaid).toBe(true);
    expect(updated.intentBookingStarted).toBe(false);
    expect(updated.scoreIntent).toBe(50);
  });

  it("enforces intent hierarchy: setting lower unticks higher", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");
    const score = await ensureLeadScore(db, "general_lead", "gl-1");

    // Set deposit paid first
    await updateLeadScoreFlags(db, score.id, { intentDepositPaid: true });

    // Now set booking started → should untick deposit paid
    const updated = await updateLeadScoreFlags(db, score.id, { intentBookingStarted: true });

    expect(updated.intentBookingStarted).toBe(true);
    expect(updated.intentDepositPaid).toBe(false);
    expect(updated.scoreIntent).toBe(10);
  });

  it("enforces engagement mutual exclusion: fast unticks slow", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");
    const score = await ensureLeadScore(db, "general_lead", "gl-1");

    await updateLeadScoreFlags(db, score.id, { engagementRespondedSlow: true });
    const updated = await updateLeadScoreFlags(db, score.id, { engagementRespondedFast: true });

    expect(updated.engagementRespondedFast).toBe(true);
    expect(updated.engagementRespondedSlow).toBe(false);
    expect(updated.scoreEngagement).toBe(15);
  });

  it("enforces engagement mutual exclusion: slow unticks fast", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");
    const score = await ensureLeadScore(db, "general_lead", "gl-1");

    await updateLeadScoreFlags(db, score.id, { engagementRespondedFast: true });
    const updated = await updateLeadScoreFlags(db, score.id, { engagementRespondedSlow: true });

    expect(updated.engagementRespondedSlow).toBe(true);
    expect(updated.engagementRespondedFast).toBe(false);
    expect(updated.scoreEngagement).toBe(8);
  });

  it("throws not found for missing id", async () => {
    const db = getTestDb();
    await expect(
      updateLeadScoreFlags(db, "nonexistent", { fitMatchesCurrentWebsiteFlight: true })
    ).rejects.toThrowError("Lead score not found");
  });

  it("recomputes total with overrides correctly", async () => {
    const db = getTestDb();
    await seedDisplayIdCounter(db);
    await seedGeneralLead(db, "gl-1");
    const score = await ensureLeadScore(db, "general_lead", "gl-1");

    const updated = await updateLeadScoreFlags(db, score.id, {
      intentDepositPaid: true,
      negativeNoContactMethod: true,
    });

    // deposit override → max(50 - 30, 90) = 90
    // hard cap does not apply because deposit is paid
    expect(updated.scoreTotal).toBe(90);
  });
});
