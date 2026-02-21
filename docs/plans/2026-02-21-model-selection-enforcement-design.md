# Model Selection Enforcement

## Problem

Opus is used for all tasks including mechanical fixes (lint, type errors, formatting).
These waste Opus capacity on work Sonnet handles equally well.
Current CLAUDE.md instructions guide correct behavior but don't enforce it.

## Solution

Two-layer enforcement:

1. **PreToolUse hook** auto-corrects Task tool calls to Sonnet when the prompt matches mechanical patterns
2. **Enhanced CLAUDE.md table** documents the full model selection policy

## Model Selection Policy

| Task type | Model | Rationale |
|---|---|---|
| ESLint/typecheck fixes | sonnet | Mechanical, pattern-based fixes |
| Test assertion updates | sonnet | Straightforward find-and-fix |
| Code review / audits | sonnet | Already set this way |
| Simple refactors (renames, dead code) | sonnet | Mechanical transformations |
| Formatting / style fixes | sonnet | Mechanical |
| Complex debugging (hangs, race conditions) | opus | Needs deep reasoning |
| Architectural decisions | opus | Needs holistic thinking |
| New feature implementation | opus | Complex multi-file reasoning |

## Hook Design

**File:** `.claude/hooks/enforce-model-selection.sh`

**Behavior:**
- Fires on every `Task` tool call via PreToolUse matcher
- Reads `tool_input.prompt` and `tool_input.model` from stdin JSON
- Pattern-matches prompt against mechanical keywords
- If matched and model is not already `sonnet` or `haiku`, outputs `updatedInput: { model: "sonnet" }`
- Otherwise passes through (exit 0)

**Mechanical patterns:** `eslint|lint.fix|lint.error|type.error|typecheck|formatting|style.fix|dead.code|rename|refactor|test.assertion|update.test|fix.test|test.*fail`

**Registration:** `.claude/settings.local.json` PreToolUse hook with matcher `"Task"`

## What This Does NOT Cover

- Model selection for direct user prompts (user always controls the session model)
- Haiku delegation (reserved for future optimization of quick lookups)
- Blocking calls — auto-correction is silent, no rejections
