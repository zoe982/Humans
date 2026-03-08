import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { dbMiddleware } from "./middleware/db";
import { requestIdMiddleware } from "./middleware/request-id";
import { errorHandler } from "./middleware/error-handler";
import { health } from "./routes/health";
import { auth } from "./routes/auth";
import { petRoutes } from "./routes/pets";
import { leadRoutes } from "./routes/leads";
import { adminRoutes } from "./routes/admin";
import { documentRoutes } from "./routes/documents";
import { routeSignupRoutes } from "./routes/route-signups";
import { websiteBookingRequestRoutes } from "./routes/website-booking-requests";
import { humanRoutes } from "./routes/humans";
import { activityRoutes } from "./routes/activities";
import { phoneNumberRoutes } from "./routes/phone-numbers";
import { searchRoutes } from "./routes/search";
import { emailRoutes } from "./routes/emails";
import { geoInterestRoutes } from "./routes/geo-interests";
import { routeInterestRoutes } from "./routes/route-interests-crud";
import { accountRoutes } from "./routes/accounts";
import { accountConfigRoutes } from "./routes/account-config";
import { auditLogRoutes } from "./routes/audit-log";
import { errorLogRoutes } from "./routes/error-log";
import { frontRoutes } from "./routes/front";
import { socialIdRoutes } from "./routes/social-ids";
import { colleagueRoutes } from "./routes/colleagues";
import { opportunityRoutes } from "./routes/opportunities";
import { generalLeadRoutes } from "./routes/general-leads";
import { allLeadRoutes } from "./routes/all-leads";
import { evacuationLeadRoutes } from "./routes/evacuation-leads";
import { nextActionReportRoutes } from "./routes/reports/next-actions";
import { flightRoutes } from "./routes/flights";
import { referralCodeRoutes } from "./routes/referral-codes";
import { discountCodeRoutes } from "./routes/discount-codes";
import { websiteRoutes } from "./routes/websites";
import { agreementRoutes } from "./routes/agreements";
import { marketingAttributionRoutes } from "./routes/marketing-attributions";
import { leadScoreRoutes } from "./routes/lead-scores";
import { opportunityCadenceRoutes } from "./routes/opportunity-cadence";
import { clientErrorRoutes } from "./routes/client-errors";
import { uiDataRoutes } from "./routes/ui-data";
import { runScheduledFrontSync } from "./scheduled/front-sync";
import { realtimeMiddleware } from "./middleware/realtime";
import { timingMiddleware } from "./middleware/timing";
import { securityHeaders } from "./middleware/security-headers";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import type { AppContext, Env } from "./types";

const app = new Hono<AppContext>();

// Global middleware
app.use("/*", cors({
  origin: (origin, c) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- Hono cors callback context is untyped
    const appUrl = String(c.env.APP_URL);
    const allowed = [appUrl, "http://localhost:5173"];
    return allowed.includes(origin) ? origin : "";
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type"],
}));
app.use("/*", logger());
app.use("/*", securityHeaders);
app.use("/*", rateLimitMiddleware);
app.use("/*", requestIdMiddleware);
app.use("/*", timingMiddleware);
app.use("/*", dbMiddleware);
app.use("/*", realtimeMiddleware);

// Error handler
app.onError(errorHandler);

// Routes
app.route("/", health);
app.route("/", auth);
app.route("/", petRoutes);
app.route("/", leadRoutes);
app.route("/", adminRoutes);
app.route("/", documentRoutes);
app.route("/", routeSignupRoutes);
app.route("/", websiteBookingRequestRoutes);
app.route("/", humanRoutes);
app.route("/", activityRoutes);
app.route("/", phoneNumberRoutes);
app.route("/", searchRoutes);
app.route("/", emailRoutes);
app.route("/", geoInterestRoutes);
app.route("/", routeInterestRoutes);
app.route("/", accountRoutes);
app.route("/", accountConfigRoutes);
app.route("/", auditLogRoutes);
app.route("/", errorLogRoutes);
app.route("/", frontRoutes);
app.route("/", socialIdRoutes);
app.route("/", colleagueRoutes);
app.route("/", opportunityRoutes);
app.route("/", generalLeadRoutes);
app.route("/", allLeadRoutes);
app.route("/", evacuationLeadRoutes);
app.route("/", nextActionReportRoutes);
app.route("/", flightRoutes);
app.route("/", referralCodeRoutes);
app.route("/", discountCodeRoutes);
app.route("/", opportunityCadenceRoutes);
app.route("/", websiteRoutes);
app.route("/", clientErrorRoutes);
app.route("/", agreementRoutes);
app.route("/", marketingAttributionRoutes);
app.route("/", leadScoreRoutes);
app.route("/", uiDataRoutes);

export { RealtimeHub } from "./realtime/hub";

function routePartyRequest(req: Request, env: Env): Promise<Response> | null {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  // Match /parties/<namespace>/<room>
  if (parts[0] !== "parties" || parts.length < 3) return null;

  const namespace = parts[1];
  if (namespace !== "realtime-hub") {
    return Promise.resolve(new Response("Unknown party namespace", { status: 404 }));
  }

  const roomName = parts[2] ?? "";
  const id = env.RealtimeHub.idFromName(roomName);
  const stub = env.RealtimeHub.get(id);
  const result = stub.fetch(req);
  return result instanceof Promise ? result : Promise.resolve(result);
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const partyResponse = routePartyRequest(req, env);
    if (partyResponse !== null) return partyResponse;
    return app.fetch(req, env, ctx);
  },
  scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(runScheduledFrontSync(env));
  },
};
