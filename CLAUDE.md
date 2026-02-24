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
| FLY | Flights | `routes/flights.ts` |
| FRY | Front Sync Runs | `services/front-sync.ts` |
| BOR | Booking Requests | `routes/website-booking-requests.ts` |
| ERR | Error Log | `lib/error-logger.ts` |

### Implementation
- **Formatter**: `packages/db/src/display-id.ts` — `formatDisplayId(prefix, counter)` and `parseDisplayId(id)`
- **Counter**: `apps/api/src/lib/display-id.ts` — `nextDisplayId(db, prefix)` atomically increments and returns the next ID
- **Adding a new prefix**: Add it to `DISPLAY_ID_PREFIXES` in `packages/db/src/display-id.ts`, update this table, call `nextDisplayId(db, "XXX")` in your service
