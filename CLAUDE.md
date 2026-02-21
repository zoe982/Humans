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

**NEVER fix ESLint errors, type errors, formatting issues, or other mechanical code fixes directly in the main (Opus) context.** ALWAYS delegate these to a subagent (which runs on Sonnet). This is a hard rule — no exceptions.

| Task type | Delegate to |
|-----------|-------------|
| ESLint / lint fixes (web, components) | `frontend-engineer` |
| ESLint / lint fixes (API) | `backend-engineer` |
| TypeScript type errors | relevant engineer agent |
| Formatting / style fixes | relevant engineer agent |
| Test-only changes (new tests, fix failing tests) | `test-engineer` or relevant engineer agent |
| Simple refactors (renames, moves, dead code removal) | relevant engineer agent |

**Opus is reserved for**: architectural decisions, complex multi-system debugging, planning, and orchestration. If a task has a clear error message and a mechanical fix, it goes to a subagent.

## Testing Commands

All test commands use absolute paths and pipe through `tail` to prevent context window overflow in subagents.

### Package Paths
| Package | Path |
|---------|------|
| API | `cd /Users/zoemarsico/Documents/Humans/apps/api` |
| Web | `cd /Users/zoemarsico/Documents/Humans/apps/web` |
| DB | `cd /Users/zoemarsico/Documents/Humans/packages/db` |
| Shared | `cd /Users/zoemarsico/Documents/Humans/packages/shared` |

### Standardized Commands
| Scenario | Command suffix | Lines |
|----------|---------------|-------|
| TDD single file | `pnpm test run <file> 2>&1 \| tail -n 20` | ~20 |
| Full suite pass/fail | `pnpm test run 2>&1 \| tail -n 40` | ~40 |
| Suite with coverage | `pnpm test run --coverage 2>&1 \| tail -n 80` | ~80 |
| Failure diagnosis | `pnpm test run 2>&1 \| tail -n 200` | ~200 |

### Rules
- **Subagents run single test files** during TDD — never the full suite
- **Cook runs full suites** for validation gates and pre-deploy checks
- **Always pipe through `tail`** for suite-level runs to avoid flooding context
- **Two-stage failure diagnosis**: start with `tail -n 40`, escalate to `tail -n 200` only if needed
- **API integration tests are noisy** (1400+ lines) — always truncate
- `--reporter=dot` does NOT reduce output in vitest 2.1.x — use `tail` instead
