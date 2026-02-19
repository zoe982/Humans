import type { DrizzleD1Database } from "drizzle-orm/d1";
import type { SupabaseClient } from "@supabase/supabase-js";
import type * as schema from "@humans/db/schema";

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  DOCUMENTS: R2Bucket;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  APP_URL: string;
  ENVIRONMENT: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export interface SessionData {
  colleagueId: string;
  email: string;
  role: string;
}

export interface AppContext {
  Bindings: Env;
  Variables: {
    db: DrizzleD1Database<typeof schema>;
    session: SessionData | null;
    requestId: string;
    supabase: SupabaseClient;
  };
}
