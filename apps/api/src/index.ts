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
import { flightRoutes } from "./routes/flights";
import type { AppContext } from "./types";

const app = new Hono<AppContext>();

// Global middleware
app.use("/*", cors({
  origin: (origin) => origin, // Allow the requesting origin (cookie-based auth)
  credentials: true,
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type"],
}));
app.use("/*", logger());
app.use("/*", requestIdMiddleware);
app.use("/*", dbMiddleware);

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
app.route("/", flightRoutes);

export default app;
