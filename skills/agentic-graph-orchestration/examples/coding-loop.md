# Coding loop — smallest useful graph

Use this when the job is a coding agent, not a product. It is the degenerate case the marketplace graph sits on top of.

Machine spec: `examples/coding-loop.json`.

| Node | Depends on | Owns | Closer | Done when |
|------|------------|------|--------|-----------|
| plan | — | PLAN.md | human | Success criteria are measurable |
| implement | plan | src/, tests/ | model | Targeted tests exist |
| verify | implement | — | script | Verifier returns CLEAN_PASS |
| merge | verify | git | human | Diff is understood and committed |

The model may implement. It may not declare the plan done, and it may not merge.

Inner loop: implement → verify, max 3, does not rewrite PLAN.md. The script checker declares `verifies: ["implement"]`, so the loop cannot structurally self-close.
