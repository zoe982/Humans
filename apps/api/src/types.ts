import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type * as schema from "@humans/db/schema";

export interface RateLimiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  HYPERDRIVE: Hyperdrive;
  SESSIONS: KVNamespace;
  DOCUMENTS: R2Bucket;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  APP_URL: string;
  ENVIRONMENT: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  FRONT_API_TOKEN: string;
  RealtimeHub: DurableObjectNamespace;
  RL_AUTH: RateLimiter;
  RL_API: RateLimiter;
  RL_SEARCH: RateLimiter;
  RL_CLIENT_ERRORS: RateLimiter;
}

export interface SessionData {
  colleagueId: string;
  email: string;
  role: string;
  ip?: string | undefined;
  refreshedAt?: number | undefined;
}

export interface AppContext {
  Bindings: Env;
  Variables: {
    db: PostgresJsDatabase<typeof schema>;
    session: SessionData | null;
    requestId: string;
    supabase: SupabaseClient;
  };
}
