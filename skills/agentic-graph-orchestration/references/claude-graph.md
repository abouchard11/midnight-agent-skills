# Claude Code Graph Engineering

Graph engineering = nodes (jobs / specialized agents) + edges (data dependencies) + anchors (independent proof of completion). Execute the topology with a script that owns the loop, branching, and intermediate results.

A straight-line agent is a degenerate graph.

## Why graphs beat a single context

- Intermediates live in script variables, not the model context window.
- Independent nodes run concurrently.
- Failed node + dependents can be selectively retried.
- Coordination cost is code, not tokens.

## Topology primitives

- Fan-out-and-synthesize
- Classifier-router
- Produce-then-check
- Hierarchical orchestrator-worker
- Open external edge (human / policy must close)

## Node design

- Narrow responsibility and minimal tool access.
- Explicit ownership of files or data slices.
- Clear done-when verifier that does not rely on the same agent that produced the work.
- Isolation when parallelism is used.
- A `closer` field: `model`, `human`, `policy`, or `script`. Irreversible nodes cannot be `model`.

## Dynamic workflows

The orchestration script:

- Spawns subagents with chosen models and isolation.
- Holds intermediate results in variables.
- Implements loops, conditionals, retries, and budgets in code.
- Returns only the final structured result.

If the script is "the model will decide when we are done," you do not have a graph. You have a monologue with extra steps.
