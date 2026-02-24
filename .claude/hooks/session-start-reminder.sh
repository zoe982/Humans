#!/bin/bash
# SessionStart hook: Print context discipline and TDD reminder.

jq -n '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    systemMessage: "Context budget: keep main session under 50%. Delegate exploration to explore-lite (haiku), planning to planner (opus), implementation to implementer (sonnet). Tests run via Bash in main context only — never in subagents. Use tail to truncate output. TDD IS MANDATORY: write failing tests BEFORE implementation. After every feature, run test-engineer validation and quality gate (pnpm quality-gate). Invoke superpowers:test-driven-development skill for all feature work."
  }
}'
