# Agentic Graph Orchestration

A skill (and a working product graph) for building **closed-loop multi-agent systems**.

Drop `SKILL.md` into Claude Code, Codex, or Grok skills. The agent is then required to:

1. Write success criteria and a verifier **before** spawning work.
2. Model the job as a graph of nodes, edges, and anchors — not a monologue.
3. Keep loops closed (keep / revert / retry on evidence).
4. Never let the model own irreversible gates (accept, post, pay, publish, safety).
5. Lint the graph JSON. A graph that fails the linter is not ready to implement.

## Quickstart (one minute, no dependencies)

```sh
git clone https://github.com/abouchard11/agentic-graph-orchestration && cd agentic-graph-orchestration
npm test                                               # linter + runtime suites, sentinel, example lints
node scripts/lint.js examples/refused-model-pays.json  # FAIL: the model may not close `pay`
node scripts/run-graph.js examples/coding-loop.json    # halts at the human `plan` gate
```

The second command is the point of the repo. A graph that lets the model draft and verify
an invoice is fine; the same graph refused the moment the model is also the one who pays:

```
FAIL examples/refused-model-pays.json
  - pay: irreversible edge cannot be closed by the model
```

The third command exits `2` on purpose: `plan` is a human node, so the runtime stops and
waits instead of letting anything decide for you. Node 22+ (tested on 22, 24 and 26); no packages to install.

## Stack

```
agentic-graph-orchestration     ← THIS REPO: canonical work topology + linter
        ↑ consumed by
midnight-agent-skills           ← packaging pair (work + memory closer)
        ↑ consumed by
midnight-reasoning              ← reflection / critic library
        ↑ consumed by
Kiel (runkiel.com)              ← operator UI + run state
```

Ownership is directed. This repo is a source of truth. Downstream consumers read it; they do not edit it from product work.

## Install

```sh
# Claude Code / compatible agents
mkdir -p ~/.claude/skills/agentic-graph-orchestration
cp -R SKILL.md references examples scripts companions ~/.claude/skills/agentic-graph-orchestration/
```

Or clone this repo into your project's `.claude/skills/` or `.grok/skills/`.

```sh
node scripts/lint-graph.js examples/dozen-graph.json
node --test scripts/lint-graph.test.js scripts/run-graph.test.js
node scripts/run-graph.js examples/coding-loop.json
```

`run-graph.js` is the runtime. It lints, ticks ready nodes, retries only the declared inner loop, and **halts** on human/policy nodes (exit `2` = waiting on a closer, by design). The model cannot close accept, post, pay, merge, or remember.

## What is novel, and what is not

**Not novel as isolated ideas.** Read `references/prior-art.md` before claiming otherwise.

Already in the wild:

| Work | What it is | Stars (Aug 2026) |
|------|------------|------------------|
| Superpowers (obra) | Test-driven agentic skills framework | ~243k |
| Anthropic skills + Skill Creator | Official skill format | ~157k |
| GStack (garrytan) | Virtual eng team as slash commands | ~118k |
| Community Karpathy guidelines | Four behavioral rules | ~144k–174k |
| LangGraph / CrewAI / ADK | Runtime orchestration | large |
| [graph-engineering](https://github.com/VineeTagarwaL-code/graph-engineering) | Claude skill: nodes, fan-out, human approval | 6 |
| [graph-engineering-skills](https://github.com/NITISH-R-G/graph-engineering-skills) | 8 skills on loop/graph engineering | 1 |
| [graph-engineering-skill](https://github.com/mlopscommunity/graph-engineering-skill) | Design work as a graph, not a line | 0 |

**The useful synthesis here:**

- A **skill** that forces topology + verifier-first discipline across Claude / Codex / Grok, with a **machine-checkable linter**.
- A **hard rule** that external edges (accept, post, pay) stay open until a human or an explicit policy closes them.
- A **reference product** (`examples/dozen-graph.md`) — an influencer-marketplace graph with fail-closed FTC / fake-engagement / banned-vertical gates — not another coding-agent hello world.
- A **GBrain companion** that applies the same hard rule to memory: observed notes die; only verified increments persist; Graphiti stays the entity store.

That last point is the actual delta. Graph-engineering skills tell a coding agent how to fan out. This one tells a *product* which nodes the model is not allowed to own.

## Layout

```
SKILL.md                     # loaded on trigger
references/                  # progressive disclosure + prior art
examples/dozen-graph.md      # live product topology
examples/dozen-graph.json    # linted machine spec
examples/coding-loop.md      # smaller coding-agent topology
scripts/lint-graph.js        # fail a graph that cheats
scripts/run-graph.js         # script-held runtime: lint, tick, human/policy gates
scripts/graph-template.js    # re-exports the runtime
companions/gbrain/           # GBrain companion: model does not own remember
```

## GBrain companion

`companions/gbrain/` is a second skill. GBrain stores pages. Graphiti stays canonical for entities. The model drafts notes; `remember` / `forget` are irreversible.

```sh
node scripts/lint-graph.js companions/gbrain/examples/memory-loop.json
```

## License

Apache License 2.0. See [LICENSE](LICENSE). Copyright 2026 Alex Bouchard.

## Related

- [midnight-agent-skills](https://github.com/abouchard11/midnight-agent-skills) — this skill plus the GBrain companion as a drop-in pair
- [midnight-reasoning](https://github.com/abouchard11/midnight-reasoning) — cross-run reflection / critic library
- Kiel — operator console that consumes this stack, live at runkiel.com (source private)
- Dozen — the reference product graph, live at joindozen.com (source private; its topology is in `examples/dozen-graph.md`)
- [graphiti-neo4j-ops](https://github.com/abouchard11/graphiti-neo4j-ops) — Graphiti store the memory companion treats as canonical
- [llm-safety-gate](https://github.com/abouchard11/llm-safety-gate) — fail-closed safety node
- [yapoleons-court](https://github.com/abouchard11/yapoleons-court) — shipped game where the model cannot own the score
