import { Hono } from "hono";
import { like, or } from "drizzle-orm";
import { humans, humanEmails, humanPhoneNumbers, activities, geoInterests, geoInterestExpressions } from "@humans/db/schema";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import type { AppContext } from "../types";

const searchRoutes = new Hono<AppContext>();

searchRoutes.use("/*", authMiddleware);

searchRoutes.get("/api/search", requirePermission("viewRecords"), supabaseMiddleware, async (c) => {
  const q = c.req.query("q");
  if (!q || q.trim().length === 0) {
    return c.json({ humans: [], routeSignups: [], activities: [], geoInterests: [] });
  }

  const db = c.get("db");
  const supabase = c.get("supabase");
  const pattern = `%${q}%`;

  // Search D1 in parallel
  const [humanResults, emailResults, phoneResults, activityResults, geoInterestResults, supabaseResult] =
    await Promise.all([
      db
        .select()
        .from(humans)
        .where(or(like(humans.firstName, pattern), like(humans.lastName, pattern))),
      db.select().from(humanEmails).where(like(humanEmails.email, pattern)),
      db
        .select()
        .from(humanPhoneNumbers)
        .where(like(humanPhoneNumbers.phoneNumber, pattern)),
      db
        .select()
        .from(activities)
        .where(or(like(activities.subject, pattern), like(activities.notes, pattern))),
      db
        .select()
        .from(geoInterests)
        .where(or(like(geoInterests.city, pattern), like(geoInterests.country, pattern))),
      supabase
        .from("announcement_signups")
        .select("*")
        .or(
          `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},origin.ilike.${pattern},destination.ilike.${pattern}`,
        ),
    ]);

  // Fetch expressions for matched geo-interests to find linked humans
  const allExpressions = geoInterestResults.length > 0
    ? await db.select().from(geoInterestExpressions)
    : [];

  // Merge human results: collect unique human IDs from name, email, phone, geo-interest matches
  const humanIds = new Set<string>();
  humanResults.forEach((h) => humanIds.add(h.id));
  emailResults.forEach((e) => humanIds.add(e.humanId));
  phoneResults.forEach((p) => humanIds.add(p.humanId));

  const matchedGeoInterestIds = new Set(geoInterestResults.map((gi) => gi.id));
  allExpressions
    .filter((e) => matchedGeoInterestIds.has(e.geoInterestId))
    .forEach((e) => humanIds.add(e.humanId));

  // Fetch full data for matched humans
  const allHumans = await db.select().from(humans);
  const allEmails = await db.select().from(humanEmails);
  const matchedHumans = allHumans
    .filter((h) => humanIds.has(h.id))
    .map((h) => ({
      ...h,
      emails: allEmails.filter((e) => e.humanId === h.id),
    }));

  // Enrich geo-interest results with expression counts
  const geoInterestsWithCounts = geoInterestResults.map((gi) => {
    const expressions = allExpressions.filter((e) => e.geoInterestId === gi.id);
    return {
      ...gi,
      expressionCount: expressions.length,
      humanCount: new Set(expressions.map((e) => e.humanId)).size,
    };
  });

  return c.json({
    humans: matchedHumans,
    routeSignups: supabaseResult.data ?? [],
    activities: activityResults,
    geoInterests: geoInterestsWithCounts,
  });
});

export { searchRoutes };
