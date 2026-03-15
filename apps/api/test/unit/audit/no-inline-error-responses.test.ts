import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Audit test: route files must not return inline error responses.
 *
 * All errors should go through the central error handler (throw AppError).
 * Inline `return c.json({ error: ... }, 4xx/5xx)` bypasses:
 *   - The structured error format (requestId, code fields)
 *   - The 500 sanitization that strips details
 *   - Centralized logging and error persistence
 *
 * Fix: Use throw badRequest/notFound/conflict/internal() instead of
 * return c.json({ error }, status).
 */

const ROUTES_DIR = path.resolve(__dirname, "../../../src/routes");

/**
 * Files that legitimately return inline JSON without going through the error handler.
 * - client-errors.ts: lightweight client-side error logging endpoint
 * - health.ts: health check endpoint (no auth, no error handler needed)
 */
const ALLOWED_FILES = new Set(["client-errors.ts", "health.ts"]);

/**
 * Pattern: return c.json({ ... error ... }, 4xx/5xx)
 * Matches lines where c.json is called with an object containing "error" key
 * and a 4xx or 5xx HTTP status code.
 */
const INLINE_ERROR_PATTERN = /return\s+c\.json\(\s*\{[^}]*error[^}]*\}\s*,\s*(4\d{2}|5\d{2})\s*\)/;

describe("no inline error responses in route files", () => {
  it("all route files use throw instead of inline c.json for error responses", () => {
    const routeFiles = fs
      .readdirSync(ROUTES_DIR)
      .filter(
        (f) =>
          f.endsWith(".ts") &&
          !f.endsWith(".test.ts") &&
          !ALLOWED_FILES.has(f),
      );

    const violations: { file: string; line: number; match: string }[] = [];

    for (const fileName of routeFiles) {
      const filePath = path.join(ROUTES_DIR, fileName);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) continue;

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (INLINE_ERROR_PATTERN.test(lines[i])) {
          violations.push({ file: fileName, line: i + 1, match: lines[i].trim() });
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} — ${v.match}`)
        .join("\n");
      expect.fail(
        `Found ${violations.length} inline error response(s) in route files:\n${report}\n\n` +
          "Fix: Use throw badRequest/notFound/conflict/internal() instead of return c.json({ error }, status).\n" +
          `Allowed files: ${[...ALLOWED_FILES].join(", ")}`,
      );
    }
  });
});
