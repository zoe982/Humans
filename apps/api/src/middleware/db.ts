import { createMiddleware } from "hono/factory";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@humans/db/schema";
import type { AppContext } from "../types";

export const dbMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const sql = postgres(c.env.HYPERDRIVE.connectionString, {
    max: 5,
    fetch_types: false,
    prepare: false,
  });
  const db = drizzle(sql, { schema });
  c.set("db", db);
  await next();
});
