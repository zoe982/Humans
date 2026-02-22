#!/bin/bash
# SessionStart hook: Print context discipline reminder.

jq -n '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    systemMessage: "Context budget: keep main session under 50%. Delegate exploration to explore-lite (haiku), planning to planner (opus), implementation to implementer (sonnet). Tests run via Bash in main context only — never in subagents. Use tail to truncate output. Update docs/ai/orchestrator-state.md each iteration."
  }
}'
