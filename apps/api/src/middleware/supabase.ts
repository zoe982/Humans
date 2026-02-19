import { createMiddleware } from "hono/factory";
import { createClient } from "@supabase/supabase-js";
import type { AppContext } from "../types";

export const supabaseMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
  c.set("supabase", supabase);
  await next();
});
