import { createMiddleware } from "hono/factory";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@humans/db/schema";
import type { AppContext } from "../types";

export const dbMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const db = drizzle(c.env.DB, { schema });
  c.set("db", db);
  await next();
});
