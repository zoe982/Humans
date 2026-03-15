import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Audit test: error messages must not leak configuration or infrastructure details.
 *
 * Scans route and service files for throw/json error contexts containing
 * sensitive terms like secret names, "not configured", "password", etc.
 * These leak deployment topology and credential names to API consumers.
 *
 * Fix: Replace specific config references with generic messages like
 * "Integration unavailable" or "Service not available".
 */

const SRC_DIR = path.resolve(__dirname, "../../../src");
const ROUTES_DIR = path.join(SRC_DIR, "routes");
const SERVICES_DIR = path.join(SRC_DIR, "services");

/** Terms that indicate config/infra leakage in user-facing error messages */
const SENSITIVE_TERMS = [
  "API_TOKEN",
  "FRONT_API_TOKEN",
  "not configured",
  "secret",
  "password",
  "binding",
];

/**
 * Pattern: a line that contains a throw/c.json/error-factory call AND
 * one of the sensitive terms (case-insensitive).
 */
const SENSITIVE_PATTERN = new RegExp(
  `(?:throw|c\\.json|new AppError|internal\\(|badRequest\\(|notFound\\().*(?:${SENSITIVE_TERMS.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|")})`,
  "i",
);

/**
 * Files that are allowed to reference config terms in error messages
 * (e.g. the error handler itself or the error logger).
 */
const ALLOWED_FILES = new Set(["error-handler.ts", "error-logger.ts"]);

function scanDirectory(
  dir: string,
): { file: string; line: number; match: string }[] {
  const violations: { file: string; line: number; match: string }[] = [];

  if (!fs.existsSync(dir)) return violations;

  const files = fs
    .readdirSync(dir)
    .filter(
      (f) =>
        f.endsWith(".ts") &&
        !f.endsWith(".test.ts") &&
        !ALLOWED_FILES.has(f),
    );

  for (const fileName of files) {
    const filePath = path.join(dir, fileName);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) continue;

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip import statements and comments
      if (
        line.trimStart().startsWith("import ") ||
        line.trimStart().startsWith("//") ||
        line.trimStart().startsWith("*")
      ) {
        continue;
      }

      if (SENSITIVE_PATTERN.test(line)) {
        violations.push({
          file: path.relative(SRC_DIR, path.join(dir, fileName)),
          line: i + 1,
          match: line.trim(),
        });
      }
    }
  }

  return violations;
}

describe("error messages do not leak config details", () => {
  it("no route or service file leaks sensitive terms in error messages", () => {
    const violations = [
      ...scanDirectory(ROUTES_DIR),
      ...scanDirectory(SERVICES_DIR),
    ];

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} — ${v.match}`)
        .join("\n");
      expect.fail(
        `Found ${violations.length} error message(s) leaking config/infra details:\n${report}\n\n` +
          "Fix: Replace specific config references with generic messages like 'Integration unavailable'.\n" +
          `Sensitive terms: ${SENSITIVE_TERMS.join(", ")}`,
      );
    }
  });
});
