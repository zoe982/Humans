#!/bin/bash
# PreToolUse hook (matcher: Edit): Enforce test-driven development.
#
# When editing implementation source files (not test files, configs, docs),
# emit a reminder that TDD requires the test to be written first.
# This is a soft gate (allow with message) — the audit script is the hard gate.
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
esac

# Only act on TypeScript source files in src/ directories
if ! echo "$FILE_PATH" | grep -qE '/src/.*\.ts$'; then
  exit 0
fi

# This is an implementation source file — remind about TDD
jq -n '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    systemMessage: "TDD REMINDER: You are editing an implementation file. Ensure the corresponding test file exists and has a FAILING test for this change BEFORE writing implementation code. Red-Green-Refactor: test first, then implement."
  }
}'
