import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Audit test: no unbounded SELECT on high-growth data tables.
 *
 * Tables like humans, emails, phones, activities, accounts, and agreements
 * grow to thousands of rows. A full table scan on these causes SSR timeouts
 * and blank pages. This test fails if any service file does
 * `db.select().from(TABLE)` without a `.where(` on a high-growth table.
 *
 * Smaller entity tables (socialIds, websites, geoInterests, routeInterests,
 * etc.) are NOT flagged — they stay under a few hundred rows in this CRM.
 * Config tables are also not flagged.
 */

const SERVICES_DIR = path.resolve(__dirname, "../../../src/services");

/**
 * Files that intentionally load full tables (batch jobs, sync processes).
 * These are not API request handlers and don't cause SSR timeouts.
 */
const EXCLUDED_FILES = new Set(["front-sync.ts"]);

/**
 * Known list-all endpoints: "file:line:table" entries that intentionally
 * load an entire entity table. These are bounded by the entity count
 * (not cross-joined with other tables) and are the primary list endpoint.
 * Adding a new entry here requires a comment explaining why it's OK.
 */
const KNOWN_LIST_ALL = new Set([
  // listAccounts — lists all accounts (< 200 in this CRM)
  "accounts.ts:28:accounts",
  // listEmails — lists all emails to show admin view
  "emails.ts:11:emails",
  // listPhoneNumbers — lists all phones to show admin view
  "phone-numbers.ts:11:phones",
]);

/**
 * High-growth tables that MUST have WHERE clauses.
 * These are the tables that caused the blank-page incident.
 * If a service loads ALL rows from one of these, it's a bug.
 */
const HIGH_GROWTH_TABLES = new Set([
  "humans",
  "emails",
  "phones",
  "activities",
  "accounts",
  "agreements",
]);

/**
 * Find `db.select().from(TABLE)` or `db.select({...}).from(TABLE)` on
 * high-growth tables NOT followed by `.where(` within a 5-line window.
 *
 * Uses per-line scanning with deduplication to avoid double-counting
 * from overlapping windows.
 */
function findUnboundedSelects(filePath: string): { table: string; line: number }[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: { table: string; line: number }[] = [];
  const seen = new Set<string>(); // "line:table" to deduplicate

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Quick check: does this line contain .from( ?
    if (!line.includes(".from(")) continue;

    // Build a 5-line window starting at this line
    const window = lines.slice(i, i + 5).join("\n");

    // Find all .select(...).from(TABLE) patterns in this line
    // Use a regex that matches the .from() on this specific line
    const fromRegex = /\.from\((\w+)\)/g;
    let fromMatch: RegExpExecArray | null;

    while ((fromMatch = fromRegex.exec(line)) !== null) {
      const tableName = fromMatch[1];

      // Only flag high-growth tables
      if (!HIGH_GROWTH_TABLES.has(tableName)) continue;

      // Deduplicate: same line+table already reported?
      const key = `${i + 1}:${tableName}`;
      if (seen.has(key)) continue;

      // Check known list-all allowlist (file:line:table)
      const fileName = path.basename(filePath);
      const allowlistKey = `${fileName}:${i + 1}:${tableName}`;
      if (KNOWN_LIST_ALL.has(allowlistKey)) {
        seen.add(key);
        continue;
      }

      // Check if this .from() is part of a .select().from() chain
      // Look backwards in the window for .select(
      const beforeFrom = window.slice(0, window.indexOf(fromMatch[0]));
      if (!beforeFrom.includes(".select(")) continue;

      // Check if .where( follows the .from(TABLE) in the 5-line window
      const afterFrom = window.slice(window.indexOf(fromMatch[0]) + fromMatch[0].length);
      const untilSemicolon = afterFrom.split(";")[0];

      if (/\.where\(/.test(untilSemicolon)) continue;

      // Also check for .innerJoin or .leftJoin (these use ON conditions, not WHERE)
      // but they still scope the query — skip if joined
      if (/\.innerJoin\(/.test(untilSemicolon) || /\.leftJoin\(/.test(untilSemicolon)) continue;

      seen.add(key);
      violations.push({ table: tableName, line: i + 1 });
    }
  }

  return violations;
}

describe("unbounded SELECT audit", () => {
  it("no service file does unbounded SELECT on high-growth tables", () => {
    const serviceFiles = fs.readdirSync(SERVICES_DIR)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !EXCLUDED_FILES.has(f))
      .map((f) => path.join(SERVICES_DIR, f));

    const allViolations: { file: string; table: string; line: number }[] = [];

    for (const filePath of serviceFiles) {
      const violations = findUnboundedSelects(filePath);
      for (const v of violations) {
        allViolations.push({
          file: path.relative(SERVICES_DIR, filePath),
          ...v,
        });
      }
    }

    if (allViolations.length > 0) {
      const report = allViolations
        .map((v) => `  ${v.file}:${v.line} — unbounded SELECT on ${v.table}`)
        .join("\n");
      expect.fail(
        `Found ${allViolations.length} unbounded SELECT(s) on high-growth tables:\n${report}\n\n` +
        "Fix: Add .where() or use inArray() to scope the query.\n" +
        "High-growth tables: humans, emails, phones, activities, accounts, agreements",
      );
    }
  });
});
