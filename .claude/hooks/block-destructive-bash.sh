#!/bin/bash
# PreToolUse hook (matcher: Bash): Block obviously destructive commands.
# Exit 0 with no output = passthrough.
# JSON with permissionDecision "deny" = block.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')

# Only act on Bash tool calls
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Destructive patterns — block these unconditionally
# rm -rf / or rm -rf ~ or rm -rf . (root/home/cwd wipe)
if echo "$COMMAND" | grep -qE 'rm\s+-rf\s+(/|~|\.)(\s|$)'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "BLOCKED: Destructive command (recursive delete of root/home/cwd). Use targeted rm with specific paths."
    }
  }'
  exit 0
fi

# dd writing to disk devices
if echo "$COMMAND" | grep -qE 'dd\s+.*of=/dev/'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "BLOCKED: Disk write via dd. This is not a software engineering operation."
    }
  }'
  exit 0
fi

# mkfs (format filesystem)
if echo "$COMMAND" | grep -qE 'mkfs'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "BLOCKED: Filesystem format command. This is not a software engineering operation."
    }
  }'
  exit 0
fi

# Credential scraping patterns
if echo "$COMMAND" | grep -qiE 'security\s+find-(generic|internet)-password|cat.*/etc/(passwd|shadow)|curl.*metadata.*iam'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "BLOCKED: Potential credential access. Use wrangler secret or environment variables instead."
    }
  }'
  exit 0
fi

# Passthrough
exit 0
