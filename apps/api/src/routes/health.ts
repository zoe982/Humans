import { Hono } from "hono";
import type { AppContext } from "../types";

const health = new Hono<AppContext>();

health.get("/", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

health.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

export { health };
