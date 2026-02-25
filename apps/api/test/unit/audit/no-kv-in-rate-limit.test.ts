import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Audit test: rate-limit middleware must never use KV (SESSIONS binding).
 *
 * The original KV-backed rate limiter exhausted the daily write quota (1,000/day)
 * and took down the entire API with 500 errors. Rate limiting now uses Cloudflare
 * Rate Limiting bindings (RL_AUTH, RL_API, etc.) which have no KV cost.
 *
 * This test fails if rate-limit.ts ever reintroduces KV usage patterns.
 */

const RATE_LIMIT_PATH = path.resolve(__dirname, "../../../src/middleware/rate-limit.ts");

const KV_PATTERNS = [
  { pattern: /SESSIONS/, description: "references SESSIONS KV binding" },
  { pattern: /\.get\s*\(/, description: "calls .get() (KV read pattern)" },
  { pattern: /\.put\s*\(/, description: "calls .put() (KV write pattern)" },
  { pattern: /expirationTtl/, description: "uses expirationTtl (KV option)" },
];

describe("no-KV-in-rate-limit audit", () => {
  it("rate-limit.ts does not use KV patterns", () => {
    const content = fs.readFileSync(RATE_LIMIT_PATH, "utf-8");
    const violations: string[] = [];

    for (const { pattern, description } of KV_PATTERNS) {
      if (pattern.test(content)) {
        violations.push(description);
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `rate-limit.ts contains KV patterns that were eliminated in the KV→CF Rate Limiting migration:\n` +
        violations.map((v) => `  - ${v}`).join("\n") +
        "\n\nRate limiting must use Cloudflare Rate Limiting bindings (RL_AUTH, RL_API, etc.), not KV.",
      );
    }
  });
});
