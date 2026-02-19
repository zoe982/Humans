#!/usr/bin/env bash
set -euo pipefail

# ─── Colors & Symbols ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'
CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
ARROW="${BLUE}→${NC}"

# ─── State ────────────────────────────────────────────────────────────
DEPLOY_START=$(date +%s)
COMMITTED=""
API_DEPLOYED=""
WEB_DEPLOYED=""
PUSHED=""
FAILED_PHASE=""

# ─── Helpers ──────────────────────────────────────────────────────────
log()  { echo -e "${ARROW} $1"; }
ok()   { echo -e "${CHECK} $1"; }
fail() { echo -e "${CROSS} $1"; }
header() {
  echo ""
  echo -e "${BOLD}━━━ $1 ━━━${NC}"
}

# ─── EXIT trap: always print summary ─────────────────────────────────
cleanup() {
  local exit_code=$?
  local elapsed=$(( $(date +%s) - DEPLOY_START ))
  local mins=$(( elapsed / 60 ))
  local secs=$(( elapsed % 60 ))

  echo ""
  echo -e "${BOLD}━━━ Deploy Summary ━━━${NC}"

  if [[ -n "$COMMITTED" ]]; then
    ok "Committed: ${COMMITTED}"
  fi
  if [[ -n "$API_DEPLOYED" ]]; then
    ok "API deployed"
  else
    fail "API not deployed"
  fi
  if [[ -n "$WEB_DEPLOYED" ]]; then
    ok "Web deployed"
  else
    fail "Web not deployed"
  fi
  if [[ -n "$PUSHED" ]]; then
    ok "Pushed to origin/main"
  fi
  if [[ -n "$FAILED_PHASE" ]]; then
    fail "Failed during: ${FAILED_PHASE}"
  fi

  echo -e "${ARROW} Elapsed: ${mins}m ${secs}s"

  if [[ $exit_code -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}Deploy succeeded!${NC}"
  else
    echo -e "${RED}${BOLD}Deploy failed.${NC}"
  fi
}
trap cleanup EXIT

# ═════════════════════════════════════════════════════════════════════
# Phase 1: Git Safety
# ═════════════════════════════════════════════════════════════════════
header "Phase 1: Git Safety"
FAILED_PHASE="git safety"

# Must be on main
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
  fail "Not on main branch (on '${BRANCH}'). Aborting."
  exit 1
fi
ok "On main branch"

# Check for uncommitted changes
if [[ -n "$(git status --porcelain)" ]]; then
  log "Uncommitted changes detected — auto-committing..."
  TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
  git add -A
  git commit -m "chore: pre-deploy commit - ${TIMESTAMP}"
  COMMITTED="chore: pre-deploy commit - ${TIMESTAMP}"
  ok "Auto-committed all changes"
else
  ok "Working tree clean"
fi

# Fetch and check divergence
log "Fetching origin/main..."
git fetch origin main

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
BASE=$(git merge-base HEAD origin/main)

if [[ "$LOCAL" == "$REMOTE" ]]; then
  ok "Up to date with origin/main"
elif [[ "$LOCAL" == "$BASE" ]]; then
  log "Behind origin/main — fast-forwarding..."
  git pull --ff-only origin main
  ok "Fast-forwarded to origin/main"
elif [[ "$REMOTE" == "$BASE" ]]; then
  ok "Ahead of origin/main (will push after deploy)"
else
  fail "Local and remote have diverged. Rebase or merge manually. Aborting."
  exit 1
fi

# ═════════════════════════════════════════════════════════════════════
# Phase 2: Quality Gates
# ═════════════════════════════════════════════════════════════════════
header "Phase 2: Quality Gates"
FAILED_PHASE="quality gates"

log "Installing dependencies..."
if pnpm install --frozen-lockfile; then
  ok "Dependencies installed (lockfile frozen)"
else
  log "Frozen lockfile failed — running pnpm install and committing lockfile..."
  pnpm install
  if [[ -n "$(git status --porcelain pnpm-lock.yaml)" ]]; then
    git add pnpm-lock.yaml
    git commit -m "chore: update pnpm-lock.yaml"
    COMMITTED="${COMMITTED:+${COMMITTED}, }lockfile update"
  fi
  ok "Dependencies installed (lockfile updated)"
fi

log "Running lint..."
pnpm turbo lint
ok "Lint passed"

log "Running typecheck..."
pnpm turbo typecheck
ok "Typecheck passed"

log "Verifying test file existence..."
bash scripts/check-test-files.sh
ok "All packages have test files"

log "Running tests with coverage..."
pnpm turbo test -- --coverage
ok "Tests passed with coverage thresholds"

log "Running Semgrep security scan..."
if command -v semgrep &> /dev/null; then
  semgrep scan \
    --config p/typescript \
    --config p/owasp-top-ten \
    --config p/xss \
    --config p/sql-injection \
    --error --strict
  ok "Semgrep scan passed"
else
  echo -e "  ${YELLOW}⚠ Semgrep not installed — skipping security scan${NC}"
fi

# ═════════════════════════════════════════════════════════════════════
# Phase 3: Deploy
# ═════════════════════════════════════════════════════════════════════
header "Phase 3: Deploy"
FAILED_PHASE="deploy"

# Verify .env.production exists
if [[ ! -f "apps/web/.env.production" ]]; then
  fail "apps/web/.env.production not found (required for PUBLIC_API_URL). Aborting."
  exit 1
fi
ok ".env.production exists"

# Deploy API first (web depends on API)
log "Deploying API worker..."
(cd apps/api && npx wrangler deploy)
API_DEPLOYED="yes"
ok "API deployed"

# Build web
log "Building web app..."
(cd apps/web && pnpm build)
ok "Web built"

# Deploy web
log "Deploying web to Cloudflare Pages..."
npx wrangler pages deploy apps/web/.svelte-kit/cloudflare --project-name humans --commit-dirty=true
WEB_DEPLOYED="yes"
ok "Web deployed"

# Push to origin
log "Pushing to origin/main..."
git push origin main
PUSHED="yes"
ok "Pushed to origin/main"

FAILED_PHASE=""
