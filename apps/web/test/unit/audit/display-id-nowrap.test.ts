import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Audit test: display ID columns must never wrap.
 *
 * Display IDs (e.g. ERR-AAA-515, HUM-AAB-042) must always render on a single
 * line. Any <td> that renders a displayId / display_id / crmDisplayId /
 * crm_display_id MUST include the `whitespace-nowrap` Tailwind class so the
 * browser never breaks the ID across lines.
 *
 * This test scans all +page.svelte files in routes/ for <td>...</td> blocks
 * that reference a display ID field and asserts they contain `whitespace-nowrap`.
 */

const ROUTES_DIR = path.resolve(__dirname, "../../../src/routes");

/** Recursively collect all .svelte files under a directory. */
function walkSvelteFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkSvelteFiles(full));
    } else if (entry.name.endsWith(".svelte")) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Matches display ID field access in template expressions.
 * Looks for .displayId, .display_id, .crmDisplayId, .crm_display_id
 * within { } template expressions (not in type annotations or JS logic).
 */
const DISPLAY_ID_IN_TEMPLATE = /\{[^}]*\.(displayId|display_id|crmDisplayId|crm_display_id)\b[^}]*\}/;

/**
 * Extract <td ...>...</td> blocks from file content and check each one.
 * Returns violations where the block renders a display ID but lacks whitespace-nowrap.
 */
function findViolations(filePath: string): { line: number; snippet: string }[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: { line: number; snippet: string }[] = [];

  let inTd = false;
  let tdStartLine = 0;
  let tdOpeningTag = "";
  let tdContent = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inTd) {
      // Look for <td opening
      const tdMatch = line.match(/<td\b/);
      if (!tdMatch) continue;

      tdStartLine = i;
      inTd = true;
      tdOpeningTag = "";
      tdContent = "";

      // Extract from <td onwards
      const fromTd = line!.slice(line!.indexOf("<td"));
      tdContent = fromTd;

      // Extract the opening tag attributes
      const tagEnd = fromTd.match(/<td([^>]*)>/);
      if (tagEnd) {
        tdOpeningTag = tagEnd[1] ?? "";
      }
    } else {
      tdContent += "\n" + line;
    }

    // Check if this line closes the <td>
    if (inTd && tdContent.includes("</td>")) {
      // We have a complete <td>...</td> block
      // Check if the content (not the tag) references a display ID field
      if (DISPLAY_ID_IN_TEMPLATE.test(tdContent)) {
        // Check for whitespace-nowrap in the opening tag
        if (!tdOpeningTag.includes("whitespace-nowrap")) {
          violations.push({
            line: tdStartLine + 1,
            snippet: lines[tdStartLine]!.trim().slice(0, 120),
          });
        }
      }
      inTd = false;
    }

    // Safety: don't accumulate forever if </td> is missing
    if (inTd && i - tdStartLine > 10) {
      inTd = false;
    }
  }

  return violations;
}

describe("display ID nowrap audit", () => {
  it("every <td> rendering a display ID includes whitespace-nowrap", () => {
    const svelteFiles = walkSvelteFiles(ROUTES_DIR);
    const allViolations: { file: string; line: number; snippet: string }[] = [];

    for (const filePath of svelteFiles) {
      const violations = findViolations(filePath);
      for (const v of violations) {
        allViolations.push({
          file: path.relative(ROUTES_DIR, filePath),
          ...v,
        });
      }
    }

    if (allViolations.length > 0) {
      const report = allViolations
        .map((v) => `  ${v.file}:${v.line} — ${v.snippet}`)
        .join("\n");
      expect.fail(
        `Found ${allViolations.length} display ID <td> without whitespace-nowrap:\n${report}\n\n` +
          'Fix: Add the "whitespace-nowrap" class to every <td> that renders a display ID.\n' +
          "Display IDs (e.g. ERR-AAA-515) must always appear on a single line.",
      );
    }
  });
});
