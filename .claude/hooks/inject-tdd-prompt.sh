#!/bin/bash
# PreToolUse hook (matcher: Task): Inject TDD requirements into subagent prompts.
#
# Automatically appends TDD enforcement context to any Task call dispatched
# to a code-writing agent type. This ensures TDD is enforced at the prompt
# level — agents receive TDD instructions regardless of how the orchestrator
# phrased the request.
#
# Targeted agent types: frontend-engineer, backend-engineer, implementer,
# database-engineer, cook, general-purpose, ive
#
# Skipped agent types: Explore, explore-lite, planner, test-engineer,
# test-runner, superpowers:code-reviewer (read-only / non-coding)
#
# Exit 0 with no output = passthrough.
# JSON with updatedInput = modify the prompt.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')

# Only act on Task tool calls
if [[ "$TOOL_NAME" != "Task" ]]; then
  exit 0
fi

AGENT_TYPE=$(echo "$INPUT" | jq -r '.tool_input.subagent_type // ""')
PROMPT=$(echo "$INPUT" | jq -r '.tool_input.prompt // ""')

# Code-writing agents that must follow TDD
case "$AGENT_TYPE" in
  frontend-engineer|backend-engineer|implementer|database-engineer|cook|general-purpose|ive)
    ;;
  *)
    # Non-code agents — passthrough
    exit 0
    ;;
esac

# Build TDD suffix
read -r -d '' TDD_SUFFIX << 'ENDTDD' || true

---
## TDD ENFORCEMENT (auto-injected by hook)
You MUST follow Test-Driven Development for ALL code changes:
1. **RED**: Write a failing test FIRST that describes the desired behavior
2. **GREEN**: Write the MINIMUM implementation to make the test pass
3. **REFACTOR**: Clean up while keeping tests green

Rules:
- NEVER write implementation code before a corresponding failing test exists
- Report test commands (with `| tail -n N`) for the orchestrator to run in Bash — you do NOT run tests yourself
- Cover: happy path, error paths, auth guards, edge cases, empty states
- No test gaming: no trivial assertions, no coverage suppression, no placeholder names
- 95% coverage minimum per package
- If you are about to write implementation code without a failing test, STOP and write the test first
ENDTDD

# Construct the full updated prompt (original + TDD suffix)
NEW_PROMPT="${PROMPT}${TDD_SUFFIX}"

# Return updated input with TDD-injected prompt
jq -n --arg prompt "$NEW_PROMPT" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    updatedInput: { prompt: $prompt },
    systemMessage: "TDD enforcement auto-injected into subagent prompt."
  }
}'
