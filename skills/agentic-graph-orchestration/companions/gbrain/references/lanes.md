---
description: "When to use Graphiti vs GBrain vs harness MEMORY.md. Read before any persist."
connections: [trust-tiers, verbs]
---

# Lanes

Three stores exist in this author's stack. They are not interchangeable. See [[trust-tiers]] before promoting a note and [[verbs]] before calling a store.

## Graphiti (canonical entity graph)

Use when the fact is a **person, company, project, episode, or relationship** that must survive across repos.

- Always pass `group_id` on write and `group_ids` on read.
- Project facts stay in that project's group. `global` is for cross-project preferences only.
- Retrieval is 4-pass (nodes + facts). Do not skip it because GBrain is easier to type.
- Do not `clear_graph`.

If Graphiti is the system of record for a fact, GBrain may hold a **pointer** (group_id + episode id), not a second copy of the fact.

## GBrain (markdown brain)

Use when the artifact is a **page**: retro, skill learning, design decision, CLAUDE.md guidance, code-indexed "where is X."

- Pages are markdown with provenance. The DB is an index.
- `gbrain think` synthesizes. `gbrain search` returns raw chunks. Prefer `think` when you need an answer.
- Engine here is often PGLite (`gbrain doctor --json`). If doctor fails, skip persist. Do not invent a file store that later pretends to be GBrain.
- Memory-sync to a private git repo is optional and secret-scanned. Do not sync irreversible customer data.

GBrain is not a substitute for Graphiti. That fence is already written into the Yapword / MidnightDev audits. This skill does not lift it.

## Harness MEMORY.md (cache)

Some harnesses inject `MEMORY.md` every session.

- Read it. Do not treat it as source of truth.
- Never write it mid-session as the system of record — those writes are unreliable.
- On conflict with Graphiti or the live tree, the cache loses.

## Reconciliation

A fact may appear in at most **one** durable lane plus an optional pointer.

| Fact kind | Lane |
|-----------|------|
| "Maya accepted seat s3" | Graphiti episode in the dozen `group_id`, after accept closed |
| "Accept gate is ≥60% and six seats" | GBrain skill-learning page (reusable procedure) |
| "Stripe session cs_xxx funded campaign C" | Graphiti + pointer to Stripe id; never the raw secret |
| "I think we should raise the fee" | observed — do not persist |

If you are about to write the same sentence to Graphiti and GBrain, stop and pick one.
