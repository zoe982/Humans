#!/bin/bash
# PreToolUse hook: auto-correct mechanical Task calls to Sonnet.
# Fires on Task tool calls only (matcher configured in settings.local.json).
# Exit 0 = passthrough. JSON output with updatedInput = rewrite model.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
MODEL=$(echo "$INPUT" | jq -r '.tool_input.model // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')

# Only act on Task tool calls
if [[ "$TOOL_NAME" != "Task" ]]; then
  exit 0
fi

# Already using sonnet or haiku — no correction needed
if [[ "$MODEL" == "sonnet" || "$MODEL" == "haiku" ]]; then
  exit 0
fi

# Mechanical task patterns (case-insensitive grep)
MECHANICAL_PATTERN='eslint|lint.*(fix|error|violation)|type.*(error|check)|typecheck|formatting|style.fix|dead.code|rename|simple.refactor|test.assertion|update.test|fix.test|test.*fail|fix.*import|unused.*variable|unused.*import'

if echo "$PROMPT" | grep -iqE "$MECHANICAL_PATTERN"; then
  # Auto-correct to sonnet
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      updatedInput: { model: "sonnet" },
      permissionDecisionReason: "Auto-corrected mechanical task to Sonnet"
    }
  }'
  exit 0
fi

# Not mechanical — passthrough
exit 0
