#!/bin/bash
# PostToolUseFailure hook (matcher: Bash): Summarize Bash failures into compact signal.
# This hook fires when a Bash command returns a non-zero exit code.
# It adds a structured summary as a systemMessage so the main conversation
# gets a clean failure signal instead of raw error floods.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')

# Only act on Bash failures
if [[ "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
# Truncate output to last 20 lines for the summary
OUTPUT=$(echo "$INPUT" | jq -r '.tool_result.stdout // ""' | tail -n 20)
STDERR=$(echo "$INPUT" | jq -r '.tool_result.stderr // ""' | tail -n 20)
EXIT_CODE=$(echo "$INPUT" | jq -r '.tool_result.exitCode // "unknown"')

# Build compact summary
SUMMARY="Bash failure (exit $EXIT_CODE)
Command: $COMMAND"

if [[ -n "$STDERR" ]]; then
  SUMMARY="$SUMMARY
Stderr (last 20 lines): $STDERR"
elif [[ -n "$OUTPUT" ]]; then
  SUMMARY="$SUMMARY
Output (last 20 lines): $OUTPUT"
fi

jq -n --arg msg "$SUMMARY" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUseFailure",
    systemMessage: $msg
  }
}'
