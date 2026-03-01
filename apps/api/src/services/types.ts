import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "@humans/db/schema";

export type DB = PostgresJsDatabase<typeof schema>;
