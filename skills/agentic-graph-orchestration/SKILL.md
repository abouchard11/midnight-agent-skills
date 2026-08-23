---
name: agentic-graph-orchestration
description: Apply Karpathy-style agentic engineering with Claude Code graph engineering and closed-loop multi-agent orchestration. Use for multi-agent workflows, feedback loops with verifiers, agent graphs of nodes edges and success criteria, subagent orchestration, personal AGI skill systems, or when user mentions agent loop, graph engineering, close the loop, Karpathy method, dynamic workflows, agentic coding, skill-maxxing, or YC-style markdown agents.
---

# Agentic Graph Orchestration

Build production-grade multi-agent systems by combining three complementary disciplines:

1. **Karpathy agentic engineering** — treat agents as fallible junior engineers directed by clear success criteria, incremental loops, and human taste review. Shift from writing code to writing tasks + verifiers.
2. **Claude Code graph engineering** — model work as a dependency graph of nodes (specialized agents or harnessed sessions) and edges (data dependencies). Use dynamic workflows so the script owns branching, parallelism, and intermediate state instead of stuffing everything into one context window.
3. **Closed-loop multi-agent orchestration** — every loop must have an explicit verifier (tests, schema, metric, majority vote, human checkpoint) that decides keep/revert/retry. Open loops drift; closed loops compound.

## Core Mental Model

Progression: LLM → Prompt → Agent → Loop → Graph.

- A single agent conversation is a degenerate graph (one node, no edges).
- A loop is a cycle with a stop condition and a verifier.
- A graph is nodes + edges + anchors (proof of completion) + failure domains + human checkpoints.

Always prefer the smallest topology that works.

## Hard rule

**The model does not own irreversible edges.** Accept, post, pay, publish, transfer, delete, and safety gates stay `running` until a human, a policy, or an independent verifier closes them. Auto-closing those nodes so a demo can finish in one handler is a skill violation.

## Procedure

### 1. Clarify the goal and the success criteria

Never start coding agents until the verifier is defined. The metric is now the primary engineering artifact.

Ask or infer:

- What is the single objective outcome?
- What is the cheapest, most objective verifier?
- What is the hard stop (max turns, max $, max wall time, no progress for N steps)?

### 2. Choose topology

Draw a small table:

| Node | Depends on | Owns (files / scope) | Closer | Done when (verifier) |
|------|------------|----------------------|--------|----------------------|
| ...  | ...        | ...                  | model / human / policy / script | ... |

Rules:

- Keep nodes narrow (one responsibility, minimal tools).
- Prefer parallel independent nodes over sequential when possible.
- Put verification nodes after synthesis nodes.
- Isolate mutable state (git worktrees, separate scratchpads, or pure functional handoffs).
- Human taste review nodes stay outside the automated loop.
- Do not auto-close external edges to make a demo look finished.
- Keep a human-closed node off the automated implementation path unless a real unresolved human decision is required.
- For independent checker nodes, declare optional `verifies: [producerNodeId]` and give the checker no overlapping owned surface.

Then encode the table as JSON and run `node scripts/lint-graph.js <file>`. A graph that cannot pass the linter is not ready to implement.

### 3. Implement the closed loop

For each loop:

1. Stuff minimal necessary context.
2. Discuss plan / approaches with pros-cons before actions.
3. Request a minimal first draft or experiment.
4. Run the verifier immediately.
5. Keep only if the verifier passes and the change is understood; otherwise revert.
6. Persist only verified increments. Load `companions/gbrain/SKILL.md` if the increment should outlive the process — the model may draft a note; it may not own `remember`.
7. Ask for the next incremental step.

For research / optimization loops: constrain the editable surface, give one cheap metric, fixed budget per experiment, keep or discard, repeat.

### 4. Orchestrate with graph primitives

Prefer script-held orchestration over pure conversational multi-agent.

- Script owns the loop, branching, retries, and intermediate variables.
- Subagents receive only the context they need and return structured results.
- Failure policy: selective retry of the failed node + dependents only. Never restart intake because a caption failed FTC.

