---
description: "Trust tiers for memory notes. Read before promoting observed text to persist."
connections: [lanes, verbs]
---

# Trust tiers

A note without a tier is `observed`. Observed notes die with the session. Lane choice lives in [[lanes]]. Persist verbs live in [[verbs]].

## observed

The model heard it, inferred it, or wants it to be true.

Examples: "the swarm will convert," "this creator looks fake," "we should remember the user's favorite city."

Closer: nobody. Do not `capture`. Do not `add_memory`.

## verified

An independent checker agreed.

Examples:

- `npm test` passed, so "31 production-imported tests" may be stored.
- `lint-graph.js` passed, so the topology may be stored.
- Stripe session retrieve says `paid`, so "escrow funded" may be stored.
- `gbrain doctor --json` is healthy, so the brain itself may be written.

Closer: script or policy.

## decided

A human or an explicit policy closed a graph node.

Examples: brand tapped "Fill remaining from bench." Brand approved the batch. Pay released after clean measure.

The memory records **that the node closed**, plus the verifier string. It does not re-litigate the node.

Closer: human or policy. Same closer as the graph node that produced the fact.

## irreversible

Money, publish, delete, identity, legal, accept, post.

These inherit the parent skill's hard rule. The memory write is a second irreversible edge. If the product node is still `running`, the memory node is still `running`.

Writing "campaign C is paid" while `pay` is `running` is a skill violation — even if the model is "pretty sure."

## Promotion

```
observed  --(verifier)-->  verified  --(human/policy)-->  decided
```

There is no jump from `observed` to `decided`. A confident model is still `observed`.
