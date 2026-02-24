import { drizzle } from "drizzle-orm/d1";
import { createClient } from "@supabase/supabase-js";
import * as schema from "@humans/db/schema";
import { syncFrontConversationsIncremental } from "../services/front-sync";
import type { Env } from "../types";

export async function runScheduledFrontSync(env: Env): Promise<void> {
  const db = drizzle(env.DB, { schema });
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const frontToken = env.FRONT_API_TOKEN;

  if (frontToken === "") {
    console.error("[cron] FRONT_API_TOKEN not configured, skipping sync");
    return;
  }

  try {
    const result = await syncFrontConversationsIncremental(db, supabase, frontToken);
    console.log(
      `[cron] Front sync complete: imported=${String(result.imported)} skipped=${String(result.skipped)} unmatched=${String(result.unmatched)} errors=${String(result.errors.length)}`,
    );
  } catch (err) {
    console.error("[cron] Front sync failed:", err instanceof Error ? err.message : String(err));
  }
}
