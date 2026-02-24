import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";
import { getAccountDetail } from "../services/accounts";
import type { AppContext } from "../types";

const health = new Hono<AppContext>();

health.get("/", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

health.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Temporary debug endpoint — remove after diagnosing blank page
health.get("/debug/account/:id", async (c) => {
  const id = c.req.param("id");
  const t0 = Date.now();
  try {
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const data = await getAccountDetail(supabase, c.get("db"), id);
    const elapsed = Date.now() - t0;
    const json = JSON.stringify({ data });
    return c.json({
      ok: true,
      elapsed_ms: elapsed,
      response_bytes: json.length,
      activities_count: data.activities.length,
      linked_humans_count: data.linkedHumans.length,
      emails_count: data.emails.length,
      phones_count: data.phoneNumbers.length,
    });
  } catch (err) {
    const elapsed = Date.now() - t0;
    return c.json({
      ok: false,
      elapsed_ms: elapsed,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, 500);
  }
});

export { health };
