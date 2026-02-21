#!/usr/bin/env bash
set -euo pipefail

# Verify no native <select> elements are used in Svelte components.
# The design system enforces the custom SearchableSelect component for all
# dropdown interactions. Native <select> elements bypass keyboard UX, styling
# constraints, and accessibility patterns that SearchableSelect provides.
#
# Allowlist:
#   - apps/web/src/lib/components/ui/select/  (Bits UI primitives wrapping the native element)
#   - SearchableSelect.svelte                 (the canonical select abstraction itself)

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

VIOLATIONS=$(
  grep -rn '<select' apps/web/src/ --include='*.svelte' \
    | grep -v 'ui/select/' \
    | grep -v 'SearchableSelect.svelte' \
  || true
)

if [[ -n "$VIOLATIONS" ]]; then
  echo -e "${RED}ERROR${NC}: Native <select> elements found in Svelte components."
  echo ""
  echo "Use the SearchableSelect component instead of a native <select>."
  echo "Native selects bypass the design system's keyboard UX and styling."
  echo ""
  echo "Violations:"
  while IFS= read -r line; do
    echo "  $line"
  done <<< "$VIOLATIONS"
  echo ""
  echo "Allowlisted paths (permitted to contain <select>):"
  echo "  apps/web/src/lib/components/ui/select/"
  echo "  SearchableSelect.svelte"
  exit 1
fi

echo -e "${GREEN}OK${NC}: No native <select> elements found outside allowlisted paths."
