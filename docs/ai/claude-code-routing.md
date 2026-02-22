# Claude Code Task Router

Automatic model-tier routing for Claude Code sessions. Assigns each task to the cheapest model that can handle it, scales thinking depth to match complexity, and enforces context discipline.

## Model Selection Rules

| Task Type | Model | Agent | Thinking |
|-----------|-------|-------|----------|
| File discovery, quick lookups | Haiku | `explore-lite` | None |
| Routine implementation, known approach | Sonnet | `implementer` | Low |
| Mechanical fixes (lint, types, format) | Sonnet | `implementer` | Low |
| Test execution, failure parsing | Sonnet | `test-runner` | Low |
| Architecture, ambiguous bugs, security | Opus | `planner` | Medium-High |
| Complex debugging, race conditions | Opus | Main context | High |

### When to Use Which

- **explore-lite (Haiku)**: "Where is X?", "What files handle Y?", "List all Z". Fast, cheap, read-only.
- **implementer (Sonnet)**: "Add this field", "Fix this lint error", "Rename X to Y". Known approach, small scope.
- **test-runner (Sonnet)**: "Run the API tests", "Check coverage for web". Runs tests, returns compact signal.
- **planner (Opus)**: "How should we redesign X?", "What's causing this intermittent failure?", "Plan the migration from A to B". Deep reasoning required.
- **Main context (Opus)**: Only for orchestration decisions and genuinely complex debugging that requires full conversation history.

### Domain Agents (Existing)

These existing agents handle domain-specific implementation and always run on Sonnet:

| Agent | Domain |
|-------|--------|
| `frontend-engineer` (Knuth) | SvelteKit, components, TDD |
| `backend-engineer` | Hono, Workers, D1, API routes |
| `database-engineer` | Schema, migrations, Drizzle |
| `test-engineer` | Coverage audits, test strategy |
| `ive` | UI/UX design, visual craft |
| `cook` | Orchestration (never writes code) |

## Thinking Intensity (effortLevel)

- **Low**: Mechanical tasks, known patterns, simple lookups
- **Medium** (default for Opus): Standard analysis, planning, code review
- **High**: Ambiguous bugs, security analysis, architectural decisions with many tradeoffs

Rule: start at the lowest level that could work. Escalate only when the task demonstrably needs deeper reasoning.

## Context Budget Policy

- **Main session**: Stay under 50% of context window capacity
- **Subagents**: Each task prompt should use under 50% of the agent's context
- **State persistence**: Update `docs/ai/orchestrator-state.md` each iteration so context can be safely compacted
- **Test output**: Always pipe through `tail` to prevent log floods

### How Context Is Managed

1. **Delegate aggressively** — exploration, implementation, and test parsing all happen in subagent contexts
2. **Compact early** — if the main session approaches 50%, summarize and compact
3. **Resume from state** — `orchestrator-state.md` captures current objective, decisions, and TODOs so work can continue after compaction

## Tests in Bash, Signal Only

Tests are **always** executed via Bash in the main context (or via `test-runner` agent). Never delegated to code-writing subagents.

### Commands

| Scenario | Tail lines |
|----------|-----------|
| Single-file TDD | `pnpm test -- <file> 2>&1 \| tail -n 20` |
| Full suite pass/fail | `pnpm test 2>&1 \| tail -n 40` |
| Suite with coverage | `pnpm test -- --coverage 2>&1 \| tail -n 80` |
| Failure diagnosis | `pnpm test 2>&1 \| tail -n 200` |

> **Note**: The `test` scripts already include `vitest run`. Do NOT use `pnpm test run` — it doubles the `run` arg and vitest treats it as a filename filter, finding no files.

### Failure Signal Format

When tests fail, the useful output is:
```
FAIL: <package>
Failing: <test name(s)>
Error: <shortest relevant excerpt with file:line>
Fix: <1-sentence suggestion>
```

Everything else is noise.

## Iteration Protocol

Every non-trivial change follows this loop:

1. Write a 5-10 line micro-plan with acceptance criteria
2. Execute one small change (via `implementer` or domain agent)
3. Run the tightest relevant test via Bash
4. If failing: apply one targeted fix and re-run
5. Update `orchestrator-state.md`
6. If context approaches 50%: compact and continue from state file

## Hooks

| Hook | Matcher | Purpose |
|------|---------|---------|
| `enforce-model-selection.sh` | Task | Auto-corrects mechanical tasks to Sonnet |
| `block-subagent-tests.sh` | Task | Prevents subagents from running tests |
| `block-destructive-bash.sh` | Bash | Blocks `rm -rf /`, `dd of=/dev/`, credential scraping |
| `compact-bash-failure.sh` | Bash (failure) | Summarizes Bash failures into compact signal |
| `session-start-reminder.sh` | SessionStart | Reminds about context budget and routing rules |

## Claude.ai Mapping

For users working in Claude.ai instead of Claude Code:

- **Model selection**: Use the model picker (Opus for planning, Sonnet for implementation)
- **Subagents**: Use Projects with separate conversations for different concerns
- **Hooks**: Not available — manually follow the routing rules
- **State file**: Keep a pinned message or artifact with current objective and TODOs
- **Test output**: Paste only the relevant failure lines, not full logs
