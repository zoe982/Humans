#!/usr/bin/env bash
set -euo pipefail

# Verify every package has at least one test file.
# Prevents packages from silently passing coverage thresholds when vitest
# exits 0 because no tests matched.

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
FAILED=0

PACKAGES=(
  "apps/api"
  "apps/web"
  "packages/db"
  "packages/shared"
)

for pkg in "${PACKAGES[@]}"; do
  count=$(find "$pkg" -name '*.test.ts' -o -name '*.spec.ts' | grep -cv node_modules || true)
  if [[ "$count" -eq 0 ]]; then
    echo -e "${RED}FAIL${NC}: $pkg has zero test files"
    FAILED=1
  else
    echo -e "${GREEN}OK${NC}: $pkg has $count test file(s)"
  fi
done

if [[ "$FAILED" -eq 1 ]]; then
  echo ""
  echo -e "${RED}Some packages have no test files. Every package must have tests.${NC}"
  exit 1
fi
