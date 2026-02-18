import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { dbMiddleware } from "./middleware/db";
import { requestIdMiddleware } from "./middleware/request-id";
import { errorHandler } from "./middleware/error-handler";
import { health } from "./routes/health";
import { auth } from "./routes/auth";
import { clientRoutes } from "./routes/clients";
import { petRoutes } from "./routes/pets";
import { flightRoutes } from "./routes/flights";
import { bookingRoutes } from "./routes/bookings";
import { leadRoutes } from "./routes/leads";
import { adminRoutes } from "./routes/admin";
import { documentRoutes } from "./routes/documents";
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
app.route("/", clientRoutes);
app.route("/", petRoutes);
app.route("/", flightRoutes);
app.route("/", bookingRoutes);
app.route("/", leadRoutes);
app.route("/", adminRoutes);
app.route("/", documentRoutes);

export default app;
