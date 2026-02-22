#!/bin/bash
# PreToolUse hook: block subagents from running tests.
# Tests must ALWAYS run via Bash in the main context — never delegated to subagents.
# This prevents context flooding and ensures test output stays visible to the orchestrator.
#
# Exit 0 with no output = passthrough.
# JSON with permissionDecision "deny" = block the Task call.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')

# Only act on Task tool calls
if [[ "$TOOL_NAME" != "Task" ]]; then
  exit 0
fi

PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')

# Patterns that indicate the subagent is being asked to RUN/EXECUTE tests.
# These should NOT match prompts about writing, fixing, or editing test files.
#
# Matches:
#   "run the tests", "run test suite", "execute the specs"
#   "pnpm test", "npm test", "npx vitest"
#   "verify tests pass", "ensure all tests are green", "check tests work"
#   "make sure tests pass", "confirm tests are passing"
#
# Does NOT match:
#   "fix this test", "write a test for X", "update test assertions"
# Split into multiple simpler patterns for macOS grep -E compatibility.
# Pattern 1: "run tests", "run the test suite", "execute specs"
RUN_PATTERN='(run|execute).*(test|spec|suite)'
# Pattern 2: literal test commands
CMD_PATTERN='pnpm test|npm test|npx vitest|vitest run'
# Pattern 3: "verify tests pass", "ensure tests are green", "make sure tests work"
VERIFY_PATTERN='(verify|ensure|check|confirm|make sure).*(test|spec).*(pass|green|work|succeed)'

if echo "$PROMPT" | grep -iqE "$RUN_PATTERN" || \
   echo "$PROMPT" | grep -iqE "$CMD_PATTERN" || \
   echo "$PROMPT" | grep -iqE "$VERIFY_PATTERN"; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "BLOCKED: Tests must run via Bash in the main context, not in subagents. Remove test-running instructions from the subagent prompt and run tests yourself via Bash after the subagent completes."
    }
  }'
  exit 0
fi

# Not a test-running delegation — passthrough
exit 0