Roles that commonly appear: Orchestrator, Doer, Judge / Verifier, Synthesizer, Safety gate (fail-closed).

### 5. Skill and memory layer

Treat durable procedures as markdown skills that can be loaded on demand.

- One skill = one reusable, testable workflow with clear triggers and success criteria.
- Prefer progressive disclosure: short SKILL.md + references/ for depth.
- Markdown is code — write the skill so any compatible agent can execute it.
- **GBrain companion** (`companions/gbrain/`) owns persist/recall. Graphiti stays canonical for entities. GBrain holds pages. Harness `MEMORY.md` is a cache. Do not substitute GBrain for Graphiti.

### 6. Safety, budgets, and escape hatches

- Hard dollar / token / wall-time ceilings that agents cannot override.
- No-progress detector.
- Fail-closed content and action safety before irreversible steps.
- Human checkpoint nodes for security, money, publishes, architecture.
- Escape sequence: when a loop is detected, surface the transcript and ask for a tie-breaker.

## Reference implementation

`examples/dozen-graph.md` + `examples/dozen-graph.json` document the live marketplace graph:

intake → safety → assemble → offer → **accept** → draft → verify → revise → review → **post** → measure → pay

Accept and post are real nodes. They stay `running` until a human or an explicit bench action closes them. The model drafts captions only.

A second, smaller topology lives in `examples/coding-loop.json` (plan → implement → verify). Use that when the job is a coding agent, not a product graph.

## Lint before you ship

```sh
node scripts/lint-graph.js examples/dozen-graph.json
node scripts/lint-graph.js examples/coding-loop.json
node scripts/lint-graph.js companions/gbrain/examples/memory-loop.json
node --test scripts/lint-graph.test.js
```

The linter fails a graph that is missing a verifier, stop condition, or closer; lets the model own an irreversible edge; contains dependency cycles or unreachable cycle components; assigns the same mutable surface to unordered parallel nodes; or declares a self-verifying or ownership-conflicted verifier.

## Reference files

- `references/karpathy-loops.md`
- `references/claude-graph.md`
- `references/yc-personal-agi.md`
- `references/user-patterns.md`
- `references/prior-art.md`
- `examples/dozen-graph.md`
- `examples/coding-loop.md`
- `examples/grok-one-shot-product-build-prompt.md` — read when a user wants Grok, Claude, or Codex to execute a large autonomous product build from one detailed prompt.
- `companions/gbrain/SKILL.md`

## Anti-patterns

- Single long conversation that tries to do everything.
- Open-ended agent loops without a verifier or stop condition.
- Parallel agents writing the same files without isolation.
- Letting the model declare done without external proof.
- Auto-closing accept / post / pay so a demo can finish in one pass.
- Auto-capturing a session into GBrain so the next chat "has context."
- Restarting the whole graph because one inner-loop node failed.

## Output expectations

- Explicit goal + success criteria + stop conditions first.
- A node table (and a linted JSON graph) before implementation.
- Machine-checkable verifiers where possible.
- Budget and failure policies.
- After execution, a short retrospective.

## Retrospective (runs after every invocation)

After the primary work finishes, produce a single observed note if and only if one of these is true:

1. The same verifier failed ≥2 times in this run
2. A node had no useful evidence and the critic confidence stayed < 0.6
3. The skill instructions were ambiguous enough that the agent had to guess
4. A stop condition fired (max attempts, dollar ceiling, no-progress)

Format:

- tier: observed
- target: skill name, graph id, or types file
- proposal: one concrete change (not a vibe)
- evidence: step ids + short quote

Do not edit any SKILL.md, graph JSON, or types file.
Do not call promote / persist / remember.
Write the note to `.scratch/retro.<runId>.md` and stop.

If a note was written, the runtime surfaces it as a Hermes InboxItem
(kind: "decision", title: "Skill/graph improvement candidate").
