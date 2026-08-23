---
name: gbrain-graph-companion
description: Gate GBrain and Graphiti writes so the model drafts notes but cannot own remember, forget, or persist. Use when the user mentions GBrain, gbrain, remember this, persist a learning, memory sync, Graphiti vs GBrain, trust tiers, or session-end memory. Not for product UI, Stripe, or building GBrain itself.
metadata:
  type: workflow
  lifecycle: active
---

# GBrain Graph Companion — The model does not own remember

Pair with `agentic-graph-orchestration`. That skill owns work topology. This one owns what may outlive the process.

**Hard rule:** `remember`, `forget`, and `persist` are irreversible. Auto-capturing a session into GBrain is a skill violation. Draft a scratch note. Do not promote it.

## Workflow

1. **Recall first.** Probe stores, then search. Do not write a page that restates a verified page.
2. **Pick a lane.** Graphiti = entities/episodes. GBrain = pages/learnings. `MEMORY.md` = cache only. See `references/lanes.md`.
3. **Draft** a scratch note with `tier`, `lane`, `closer`, `verifier`. Closer for this node is `model`.
4. **Verify** with the script, not a vibe:

   ```sh
   python3 .grok/skills/gbrain-graph-companion/scripts/lint-note.py .scratch/note.md
   ```

   Fail closed on `observed`, secrets, duplicate lanes, or "paid"/"posted" without a closed-node verifier.
5. **Persist** only if lint exits 0 and tier is `verified` or `decided`. Closer is `policy` or `human`. Then `gbrain capture` or Graphiti `add_memory` with `group_id`.
6. **Forget** only after a human or policy closer. Propose a retraction. Do not delete.

If nothing verified at session end: write nothing.

Graph: `examples/memory-loop.json` (`recall → draft-note → verify-note → remember`).

## Lanes and tiers (essentials)

| Lane | Owns | Never |
|---|---|---|
| Graphiti | Entities, episodes, `group_id` facts | CLAUDE.md guidance, code search |
| GBrain | Pages, retros, skill learnings | Substituting for Graphiti |
| `MEMORY.md` | Read-first cache | Anything authoritative |

Conflict order: live tree > Graphiti > GBrain page > harness cache.

| Tier | Persist? |
|---|---|
| `observed` | No |
| `verified` | Script / policy |
| `decided` | Human / policy after a graph node closed |
| `irreversible` | Same closer as accept / post / pay — never the model |

See `references/trust-tiers.md` and `references/verbs.md`.

## Knowledge graph

Start at `references/INDEX.md`.

### Cross-skill connections

- [[agentic-graph-orchestration:]] — work topology; irreversible product edges
- Do not replace that skill. A passed `pay` node may produce a `decided` memory. An open `pay` node may not.

## Common issues

| Symptom | Fix |
|---|---|
| GBrain down / `gbrain doctor` fails | Skip persist. Do not invent a third store |
| Fact is a person/company/episode | Graphiti with `group_id`. Pointer only in GBrain |
| Want to dump the transcript | Refuse. One short learning page max |
| Note says paid/posted | Require the product node already passed |
| Same sentence in both stores | Pick one durable lane |

## Output

- Lane + tier on every candidate
- `lint-note.py` exit 0 before capture
- After persist: slug or episode id, tier, verifier
- After skip: one line saying why

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
