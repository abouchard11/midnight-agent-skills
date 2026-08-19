# Prior art (read this before claiming novelty)

This skill is a synthesis. Isolated pieces already exist. Cite them.

## Coding-agent skill packs (the 100k-star class)

- **Superpowers (obra)** — test-driven, spec-driven Claude Code framework. Subagents get fresh context. The current default "how to work" pack.
- **GStack (garrytan/gstack)** — Garry Tan's virtual engineering team. Slash commands for CEO / EM / designer / QA / security / release. Personal AGI as an org chart.
- **Community Karpathy guidelines** (forrestchang / multica-ai) — four behavioral rules from Karpathy's Jan 2026 post. Think, simplify, surgical edits, stay on goal.
- **Anthropic skills + Skill Creator** — the format this repo uses (YAML frontmatter, progressive disclosure).

## Graph / loop engineering skills (the 0–6 star class)

- [VineeTagarwaL-code/graph-engineering](https://github.com/VineeTagarwaL-code/graph-engineering) — Claude skill for dependency graphs, fan-out, verification retry, human approval gates. Closest cousin. 6 stars as of Aug 2026.
- [NITISH-R-G/graph-engineering-skills](https://github.com/NITISH-R-G/graph-engineering-skills) — eight skills on verifier design, autonomy ladders, reviewer nodes.
- [mlopscommunity/graph-engineering-skill](https://github.com/mlopscommunity/graph-engineering-skill) — "design agent work as a graph, not a line."
- [uninhibited-scholar/obsidian-loop-wiki](https://github.com/uninhibited-scholar/obsidian-loop-wiki) — loop engineering + a no-dependency checker that resists Goodhart gaming.

## Runtimes

LangGraph, CrewAI, Google ADK, Temporal+LLM workers. These *run* graphs. This repo is not a runtime.

## Memory stores

- **GBrain (garrytan/gbrain)** — markdown brain, hybrid search, MCP verbs. This repo does not fork it. The companion skill adds a closer GBrain does not enforce: the model cannot own `remember`.
- **GStack memory-sync** — push curated `~/.gstack/` state to private git. Complementary cadence, not a store of product truth.
- **Graphiti** — entity/episode graph. Canonical here for people, companies, and project facts. GBrain is not a substitute.

## What this repo adds on top

1. **External edges stay open.** Human-approval-gates in coding skills are "ask before merge." Here, accept / post / pay are first-class product nodes that the model cannot mark passed.
2. **A linter.** `scripts/lint-graph.js` fails a graph that lets the model own an irreversible edge. Most skill repos are prose.
3. **A product graph, not a coding graph.** Dozen is a marketplace with FTC, fake-engagement, and payout verifiers. The worked example is not "plan → implement → test."
4. **A memory companion with the same hard rule.** `remember` / `forget` are irreversible. Graphiti stays the entity store. GBrain holds pages. Harness `MEMORY.md` is a cache.

If a later public launch essay skips this file, it is dishonest.
