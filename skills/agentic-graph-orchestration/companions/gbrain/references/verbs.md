---
description: "GBrain and Graphiti verbs. Read only after a store probe and a lane choice."
connections: [lanes, trust-tiers]
---

# Verbs

Use the store that is actually installed. Probe, then act. Lane first ([[lanes]]), then tier ([[trust-tiers]]).

## Probe

```sh
gbrain doctor --json
```

- Healthy + MCP registered → use GBrain verbs.
- Missing / unhealthy → skip GBrain. Do not shell-out to a guessed binary all session.
- Graphiti MCP present → use it for entity/episode facts regardless of GBrain.

## GBrain (when healthy)

Prefer a small surface. Do not dump 80 MCP tools into the loop.

| Verb | When |
|------|------|
| `gbrain think "…"` | You need an answer with citations and gaps |
| `gbrain search "…"` | You need raw chunks |
| `gbrain capture "…"` | After `verify-note` passes. One page, one fact family |
| forget / delete-page | Only after a human or policy closer |

Do not call `gbrain agent run` from this skill. That is a different product.

## Graphiti (when present)

| Verb | When |
|------|------|
| `search_nodes` | Entities in `group_ids=[project]` |
| `search_memory_facts` | Edges / facts in that group |
| `add_memory` | After verify; always set `group_id` |
| `get_episodes` | Recent episodes in that group |
| `delete_episode` / `delete_entity_edge` | Human / policy only |

Never write project facts into `global`.

## Fallback

If neither store is up: write `.scratch/` and say so. A scratch file is not memory.

## Shape of a captured page

```md
---
tier: verified
lane: gbrain
closer: script
verifier: npm test exit 0
source: commit ac8eccd
---

Accept gate is dual: ≥60% and at least six seats. Rejected seats stay in the denominator.
```

No secrets in frontmatter. No "paid" without the pay node's verifier.
