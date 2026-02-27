#!/bin/bash
# PreToolUse hook (matcher: Edit, Write): Enforce test-driven development.
#
# When editing implementation source files (not test files, configs, docs):
# 1. Check if a corresponding test file exists in the same package
# 2. If NO test file: strong warning demanding test-first development
# 3. If test file exists: gentle reminder to ensure a failing test covers this change
#
# Exit 0 with no output = passthrough.
# JSON with systemMessage = allow but remind.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')

# Only act on Edit and Write tool calls
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Skip if no file path
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Skip non-source files (configs, docs, scripts, hooks, memory, etc.)
case "$FILE_PATH" in
  *.test.ts|*.spec.ts) exit 0 ;;           # Test files — always OK
  *.md|*.json|*.yml|*.yaml) exit 0 ;;      # Config/docs
  *.sh) exit 0 ;;                           # Scripts
  *.mjs|*.cjs) exit 0 ;;                    # Config files
  */.claude/*) exit 0 ;;                    # Claude config
  */test/*|*/__tests__/*) exit 0 ;;         # Test directories
  */scripts/*) exit 0 ;;                    # Scripts
  */drizzle/*) exit 0 ;;                    # Migrations
  */.svelte-kit/*) exit 0 ;;               # Generated
  */node_modules/*) exit 0 ;;              # Dependencies
  *.svelte) exit 0 ;;                      # Svelte components (tested via integration)
  *.d.ts) exit 0 ;;                        # Type declarations
  *.css) exit 0 ;;                         # Stylesheets
  *.html) exit 0 ;;                        # HTML templates
esac

# Only act on TypeScript source files in src/ directories
if ! echo "$FILE_PATH" | grep -qE '/src/.*\.ts$'; then
  exit 0
fi

# Extract the basename (handle SvelteKit +page.server.ts → page.server convention)
BASENAME=$(basename "$FILE_PATH" .ts)
SEARCH_NAME=$(echo "$BASENAME" | sed 's/^\+//')

# Find the package root (apps/api, apps/web, packages/db, packages/shared)
PACKAGE_ROOT=$(echo "$FILE_PATH" | grep -oE '.*/apps/[^/]+|.*/packages/[^/]+' || echo "")

if [[ -n "$PACKAGE_ROOT" ]]; then
  # Look for corresponding test file in the package
  TEST_EXISTS=false
  if find "$PACKAGE_ROOT" -maxdepth 6 \( -name "${SEARCH_NAME}.test.ts" -o -name "${SEARCH_NAME}.spec.ts" \) -not -path "*/node_modules/*" -not -path "*/.svelte-kit/*" 2>/dev/null | head -1 | grep -q .; then
    TEST_EXISTS=true
  fi

  if [[ "$TEST_EXISTS" == "false" ]]; then
    # No test file found — STRONG WARNING
    jq -n --arg file "$FILE_PATH" --arg name "$SEARCH_NAME" '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        systemMessage: ("TDD VIOLATION: You are editing " + $file + " but NO corresponding test file exists (searched for " + $name + ".test.ts). You MUST create the test file with a FAILING test FIRST, then implement. Red-Green-Refactor: write the failing test, then come back to this file. This is mandatory.")
      }
    }'
    exit 0
  fi
fi

# Test file exists — gentle reminder
jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    systemMessage: "TDD REMINDER: You are editing an implementation file. Ensure the corresponding test has a FAILING assertion for this change BEFORE writing implementation code. Red-Green-Refactor: test first, then implement."
  }
}'
