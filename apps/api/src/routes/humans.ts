import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  humans,
  humanEmails,
  humanTypes,
  humanRouteSignups,
  humanPhoneNumbers,
  activities,
  pets,
  geoInterestExpressions,
  geoInterests,
  accountHumans,
  accounts,
  accountHumanLabelsConfig,
} from "@humans/db/schema";
import { createId } from "@humans/db";
import {
  createHumanSchema,
  updateHumanSchema,
  updateHumanStatusSchema,
  linkRouteSignupSchema,
} from "@humans/shared";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import type { AppContext } from "../types";

const humanRoutes = new Hono<AppContext>();

humanRoutes.use("/*", authMiddleware);

// List all humans with emails and types
humanRoutes.get("/api/humans", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const allHumans = await db.select().from(humans);
  const allEmails = await db.select().from(humanEmails);
  const allTypes = await db.select().from(humanTypes);

  const data = allHumans.map((h) => ({
    ...h,
    emails: allEmails.filter((e) => e.humanId === h.id),
    types: allTypes.filter((t) => t.humanId === h.id).map((t) => t.type),
  }));

  return c.json({ data });
});

// Get single human with emails, types, linked signups, phone numbers, pets
humanRoutes.get("/api/humans/:id", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const human = await db.query.humans.findFirst({
    where: eq(humans.id, c.req.param("id")),
  });
  if (human == null) {
    return c.json({ error: "Human not found" }, 404);
  }

  const [emails, types, linkedSignups, phoneNumbers, humanPets, geoExpressions, linkedAccountRows] = await Promise.all([
    db.select().from(humanEmails).where(eq(humanEmails.humanId, human.id)),
    db.select().from(humanTypes).where(eq(humanTypes.humanId, human.id)),
    db.select().from(humanRouteSignups).where(eq(humanRouteSignups.humanId, human.id)),
    db.select().from(humanPhoneNumbers).where(eq(humanPhoneNumbers.humanId, human.id)),
    db.select().from(pets).where(eq(pets.humanId, human.id)),
    db.select().from(geoInterestExpressions).where(eq(geoInterestExpressions.humanId, human.id)),
    db.select().from(accountHumans).where(eq(accountHumans.humanId, human.id)),
  ]);

  // Resolve geo-interest city/country for expressions
  const allGeoInterests = geoExpressions.length > 0
    ? await db.select().from(geoInterests)
    : [];

  const geoInterestExpressionsWithDetails = geoExpressions.map((expr) => {
    const gi = allGeoInterests.find((g) => g.id === expr.geoInterestId);
    return {
      ...expr,
      city: gi?.city ?? null,
      country: gi?.country ?? null,
    };
  });

  // Resolve linked accounts with names and labels
  let linkedAccounts: { id: string; accountId: string; accountName: string; labelName: string | null }[] = [];
  if (linkedAccountRows.length > 0) {
    const [allAccounts, allLabels] = await Promise.all([
      db.select().from(accounts),
      db.select().from(accountHumanLabelsConfig),
    ]);
    linkedAccounts = linkedAccountRows.map((row) => {
      const account = allAccounts.find((a) => a.id === row.accountId);
      const label = row.labelId ? allLabels.find((l) => l.id === row.labelId) : null;
      return {
        id: row.id,
        accountId: row.accountId,
        accountName: account?.name ?? "Unknown",
        labelName: label?.name ?? null,
      };
    });
  }

  return c.json({
    data: {
      ...human,
      emails,
      types: types.map((t) => t.type),
      linkedRouteSignups: linkedSignups,
      phoneNumbers,
      pets: humanPets,
      geoInterestExpressions: geoInterestExpressionsWithDetails,
      linkedAccounts,
    },
  });
});

// Create human with emails and types
humanRoutes.post("/api/humans", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = createHumanSchema.parse(body);
  const db = c.get("db");
  const now = new Date().toISOString();
  const humanId = createId();

  await db.insert(humans).values({
    id: humanId,
    firstName: data.firstName,
    middleName: data.middleName ?? null,
    lastName: data.lastName,
    status: data.status ?? "open",
    createdAt: now,
    updatedAt: now,
  });

  for (const email of data.emails) {
    await db.insert(humanEmails).values({
      id: createId(),
      humanId,
      email: email.email,
      label: email.label ?? "personal",
      isPrimary: email.isPrimary ?? false,
      createdAt: now,
    });
  }

  for (const type of data.types) {
    await db.insert(humanTypes).values({
      id: createId(),
      humanId,
      type,
      createdAt: now,
    });
  }

  return c.json({ data: { id: humanId } }, 201);
});

