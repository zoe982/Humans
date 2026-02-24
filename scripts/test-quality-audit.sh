#!/usr/bin/env bash
set -euo pipefail

# ─── Test Quality Audit ──────────────────────────────────────────────
# Scans test files for gaming patterns that inflate coverage without
# testing real behavior. Exits non-zero if any gaming detected.
#
# Hard fails (block merge/deploy):
#   1. Trivial assertions (expect(true), expect(1), etc.)
#   2. Coverage suppression comments (istanbul/c8/vitest ignore)
#   3. Placeholder test names ("test 1", "should work", "works")
#   4. Assertion-level type gaming (expect(x as any))
#   5. Empty test bodies
#
# Warnings (logged but don't block):
#   - 'as any' in function call arguments (common mock pattern)
#
# Handled by ESLint (not duplicated here):
#   - Duplicate test descriptions (vitest/no-identical-title)
#   - Tests without assertions (vitest/expect-expect)
#   - Disabled/focused tests (vitest/no-disabled-tests, vitest/no-focused-tests)
#   - Conditional assertions (vitest/no-conditional-expect)
# ─────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'
CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
ARROW="${BLUE}→${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FAILURES=0
WARNINGS=0

log()  { echo -e "${ARROW} $1"; }
ok()   { echo -e "  ${CHECK} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARNINGS=$((WARNINGS + 1)); }
fail() { echo -e "  ${CROSS} $1"; FAILURES=$((FAILURES + 1)); }

header() {
  echo ""
  echo -e "${BOLD}━━━ $1 ━━━${NC}"
}

# Collect all test files (excluding node_modules, dist, coverage, worktrees)
TEST_FILES=$(find "$ROOT_DIR" \
  -path "*/node_modules" -prune -o \
  -path "*/.svelte-kit" -prune -o \
  -path "*/.worktrees" -prune -o \
  -path "*/dist" -prune -o \
  -path "*/coverage" -prune -o \
  \( -name "*.test.ts" -o -name "*.spec.ts" \) -print)

if [[ -z "$TEST_FILES" ]]; then
  echo "No test files found."
  exit 0
fi

TEST_COUNT=$(echo "$TEST_FILES" | wc -l | tr -d ' ')
log "Auditing ${TEST_COUNT} test files for gaming patterns..."

# Collect all source files (for coverage suppression check)
ALL_SRC_FILES=$(find "$ROOT_DIR" \
  -path "*/node_modules" -prune -o \
  -path "*/.svelte-kit" -prune -o \
  -path "*/.worktrees" -prune -o \
  -path "*/dist" -prune -o \
  -path "*/coverage" -prune -o \
  -name "*.ts" -print)

# ── Check 1: Trivial assertions ──────────────────────────────────────
header "Check 1: Trivial Assertions"
log "Scanning for expect(true), expect(false), expect(1), expect(undefined)..."

TRIVIAL_PATTERN='expect\s*\(\s*(true|false|1|0|undefined|null|"")\s*\)\.'
TRIVIAL_HITS=$(echo "$TEST_FILES" | xargs grep -nE "$TRIVIAL_PATTERN" 2>/dev/null || true)

if [[ -n "$TRIVIAL_HITS" ]]; then
  fail "Found trivial assertions (these test nothing meaningful):"
  echo "$TRIVIAL_HITS" | head -20
  if [[ $(echo "$TRIVIAL_HITS" | wc -l) -gt 20 ]]; then
    echo "  ... and more"
  fi
else
  ok "No trivial assertions found"
fi

# ── Check 2: Coverage suppression comments ───────────────────────────
header "Check 2: Coverage Suppression Comments"
log "Scanning for istanbul/c8/vitest ignore comments..."

SUPPRESS_PATTERN='istanbul\s+ignore|c8\s+ignore|vitest\s+ignore'
SUPPRESS_HITS=$(echo "$ALL_SRC_FILES" | xargs grep -nEi "$SUPPRESS_PATTERN" 2>/dev/null || true)

if [[ -n "$SUPPRESS_HITS" ]]; then
  fail "Found coverage suppression comments (these bypass coverage):"
  echo "$SUPPRESS_HITS" | head -20
else
  ok "No coverage suppression comments found"
fi

# ── Check 3: Placeholder test names ──────────────────────────────────
header "Check 3: Placeholder Test Names"
log "Scanning for lazy test descriptions..."

PLACEHOLDER_PATTERN="(it|test)\s*\(\s*['\"](\s*(test|works|should work|todo|fixme|test\s*[0-9]|xxx)\s*)['\"]"
PLACEHOLDER_HITS=$(echo "$TEST_FILES" | xargs grep -nEi "$PLACEHOLDER_PATTERN" 2>/dev/null || true)

if [[ -n "$PLACEHOLDER_HITS" ]]; then
  fail "Found placeholder test names (tests must describe behavior):"
  echo "$PLACEHOLDER_HITS" | head -20
else
  ok "No placeholder test names found"
fi

# ── Check 4: Assertion-level type gaming ─────────────────────────────
header "Check 4: Assertion-Level Type Gaming"
log "Scanning for 'as any' inside expect() calls..."

# Only flag 'as any' INSIDE expect() — this hides type mismatches in assertions.
# 'as any' in function args (e.g. load(event as any)) is a legitimate mock pattern.
EXPECT_AS_ANY_PATTERN='expect\s*\([^)]*\bas\s+any\b'
EXPECT_AS_ANY_HITS=$(echo "$TEST_FILES" | xargs grep -nE "$EXPECT_AS_ANY_PATTERN" 2>/dev/null || true)

if [[ -n "$EXPECT_AS_ANY_HITS" ]]; then
  fail "Found 'as any' inside expect() (hides type mismatches in assertions):"
  echo "$EXPECT_AS_ANY_HITS" | head -20
else
  ok "No type gaming in assertions"
fi

# Warn (non-blocking) about general 'as any' usage
GENERAL_AS_ANY_HITS=$(echo "$TEST_FILES" | xargs grep -nE '\bas\s+any\b' 2>/dev/null | grep -v 'expect\s*(' || true)
AS_ANY_COUNT=$(echo "$GENERAL_AS_ANY_HITS" | grep -c . 2>/dev/null || echo "0")
if [[ "$AS_ANY_COUNT" -gt 0 ]]; then
  warn "'as any' found ${AS_ANY_COUNT} times in test files (mock arguments — review for necessity)"
else
  ok "No 'as any' in test files"
fi

# Note: Duplicate test description detection is handled by ESLint's
# vitest/no-identical-title rule, which is scope-aware (same describe block).
# A shell script can't distinguish same-name tests in different describe blocks
# (which are legitimate) from actual copy-paste duplication.

# ── Check 5: Empty test bodies ───────────────────────────────────────
header "Check 6: Empty Test Bodies"
log "Scanning for tests with no content..."

EMPTY_PATTERN="(it|test)\s*\([^)]+,\s*(async\s*)?\(\)\s*=>\s*\{\s*\}\s*\)"
EMPTY_HITS=$(echo "$TEST_FILES" | xargs grep -nE "$EMPTY_PATTERN" 2>/dev/null || true)

if [[ -n "$EMPTY_HITS" ]]; then
  fail "Found empty test bodies (these execute no assertions):"
  echo "$EMPTY_HITS" | head -20
else
  ok "No empty test bodies found"
fi

# ── Summary ──────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━ Audit Summary ━━━${NC}"
echo -e "${ARROW} Scanned ${TEST_COUNT} test files"
if [[ "$WARNINGS" -gt 0 ]]; then
  echo -e "  ${YELLOW}⚠${NC} ${WARNINGS} warning(s)"
fi

if [[ "$FAILURES" -gt 0 ]]; then
  echo -e "${CROSS} ${RED}${BOLD}${FAILURES} gaming pattern(s) detected — fix before proceeding${NC}"
  exit 1
else
  echo -e "${CHECK} ${GREEN}${BOLD}All checks passed — no gaming detected${NC}"
  exit 0
fi
