import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Audit test: Promise.all blocks in page loaders must not exceed 4 entries.
 *
 * Cloudflare Workers enforce a hard limit of 6 simultaneous outbound TCP
 * connections per invocation. hooks.server.ts always consumes 1 for /auth/me,
 * leaving 5 for page load functions. Keeping Promise.all blocks at ≤4 entries
 * provides a safety margin of 1 connection.
 *
 * This test scans all +page.server.ts files, finds Promise.all([...]) blocks,
 * counts the entries, and fails if any block has more than 4 entries.
 */

const ROUTES_DIR = path.resolve(__dirname, "../../../src/routes");
const MAX_PROMISE_ALL_SIZE = 4;

/** Recursively collect all +page.server.ts files. */
function walkPageServerFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkPageServerFiles(full));
    } else if (entry.name === "+page.server.ts") {
      results.push(full);
    }
  }
  return results;
}

/**
 * Count entries in Promise.all([...]) blocks by finding the opening bracket
 * and counting top-level comma-separated entries until the closing bracket.
 */
function findPromiseAllViolations(filePath: string): { line: number; count: number }[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const violations: { line: number; count: number }[] = [];

  // Find all Promise.all([ positions
  const promiseAllRegex = /Promise\.all\(\[/g;
  let match: RegExpExecArray | null;

  while ((match = promiseAllRegex.exec(content)) !== null) {
    const startIdx = match.index + match[0].length;
    const lineNumber = content.slice(0, match.index).split("\n").length;

    // Walk forward counting top-level entries (respecting nested brackets/parens).
    // Trailing commas are handled by tracking whether content exists in each segment.
    let depth = 1; // we're inside the [ already
    let entryCount = 0;
    let hasContentSinceLastComma = false;

    for (let i = startIdx; i < content.length && depth > 0; i++) {
      const char = content[i];
      if (char === "[" || char === "(" || char === "{") {
        depth++;
        if (depth === 2) hasContentSinceLastComma = true;
      } else if (char === "]" || char === ")" || char === "}") {
        depth--;
        if (depth === 0) {
          // Closing bracket — count final segment if it had content
          if (hasContentSinceLastComma) entryCount++;
          break;
        }
      } else if (char === "," && depth === 1) {
        if (hasContentSinceLastComma) entryCount++;
        hasContentSinceLastComma = false;
      } else if (char !== undefined && !char.match(/\s/) && depth === 1) {
        hasContentSinceLastComma = true;
      }
    }

    if (entryCount > MAX_PROMISE_ALL_SIZE) {
      violations.push({ line: lineNumber, count: entryCount });
    }
  }

  return violations;
}

describe("connection-limit audit", () => {
  it(`every Promise.all block in +page.server.ts has at most ${MAX_PROMISE_ALL_SIZE} entries`, () => {
    const pageFiles = walkPageServerFiles(ROUTES_DIR);
    const allViolations: { file: string; line: number; count: number }[] = [];

    for (const filePath of pageFiles) {
      const violations = findPromiseAllViolations(filePath);
      for (const v of violations) {
        allViolations.push({
          file: path.relative(ROUTES_DIR, filePath),
          ...v,
        });
      }
    }

    if (allViolations.length > 0) {
      const report = allViolations
        .map((v) => `  ${v.file}:${v.line} — Promise.all has ${v.count} entries (max ${MAX_PROMISE_ALL_SIZE})`)
        .join("\n");
      expect.fail(
        `Found ${allViolations.length} Promise.all block(s) exceeding connection limit:\n${report}\n\n` +
          "Fix: Split into batches of 4 or fewer. Use batchedPromiseAll() or sequential await.\n" +
          "Cloudflare Workers allow max 6 TCP connections; hooks.server.ts uses 1 for auth.",
      );
    }
  });
});
