# Model Selection Enforcement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-correct Task tool calls to Sonnet when the prompt matches mechanical task patterns, and document the full model selection policy in CLAUDE.md.

**Architecture:** A PreToolUse hook script (bash + jq) intercepts Task tool calls, pattern-matches the prompt, and rewrites the model parameter via `updatedInput`. CLAUDE.md is updated with the full task-to-model mapping table as soft guidance.

**Tech Stack:** Bash, jq, Claude Code hooks API

---

### Task 1: Create the hook script

**Files:**
- Create: `.claude/hooks/enforce-model-selection.sh`

**Step 1: Create the hooks directory**

```bash
mkdir -p /Users/zoemarsico/Documents/Humans/.claude/hooks
```

**Step 2: Write the hook script**

Create `.claude/hooks/enforce-model-selection.sh` with this exact content:

```bash
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
```

**Step 3: Make it executable**

```bash
chmod +x /Users/zoemarsico/Documents/Humans/.claude/hooks/enforce-model-selection.sh
```

**Step 4: Verify the script parses correctly**

```bash
echo '{"tool_name":"Task","tool_input":{"model":"opus","prompt":"Fix ESLint errors in components"}}' | /Users/zoemarsico/Documents/Humans/.claude/hooks/enforce-model-selection.sh
```

Expected output: JSON with `updatedInput.model: "sonnet"`

**Step 5: Verify passthrough for non-mechanical tasks**

```bash
echo '{"tool_name":"Task","tool_input":{"model":"opus","prompt":"Implement new dashboard feature with charts"}}' | /Users/zoemarsico/Documents/Humans/.claude/hooks/enforce-model-selection.sh
```

Expected output: empty (exit 0, no JSON)

**Step 6: Commit**

```bash
git add .claude/hooks/enforce-model-selection.sh
git commit -m "feat: add PreToolUse hook to enforce Sonnet for mechanical tasks"
```

---

### Task 2: Register the hook in settings

**Files:**
- Modify: `.claude/settings.local.json`

**Step 1: Update settings.local.json**

Replace the entire contents of `.claude/settings.local.json` with:

```json
{
  "permissions": {
    "allow": [
      "Bash(wc:*)",
      "Bash(grep:*)",
      "Bash(ls:*)"
    ]
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/enforce-model-selection.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

**Step 2: Commit**

```bash
git add .claude/settings.local.json
git commit -m "feat: register model enforcement hook in settings"
```

---

### Task 3: Update CLAUDE.md with full model selection table

**Files:**
- Modify: `CLAUDE.md` (lines 62-75, the "Model Usage — MANDATORY" section)

**Step 1: Replace the Model Usage section**

Replace lines 62-75 in `CLAUDE.md` (from `## Model Usage — MANDATORY` through the end of `**Opus is reserved for**` paragraph) with:

```markdown
## Model Usage — MANDATORY

**NEVER fix ESLint errors, type errors, formatting issues, or other mechanical code fixes directly in the main (Opus) context.** ALWAYS delegate these to a subagent. This is a hard rule — no exceptions.

A PreToolUse hook (`.claude/hooks/enforce-model-selection.sh`) auto-corrects Task calls to Sonnet when the prompt matches mechanical patterns. The table below is the source of truth for model selection:

| Task type                                    | Model  | Delegate to                        |
|----------------------------------------------|--------|------------------------------------|
| ESLint / lint fixes (web, components)        | sonnet | `frontend-engineer`                |
| ESLint / lint fixes (API)                    | sonnet | `backend-engineer`                 |
| TypeScript type errors                       | sonnet | relevant engineer agent            |
| Test assertion updates                       | sonnet | `test-engineer` or relevant agent  |
| Formatting / style fixes                     | sonnet | relevant engineer agent            |
| Simple refactors (renames, dead code)        | sonnet | relevant engineer agent            |
| Code review / audits                         | sonnet | `superpowers:code-reviewer`        |
| Complex debugging (hangs, race conditions)   | opus   | stay in main context               |
| Architectural decisions                      | opus   | stay in main context               |
| New feature implementation                   | opus   | stay in main context               |

**When spawning subagents for Sonnet tasks, always pass `model: "sonnet"` explicitly.** The hook is a safety net, not a substitute for correct behavior.
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add full model selection table with hook reference to CLAUDE.md"
```

---

### Task 4: Test end-to-end

**Step 1: Restart Claude Code session** (hooks are loaded at session start)

**Step 2: Trigger a mechanical task** — ask Claude to fix a lint error and verify the hook fires (check that the subagent runs on Sonnet)

**Step 3: Trigger a non-mechanical task** — ask Claude to plan a new feature and verify no correction happens

---

### Verification Checklist

- [ ] Hook script exists at `.claude/hooks/enforce-model-selection.sh` and is executable
- [ ] Hook registered in `.claude/settings.local.json` under PreToolUse with matcher "Task"
- [ ] CLAUDE.md has the full model selection table with all 10 task types
- [ ] `echo '{"tool_name":"Task","tool_input":{"model":"opus","prompt":"Fix lint errors"}}' | .claude/hooks/enforce-model-selection.sh` outputs JSON with `model: "sonnet"`
- [ ] `echo '{"tool_name":"Task","tool_input":{"model":"opus","prompt":"Implement auth feature"}}' | .claude/hooks/enforce-model-selection.sh` produces no output
- [ ] `echo '{"tool_name":"Task","tool_input":{"model":"sonnet","prompt":"Fix lint errors"}}' | .claude/hooks/enforce-model-selection.sh` produces no output (already correct)
