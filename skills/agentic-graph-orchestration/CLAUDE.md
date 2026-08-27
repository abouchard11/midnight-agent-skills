# CLAUDE.md — agentic-graph-orchestration

> Operating contract for this repo. Read first, every session.
> Agent-facing usage notes: AGENTS.md. Skill surface: SKILL.md. State: .planning/STATE.md.

## What this is (direction set 2026-08-27)

**The product.** Governed / verifiable agent execution: work topologies where every node
has a typed closer (human / script / model / policy), the model can never close an
irreversible edge, and a mutation-tested linter + runtime enforce it. Pitch in one line:
*"agents that cannot pay, ban, delete, or publish without a human closer — with the
linter that proves it."*

Previously framed as a personal skill; now being productized. Branding/naming is an open
item — repo name, Graphiti group, and GitHub slug stay `agentic-graph-orchestration`
until the positioning pass decides otherwise.

## Invariants (do not relax)

1. **Gates are guilty until proven fail-capable.** Any change to `lint-graph.js`,
   `run-graph.js`, or `companions/gbrain/scripts/lint-note.py` ships with a test that
   FAILED before the change (or a mutation demo), and the full suite green: `npm test`.
2. **One inference.** Irreversibility inference lives in `lint-graph.js`
   (`IRREVERSIBLE_IDS` + `IRREVERSIBLE_ID_PATTERNS`); the runtime imports it. Never
   reintroduce a second copy — a runtime with its own weaker rule is a gate that drifts.
3. **The checker never repairs.** `check-sentinel.js` reports; `sync-gates.js` repairs —
   deliberately, with a commit as the release record, never automatically on drift.
4. **Canonical is here.** Installs: `midnight-agent-skills/skills/agentic-graph-orchestration`
   (our packaging mirror — sync + commit + push after every gate change) and Hermes
   `.grok/skills/...` (git-tracked in Grok's repo — coordinate, don't touch).
5. **Bare `hold` stays out of the inferred irreversible set** — it is the
   designed-reversible action enforcement graphs rely on. Same logic protects bare
   `suspend`/`freeze`; their consequential compounds are inferred.
6. **Novelty claims go through `references/prior-art.md`** — including the 2026 academic
   convergence section. The honest claim is shipping, not invention.
7. Repo visibility: private until the operator says otherwise.

## Flagship example

`~/projects/ProjectsKingPet` (kingpet-integrity) — a synthetic fraud-enforcement pipeline:
14-node graph, human-closed enforcement, script-verified payout clearance, memory
promotion gate. `graphs/run-triage-demo.js` there drives it end to end through this
repo's runtime and emits a Kiel-shaped decision queue. Demo everything with it.

## Commands

```bash
npm test                                  # full suite + sentinel + example lints
node scripts/lint.js <graph.json>         # sentinel-gated lint of one graph
node scripts/run-graph.js <graph.json>    # schedule a graph (halts at gates)
node scripts/sync-gates.js --to <install> # deliberate release to an install
```

## Memory

Graphiti group_id **`agentic-graph-orchestration`** (registered 2026-08-27). Product
direction + demo status also echoed in `midnightdev`; novelty verdict in `midnight-ip`.
