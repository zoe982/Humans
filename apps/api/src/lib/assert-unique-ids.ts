import type { Context } from "hono";
import type { AppContext } from "../types";
import { logWarn } from "./logger";
import { persistError } from "./error-logger";

/**
 * Guard that deduplicates an array of items by `id`.
 * If duplicates are found, logs a warning and optionally persists to error_log.
 * Never throws — heals and reports.
 */
export function assertUniqueIds<T extends { id: string }>(
  items: T[],
  entityType: string,
  c?: Context<AppContext>,
): T[] {
  if (items.length <= 1) return items;

  const seen = new Set<string>();
  const duplicateIds: string[] = [];
  const unique: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      if (!duplicateIds.includes(item.id)) {
        duplicateIds.push(item.id);
      }
    } else {
      seen.add(item.id);
      unique.push(item);
    }
  }

  if (duplicateIds.length === 0) return items;

  logWarn(`Duplicate IDs detected in ${entityType}`, {
    code: "DUPLICATE_IDS",
  });

  if (c != null) {
    persistError(c, {
      requestId: c.get("requestId") ?? "unknown",
      code: "DUPLICATE_IDS",
      message: `Duplicate IDs detected in ${entityType}`,
      status: 200,
      method: c.req.method,
      path: c.req.path,
      details: {
        entityType,
        duplicateIds,
        totalItems: items.length,
        uniqueItems: unique.length,
      },
    });
  }

  return unique;
}