// Update human, replace emails/types
humanRoutes.patch("/api/humans/:id", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateHumanSchema.parse(body);
  const db = c.get("db");
  const id = c.req.param("id");
  const now = new Date().toISOString();

  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  if (existing == null) {
    return c.json({ error: "Human not found" }, 404);
  }

  // Update human fields
  const updateFields: Record<string, unknown> = { updatedAt: now };
  if (data.firstName !== undefined) updateFields["firstName"] = data.firstName;
  if (data.middleName !== undefined) updateFields["middleName"] = data.middleName;
  if (data.lastName !== undefined) updateFields["lastName"] = data.lastName;
  if (data.status !== undefined) updateFields["status"] = data.status;

  await db.update(humans).set(updateFields).where(eq(humans.id, id));

  // Replace emails if provided
  if (data.emails) {
    await db.delete(humanEmails).where(eq(humanEmails.humanId, id));
    for (const email of data.emails) {
      await db.insert(humanEmails).values({
        id: createId(),
        humanId: id,
        email: email.email,
        label: email.label ?? "personal",
        isPrimary: email.isPrimary ?? false,
        createdAt: now,
      });
    }
  }

  // Replace types if provided
  if (data.types) {
    await db.delete(humanTypes).where(eq(humanTypes.humanId, id));
    for (const type of data.types) {
      await db.insert(humanTypes).values({
        id: createId(),
        humanId: id,
        type,
        createdAt: now,
      });
    }
  }

  const updated = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  return c.json({ data: updated });
});

// Update human status
humanRoutes.patch("/api/humans/:id/status", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = updateHumanStatusSchema.parse(body);
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  if (existing == null) {
    return c.json({ error: "Human not found" }, 404);
  }

  await db
    .update(humans)
    .set({ status: data.status, updatedAt: new Date().toISOString() })
    .where(eq(humans.id, id));

  return c.json({ data: { id, status: data.status } });
});

// Delete human + cascade related records
humanRoutes.delete("/api/humans/:id", requirePermission("manageHumans"), async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  if (existing == null) {
    return c.json({ error: "Human not found" }, 404);
  }

  await db.delete(humanEmails).where(eq(humanEmails.humanId, id));
  await db.delete(humanTypes).where(eq(humanTypes.humanId, id));
  await db.delete(humanRouteSignups).where(eq(humanRouteSignups.humanId, id));
  await db.delete(humanPhoneNumbers).where(eq(humanPhoneNumbers.humanId, id));
  await db.delete(pets).where(eq(pets.humanId, id));
  await db.delete(geoInterestExpressions).where(eq(geoInterestExpressions.humanId, id));
  await db.delete(accountHumans).where(eq(accountHumans.humanId, id));
  await db.delete(humans).where(eq(humans.id, id));

  return c.json({ success: true });
});

// Link a route signup to a human
humanRoutes.post("/api/humans/:id/route-signups", requirePermission("manageHumans"), async (c) => {
  const body: unknown = await c.req.json();
  const data = linkRouteSignupSchema.parse(body);
  const db = c.get("db");
  const id = c.req.param("id");

  const existing = await db.query.humans.findFirst({
    where: eq(humans.id, id),
  });
  if (existing == null) {
    return c.json({ error: "Human not found" }, 404);
  }

  const link = {
    id: createId(),
    humanId: id,
    routeSignupId: data.routeSignupId,
    linkedAt: new Date().toISOString(),
  };
  await db.insert(humanRouteSignups).values(link);

  return c.json({ data: link }, 201);
});

// Unlink a route signup
humanRoutes.delete("/api/humans/:id/route-signups/:linkId", requirePermission("manageHumans"), async (c) => {
  const db = c.get("db");
  const linkId = c.req.param("linkId");

  await db.delete(humanRouteSignups).where(eq(humanRouteSignups.id, linkId));

  return c.json({ success: true });
});

// Convert from signup: link signup, update Supabase status, re-parent activities
humanRoutes.post(
  "/api/humans/:id/convert-from-signup",
  requirePermission("manageHumans"),
  supabaseMiddleware,
  async (c) => {
    const body: unknown = await c.req.json();
    const data = linkRouteSignupSchema.parse(body);
    const db = c.get("db");
    const supabase = c.get("supabase");
    const humanId = c.req.param("id");

    const existing = await db.query.humans.findFirst({
      where: eq(humans.id, humanId),
    });
    if (existing == null) {
      return c.json({ error: "Human not found" }, 404);
    }

    // Create link in D1
    const link = {
      id: createId(),
      humanId,
      routeSignupId: data.routeSignupId,
      linkedAt: new Date().toISOString(),
    };
    await db.insert(humanRouteSignups).values(link);

    // Update Supabase status to closed_converted
    const { error: supaError } = await supabase
      .from("announcement_signups")
      .update({ status: "closed_converted" })
      .eq("id", data.routeSignupId);

    if (supaError) {
      return c.json({ error: `Supabase update failed: ${supaError.message}` }, 500);
    }

    // Re-parent activities: set human_id on all activities matching this route_signup_id
    await db
      .update(activities)
      .set({ humanId, updatedAt: new Date().toISOString() })
      .where(eq(activities.routeSignupId, data.routeSignupId));

    return c.json({ data: { link, status: "closed_converted" } });
  },
);

export { humanRoutes };
