import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { requirePermission } from "../middleware/rbac";
import { supabaseMiddleware } from "../middleware/supabase";
import { listAccounts } from "../services/accounts";
import { listHumans } from "../services/humans";
import { listDiscountCodes } from "../services/discount-codes";
import type { AppContext } from "../types";

const uiDataRoutes = new Hono<AppContext>();

uiDataRoutes.use("/*", authMiddleware);
uiDataRoutes.use("/*", supabaseMiddleware);

uiDataRoutes.get("/api/ui/dropdown-data", requirePermission("viewRecords"), async (c) => {
  const db = c.get("db");
  const supabase = c.get("supabase");

  const [accountsResult, humansResult, discountCodes] = await Promise.all([
    listAccounts(db),
    listHumans(db, 1, 500),
    listDiscountCodes(supabase, db),
  ]);

  return c.json({
    data: {
      accounts: accountsResult.data,
      humans: humansResult.data,
      discountCodes,
    },
  });
});

export { uiDataRoutes };
