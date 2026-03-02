import { describe, it, expect } from "vitest";
import { getTestDb } from "../setup";
import * as schema from "@humans/db/schema";
import { getCachedConfig, invalidateConfig } from "../../../src/lib/config-cache";

function now() {
  return new Date().toISOString();
}

describe("config-cache", () => {
  describe("invalidateConfig", () => {
    it("forces fresh DB fetch after invalidation", async () => {
      const db = getTestDb();
      const ts = now();

      // Seed one row
      await db.insert(schema.emailLabelsConfig).values({
        id: "el-1",
        name: "Work",
        createdAt: ts,
      });

      // First fetch — populates cache
      const first = await getCachedConfig(db, schema.emailLabelsConfig, "emailLabelsConfig");
      expect(first).toHaveLength(1);
      expect(first[0]!.name).toBe("Work");

      // Insert a second row
      await db.insert(schema.emailLabelsConfig).values({
        id: "el-2",
        name: "Personal",
        createdAt: ts,
      });

      // Should still return cached (1 row)
      const cached = await getCachedConfig(db, schema.emailLabelsConfig, "emailLabelsConfig");
      expect(cached).toHaveLength(1);

      // Invalidate cache for this table
      invalidateConfig("emailLabelsConfig");

      // Now should fetch fresh from DB (2 rows)
      const fresh = await getCachedConfig(db, schema.emailLabelsConfig, "emailLabelsConfig");
      expect(fresh).toHaveLength(2);
      expect(fresh.map((r) => r.name).sort()).toEqual(["Personal", "Work"]);
    });
  });
});
