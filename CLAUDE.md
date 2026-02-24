# Humans CRM — Claude Instructions

## Deployment

### Cloudflare Pages project name
The web app deploys to the **`humans`** Pages project (NOT `humans-web` or any other name).
- Production URL: https://humans.pavinfo.app
- Pages project: `humans`

Always deploy from inside `apps/web` (so wrangler reads `apps/web/wrangler.toml`):
```bash
cd apps/web && npx wrangler pages deploy --commit-dirty=true --branch=main
```

**IMPORTANT**: Always include `--branch=main` to deploy directly to production. Never create preview deployments. Always run from `apps/web/` so wrangler uses the Pages wrangler.toml (not the API's).

### API Worker
- Production URL: https://api.humans.pavinfo.app
- Worker name: `humans-api` (defined in `apps/api/wrangler.toml`)

Deploy with:
```bash
cd apps/api && npx wrangler deploy
```

### Required build step before Pages deploy
The web app requires `PUBLIC_API_URL` at build time (`$env/static/public`). It is defined in `apps/web/.env.production` (gitignored). Run the build from the web directory:
```bash
cd apps/web && pnpm build
```

### Full deploy sequence
```bash
# 1. Build web
cd apps/web && pnpm build && cd ../..

# 2. Deploy API
cd apps/api && npx wrangler deploy && cd ../..

# 3. Deploy web (must run from apps/web for wrangler.toml)
cd apps/web && npx wrangler pages deploy --commit-dirty=true --branch=main
```

### Secrets
API worker secrets (already set, manage via `wrangler secret`):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `APP_URL`

### D1 Migrations
Run migrations against production:
```bash
npx wrangler d1 execute humans-db --remote --file=packages/db/drizzle/<migration>.sql --config apps/api/wrangler.toml
```

Check table status:
```bash
npx wrangler d1 execute humans-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';" --config apps/api/wrangler.toml
```

## Model Usage — MANDATORY

**NEVER fix ESLint errors, type errors, formatting issues, or other mechanical code fixes directly in the main (Opus) context.** ALWAYS delegate these to a subagent. This is a hard rule — no exceptions.

A PreToolUse hook (`.claude/hooks/enforce-model-selection.sh`) auto-corrects Task calls to Sonnet when the prompt matches mechanical patterns. The table below is the source of truth for model selection:

| Task type                                    | Model  | Delegate to                        |
|----------------------------------------------|--------|------------------------------------|
| ESLint / lint fixes (web, components)        | sonnet | `frontend-engineer`                |
| ESLint / lint fixes (API)                    | sonnet | `backend-engineer`                 |
| TypeScript type errors                       | sonnet | relevant engineer agent            |
| Test assertion updates                       | sonnet | `test-engineer` or relevant agent  |
| Formatting / style fixes                     | sonnet | relevant engineer agent            |
| Simple refactors (renames, dead code)        | sonnet | relevant engineer agent            |
| Code review / audits                         | sonnet | `superpowers:code-reviewer`        |
| Complex debugging (hangs, race conditions)   | opus   | stay in main context               |
| Architectural decisions                      | opus   | stay in main context               |
| New feature implementation                   | opus   | stay in main context               |

**When spawning subagents for Sonnet tasks, always pass `model: "sonnet"` explicitly.** The hook is a safety net, not a substitute for correct behavior.

## TDD Process — MANDATORY

ALL code engineering follows Test-Driven Development. No exceptions.

### Red-Green-Refactor cycle
1. **RED**: Write a failing test that describes the desired behavior
2. **GREEN**: Write the minimum implementation to make the test pass
3. **REFACTOR**: Clean up while keeping tests green

### Enforcement rules
- **Tests FIRST**: Before writing ANY implementation code, write a failing test for the behavior. The `superpowers:test-driven-development` skill MUST be invoked for all feature work.
- **No implementation without a failing test**: If you find yourself writing implementation code before a test exists, STOP and write the test first.
- **Test engineer validation**: After every feature, the `test-engineer` subagent MUST run a coverage audit. This is not optional — it is a blocking step before any feature is considered complete.
- **Anti-gaming audit**: `scripts/test-quality-audit.sh` scans for gaming patterns (trivial assertions, coverage suppression, placeholder test names, type-assertion gaming in expect(), empty test bodies). This runs as Gate 0 in the quality gate.

### What counts as gaming (hard fail)
- Trivial assertions: `expect(true).toBe(true)`, `expect(1).toBe(1)`
- Coverage suppression: `/* istanbul ignore */`, `/* c8 ignore */`, `/* vitest ignore */`
- Placeholder test names: `it("test")`, `it("works")`, `it("should work")`
- Type-assertion gaming: `expect((result as any).field)` — properly type the result instead
- Empty test bodies: `it("does something", () => {})`
- Tests without assertions (caught by ESLint `vitest/expect-expect`)
- Disabled/focused tests (caught by ESLint `vitest/no-disabled-tests`, `vitest/no-focused-tests`)
- Conditional assertions (caught by ESLint `vitest/no-conditional-expect`)

### Test engineer validation checklist (per feature)
The test-engineer subagent must verify:
1. All new/modified source files have corresponding test files
2. Coverage thresholds pass (`pnpm turbo test -- --coverage`)
3. Anti-gaming audit passes (`bash scripts/test-quality-audit.sh`)
4. Assertions test actual behavior (not just that functions don't throw)
5. Edge cases and error paths are covered

## Quality Gates — MANDATORY

Every feature branch and every deploy MUST pass the full quality gate. Run `pnpm quality-gate` or `bash scripts/quality-gate.sh` from the monorepo root.

### Gate sequence
0. **Anti-gaming audit** — `bash scripts/test-quality-audit.sh` (blocks trivial/gaming tests)
1. **ESLint** — `pnpm turbo lint` (strictTypeChecked + stylisticTypeChecked + eslint-plugin-security)
2. **Typecheck** — `pnpm turbo typecheck`
3. **Tests with coverage** — `pnpm turbo test -- --coverage` (95% threshold on all metrics per package)
4. **Semgrep** — security scan with all rulesets (`p/typescript`, `p/javascript`, `p/owasp-top-ten`, `p/xss`, `p/sql-injection`, `p/secrets`, `p/security-audit`, `p/insecure-transport`)

### When to run
- **Per feature**: Before considering any feature complete, run the full quality gate AND test-engineer validation
- **Per deploy**: `deploy.sh` runs all gates automatically; CI runs them in parallel jobs
- **Per PR**: CI enforces all gates — merge is blocked if any gate fails

### Coverage policy
- **95% minimum** on all metrics (lines, functions, branches, statements) per package aggregate
- Enforced in vitest config thresholds — tests fail if coverage drops below 95%
- `apps/api` integration tests are exempt (workerd isolation prevents instrumentation); service-layer coverage is enforced via `vitest.unit.config.ts`
- `packages/db` and `packages/shared` are at 100% — do not let them drop

### Security scanning
- **ESLint**: `eslint-plugin-security` with all rules as errors (already in `eslint.config.mjs`)
- **Semgrep**: 8 registry rulesets covering OWASP Top 10, XSS, SQL injection, secrets detection, insecure transport, and general security audit
- Both tools block on findings (`--error --strict` for Semgrep, all security rules as `"error"` for ESLint)

## Testing Commands

**ALWAYS run tests via Bash in the main context. NEVER delegate test runs to subagents.** Subagents lack the shell environment and their output wastes context transferring results back. All commands use absolute paths and pipe through `tail` to prevent context flooding.

### Package Paths
| Package | Path |
|---------|------|
| API | `cd /Users/zoemarsico/Documents/Humans/apps/api` |
| Web | `cd /Users/zoemarsico/Documents/Humans/apps/web` |
| DB | `cd /Users/zoemarsico/Documents/Humans/packages/db` |
| Shared | `cd /Users/zoemarsico/Documents/Humans/packages/shared` |

### Standardized Commands
| Scenario | Command | Tail lines |
|----------|---------|------------|
| TDD single file | `cd <pkg> && pnpm test run <file> 2>&1 \| tail -n 20` | ~20 |
| Full suite pass/fail | `cd <pkg> && pnpm test run 2>&1 \| tail -n 40` | ~40 |
| Suite with coverage | `cd <pkg> && pnpm test run --coverage 2>&1 \| tail -n 80` | ~80 |
| Failure diagnosis | `cd <pkg> && pnpm test run 2>&1 \| tail -n 200` | ~200 |

### Rules
- **Tests run in Bash only** — never in subagents, never via Task tool
- **Always pipe through `tail`** — every test command must end with `| tail -n <N>`
- **Two-stage failure diagnosis**: start with `tail -n 40`, escalate to `tail -n 200` only if needed
- **API integration tests are noisy** (1400+ lines) — always truncate
- `--reporter=dot` does NOT reduce output in vitest 2.1.x — use `tail` instead

## Testing Rules

### Mock data must match real API shapes
- All `createMockFetch` response bodies must use exact field names from the Drizzle schema.
  Config items: `{ id, name, createdAt }` — never `{ id, label }`.
- Use `mockConfigItem()` from `apps/web/test/helpers.ts` for all config item mocks.
- Use `buildConfigItem()` from `@humans/test-utils` for API-side test data.

### Assert data shape, not just length
- Never use `toHaveLength()` as the **only** assertion on API response data.
- Always follow with `toEqual()` or `toMatchObject()` verifying key field names.

### Label/config resolution must have positive tests
- Any service that resolves a config `labelId`/`labelName` must have a test that:
  1. Seeds a config item in the correct table
  2. Creates a record referencing that config item's ID
  3. Asserts the resolved name appears in the service response
- This applies to phone labels, email labels, social ID platforms, and any future config lookups.

## Display ID System

Every entity gets a human-readable display ID in the format **`{PREFIX}-{LETTERS}-{NUMBER}`**.

### Format rules
- **Prefix**: 3 uppercase letters identifying the entity type (e.g. `HUM`, `REF`)
- **Letters**: 3-letter block from `AAA` to `ZZZ` (base-26, 17,576 blocks)
- **Number**: Zero-padded 001–999

### Sequencing
IDs are assigned from a single auto-incrementing counter per prefix stored in D1 (`display_id_counters` table):

| Counter | Display ID |
|---------|-----------|
| 1       | XXX-AAA-001 |
| 999     | XXX-AAA-999 |
| 1000    | XXX-AAB-001 |
| 1998    | XXX-AAB-999 |
| 1999    | XXX-AAC-001 |

Maximum capacity: ~17.5M IDs per prefix.

### Prefix registry

| Prefix | Entity | Service |
|--------|--------|---------|
| HUM | Humans | `services/humans.ts` |
| ACC | Accounts | `services/accounts.ts` |
| ACT | Activities | `services/activities.ts` |
| COL | Colleagues | `services/admin.ts` |
| EML | Emails | `services/emails.ts` |
| FON | Phone Numbers | `services/phone-numbers.ts` |
| PET | Pets | `services/pets.ts` |
| GEO | Geo Interests | `services/geo-interests.ts` |
| GEX | Geo Interest Expressions | `services/geo-interests.ts` |
| ROI | Route Interests | `services/route-interests.ts` |
| REX | Route Interest Expressions | `services/route-interests.ts` |
| SOC | Social IDs | `services/social-ids.ts` |
| OPP | Opportunities | `services/opportunities.ts` |
| LEA | General Leads | `services/general-leads.ts` |
| LES | Lead Emails | `services/leads.ts` |
| LED | Lead Designations | `services/leads.ts` |
| REF | Referral Codes | `services/referral-codes.ts` |
| WEB | Websites | `services/websites.ts` |
| REL | Human Relationships | `services/humans.ts` |
| FLY | Flights | `routes/flights.ts` |
| FRY | Front Sync Runs | `services/front-sync.ts` |
| BOR | Booking Requests | `routes/website-booking-requests.ts` |
| ERR | Error Log | `lib/error-logger.ts` |

### Implementation
- **Formatter**: `packages/db/src/display-id.ts` — `formatDisplayId(prefix, counter)` and `parseDisplayId(id)`
- **Counter**: `apps/api/src/lib/display-id.ts` — `nextDisplayId(db, prefix)` atomically increments and returns the next ID
- **Adding a new prefix**: Add it to `DISPLAY_ID_PREFIXES` in `packages/db/src/display-id.ts`, update this table, call `nextDisplayId(db, "XXX")` in your service
