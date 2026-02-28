#!/usr/bin/env bash
set -euo pipefail

# ─── Quality Gate ────────────────────────────────────────────────────
# Run this after completing a feature and before deploying.
# Runs: test quality audit → lint → typecheck → tests (with coverage) → semgrep
# All gates must pass — any failure aborts with a non-zero exit code.
# ─────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'
CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
ARROW="${BLUE}→${NC}"

GATE_START=$(date +%s)
FAILED=""

log()  { echo -e "${ARROW} $1"; }
ok()   { echo -e "${CHECK} $1"; }
fail() { echo -e "${CROSS} $1"; FAILED="$1"; }

header() {
  echo ""
  echo -e "${BOLD}━━━ $1 ━━━${NC}"
}

# Ensure we're in the monorepo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# ── Gate 0: Test Quality Audit ────────────────────────────────────────
header "Gate 0: Test Quality Audit (anti-gaming)"
log "Scanning for gaming patterns in test files..."
if bash "$ROOT_DIR/scripts/test-quality-audit.sh"; then
  ok "No gaming patterns detected"
else
  fail "Gaming patterns detected — fix before proceeding"
  exit 1
fi

# ── Gate 1: Lint ──────────────────────────────────────────────────────
header "Gate 1: Lint"
log "Running ESLint across all packages..."
if pnpm turbo lint; then
  ok "Lint passed"
else
  fail "Lint failed"
  exit 1
fi

# ── Gate 2: Typecheck ─────────────────────────────────────────────────
header "Gate 2: Typecheck"
log "Running TypeScript type checking..."
if pnpm turbo typecheck; then
  ok "Typecheck passed"
else
  fail "Typecheck failed"
  exit 1
fi

# ── Gate 3: Tests with Coverage ───────────────────────────────────────
header "Gate 3: Tests with Coverage (95% threshold)"
log "Running all test suites with coverage enforcement..."
if pnpm turbo test -- --coverage; then
  ok "Tests passed with coverage thresholds met"
else
  fail "Tests or coverage thresholds failed"
  exit 1
fi

# ── Gate 4: Semgrep Security Scan ─────────────────────────────────────
header "Gate 4: Semgrep Security Scan"
if command -v semgrep &> /dev/null; then
  log "Running Semgrep with security rulesets..."
  if semgrep scan \
    --config p/typescript \
    --config p/javascript \
    --config p/owasp-top-ten \
    --config p/xss \
    --config p/sql-injection \
    --config p/secrets \
    --config p/security-audit \
    --config p/insecure-transport \
    --error; then
    ok "Semgrep scan passed"
  else
    fail "Semgrep found security issues"
    exit 1
  fi
else
  echo -e "  ${RED}✗ Semgrep not installed — install with: pip install semgrep${NC}"
  exit 1
fi

# ── Summary ───────────────────────────────────────────────────────────
elapsed=$(( $(date +%s) - GATE_START ))
mins=$(( elapsed / 60 ))
secs=$(( elapsed % 60 ))

echo ""
echo -e "${BOLD}━━━ Quality Gate Summary ━━━${NC}"
ok "All gates passed"
echo -e "${ARROW} Elapsed: ${mins}m ${secs}s"
echo -e "${GREEN}${BOLD}Ready to deploy!${NC}"
