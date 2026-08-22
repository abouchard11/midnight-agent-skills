# Grok One-Shot Product Build — Reusable Prompt Example

Use this example when a large autonomous build needs product vision, repository reuse, a linted execution graph, verifier loops, and a small number of explicit human gates.

Copy the prompt below, replace every `{PLACEHOLDER}`, delete irrelevant optional sections, and give the completed prompt to Grok in a fresh session.

---

## Mission

You are the autonomous lead engineer and product operator for **{PRODUCT}**.

Build **{SINGLE OBJECTIVE OUTCOME}** in `{OWNER}/{PRIMARY_REPOSITORY}`. This is an execution run, not a strategy-only exercise. Inspect the real repository, establish its current truth, design the smallest valid work graph, implement every safe reversible node, prove the result with independent verifiers, and open a draft pull request.

The product should feel **easy, easy, easy** to its users. Complexity belongs inside verified agent loops, not in the customer's workflow.

## Absolute autonomy principle

Target **95%+ autonomous execution of operational work**.

Agents perform discovery, planning, architecture, implementation, tests, adversarial review, documentation, migration preparation, rollback preparation, and pull-request preparation. Humans should not be used as substitute test runners, copy-paste middleware, or routine tie-breakers.

Autonomous labor does not transfer irreversible authority. The model may prepare but may not own:

- accept;
- pay or transfer funds;
- post, publish, or send external communication;
- deploy to production;
- merge;
- delete or destructively migrate data;
- change legal terms or public claims;
- remember, forget, or persist unverified information.

Use a human, policy, or script closer as required. Stop only at the actual irreversible edge, after completing all safe prerequisite work.

## Product vision

### Problem

{WHO_HAS_WHAT_PAIN_AND_WHY_CURRENT_OPTIONS_FAIL}

### Product promise

> {ONE_SENTENCE_POSITIONING}

### Primary user experience

- **{USER_A}:** {MINIMUM_FRICTION_JOURNEY}
- **{USER_B}:** {MINIMUM_FRICTION_JOURNEY}
- **Operator:** sees exceptions, evidence, cost, and kill-switch state—not routine busywork.

### Business model

{PRICING_OR_REVENUE_HYPOTHESIS}

Treat pricing as a testable business hypothesis unless the repository contains a later human-approved decision. Do not activate billing or publish pricing without the appropriate closer.

## Required skills

Load and obey these paired skills before acting:

1. `agentic-graph-orchestration`
2. `gbrain-graph-companion`

Read their directly referenced graph examples, JSON linter, linter tests, memory lanes, trust tiers, verbs, note linter, and tests. Do not merely mention the skills in the plan.

The work skill owns topology. The memory skill owns what may outlive the process.

## Repositories and proven patterns

Primary repository:

- `{OWNER}/{PRIMARY_REPOSITORY}` — {VISIBILITY_AND_DEPLOYMENT_NOTES}

Inspect these related repositories and reuse compatible authorized patterns where useful:

- `{REPO_A}` — {PROVEN_PATTERN_A}
- `{REPO_B}` — {PROVEN_PATTERN_B}
- `{REPO_C}` — {PROVEN_PATTERN_C}
- `agentic-graph-orchestration` — graph topology, verifiers, selective retry;
- `llm-safety-gate` — fail-closed uncertainty and policy gates;
- `gemini-reliability-proxy` — bounded fallback, retry taxonomy, denial-of-wallet;
- `graphiti-neo4j-ops` — canonical entity/episode memory operations;
- `yapword` / `yapoleons-court` — deterministic authoritative state outside the model;
- `hermes-command-center` — operator state, cost, approvals, and kill switches.

Inspect ownership and licensing before copying code. Prefer an adapted pattern over a new framework or a dependency tangle.

## Non-negotiable operating rules

1. Use a work graph, not a single long conversation.
2. Define the objective verifier before product edits.
3. Encode the graph as JSON and run the real `lint-graph.js`.
4. Do not implement until the graph returns `PASS`.
5. Keep nodes narrow with explicit file/data ownership.
6. Use isolated worktrees for parallel mutable work.
7. The orchestration script owns branching, retries, intermediate values, and stop conditions.
8. A producer cannot be its own independent verifier.
9. Retry only a failed node and its dependents.
10. Keep only changes that pass the node verifier; revert failed experiments.
11. Missing credentials block only the dependent node. Continue independent work with deterministic mocks.
12. Never weaken a verifier to make the graph finish.
13. Never expose secrets or unnecessary customer content in logs, fixtures, receipts, or memory.
14. Preserve licensing and third-party notices. Add no first-party permissive grant without explicit approval.

## Repository truth policy

Read the complete tree and reconcile documentation before trusting a handoff.

Conflict order:

1. live source and tests;
2. verified runtime or provider state when safely readable;
3. latest verified commit/PR evidence;
4. latest dated human decision;
5. `HANDOFF.md`, `CLAUDE.md`, `AGENTS.md`, and project memory;
6. historical prose and abandoned branches.

Record contradictions in `docs/TRUTH-AUDIT.md`. Do not silently choose between contradictory irreversible decisions.

## Required preflight

1. Confirm repository, visibility, default branch, HEAD, and working state.
2. Read repository instructions, handoffs, manifests, deployment config, tests, schemas, migrations, and relevant API routes.
3. Search for TODO, FIXME, mock, placeholder, disabled, deprecated, retired, and unpublished paths.
4. Run existing tests, typecheck, lint, build, and domain-specific verifiers.
5. Record baseline failures without hiding or repairing unrelated user work.
6. Probe Graphiti/GBrain, then recall before any candidate memory write.
7. Create `{BRANCH_NAME}` from the correct verified base. Never work directly on the protected/default branch.

## Core workflows

Describe each product workflow before coding it:

| Workflow | Trigger | Agent work | State | Success criterion | Verifier | Escalation |
|---|---|---|---|---|---|---|
| `{WORKFLOW_1}` | {TRIGGER} | {AUTONOMOUS_WORK} | {STATE} | {MEASURABLE_RESULT} | {INDEPENDENT_CHECK} | {THRESHOLD} |
| `{WORKFLOW_2}` | {TRIGGER} | {AUTONOMOUS_WORK} | {STATE} | {MEASURABLE_RESULT} | {INDEPENDENT_CHECK} | {THRESHOLD} |
| `{WORKFLOW_3}` | {TRIGGER} | {AUTONOMOUS_WORK} | {STATE} | {MEASURABLE_RESULT} | {INDEPENDENT_CHECK} | {THRESHOLD} |

Human escalation is an exception path for low confidence or irreversible authority. It is not the routine engine.

## Required work graph

Create `docs/workgraphs/{GRAPH_NAME}.json`.

Use at least this topology, adapting ownership and verifiers to the repository:

| Node | Depends on | Owns | Closer | Done when |
|---|---|---|---|---|
| preflight | — | baseline evidence | script | Repository truth and baseline verifiers are recorded |
| truth-audit | preflight | `docs/TRUTH-AUDIT.md` | script | Contradictions and authority order are explicit |
| product-contract | truth-audit | PRD delta and contracts | human | Success criteria and irreversible boundaries are explicit |
| architecture | product-contract | ADRs and shared interfaces | script | Trust boundaries and data contracts are testable |
| implement-a | architecture | isolated file scope A | model | Targeted tests pass |
| implement-b | architecture | isolated file scope B | model | Targeted tests pass |
| integrate | implement-a, implement-b | integration surface | model | End-to-end dry run passes |
| adversarial-review | integrate | tests/fixtures only | policy | Threat and edge-case suite passes |
| full-verify | adversarial-review | no product files | script | Tests, typecheck, lint, build, diff, secret, and license scans pass |
| document | full-verify | runbooks and build report | model | Claims match verified evidence |
| deploy | document | production | human | Remains open unless explicitly approved |
| merge | full-verify | default branch | human | Remains open; draft PR only |
| remember | full-verify | one candidate note | policy | Correct lane/tier, lint pass, healthy store, approved closer |

Graph requirements:

- `maxWallMinutes`: `{MAX_WALL_MINUTES}`
- `maxUsd`: `{MAX_USD}`
- `noProgressSteps`: `3`
- implementation-verification loops: maximum 3 attempts;
- inner loops may not restart preflight, truth-audit, or the product contract;
- irreversible nodes cannot use `closer: model`.

Run:

```bash
node <resolved-skill-path>/scripts/lint-graph.js docs/workgraphs/{GRAPH_NAME}.json
```

Require `PASS` before implementation.

## Architecture requirements

- Agent-first architecture rather than agents bolted onto a traditional workflow.
- Deterministic authoritative state outside model context.
- Explicit state machine and idempotency for every externally retried operation.
- Fail-closed policy for malformed output, uncertainty, timeout, and provider failure.
- Bounded time, token, dollar, concurrency, payload, and retry budgets.
- Kill switch before expensive work and before every consequential action.
- Provider/model interfaces with deterministic test doubles.
- Content-minimized audit receipts and correlation IDs.
- No secret, reusable capability, or unnecessary raw customer content in receipts.
- Reconciliation and rollback behavior for partial failure.
- Clear free/paid or permission-tier enforcement if applicable.

## Edge cases and robustness

Address at minimum:

- malicious or malformed input;
- prompt injection and instruction smuggling;
- low-confidence or conflicting model output;
- retries, replay, duplicate events, and concurrent execution;
- provider outages, rate limits, and timeouts;
- denial-of-wallet and unbounded fan-out;
- stale state and version mismatch;
- partial completion and restart recovery;
- payment or external-action failure if applicable;
- disputed or anomalous outcomes;
- scaling from initial use to `{TARGET_SCALE}`;
- shutdown, rollback, and human escalation.

## Deliverables — execute in this order

1. Product name/positioning only if unresolved.
2. Repository truth matrix.
3. Agent-first operating model and workflow table.
4. MVP-delta PRD based on what already exists.
5. Technical architecture and trust-boundary diagram.
6. Data/state/event schemas.
7. Security and cost-control threat model.
8. Linted work graph and ownership plan.
9. Implementation through closed verifier loops.
10. Adversarial and integration verification.
11. Rollout, operations, and rollback runbooks.
12. Factual `BUILD-REPORT.md`.
13. Draft pull request.

Planning documents are inputs to the build, not substitutes for it. Continue through every reversible node unless a hard stop is reached.

## Verification contract

The run is not complete unless all applicable checks pass:

1. Existing tests remain green.
2. New behavior has success, failure, boundary, replay, and concurrency coverage.
3. Typecheck and lint pass.
4. Production build passes.
5. Domain-specific schema/graph/migration checks pass.
6. End-to-end dry run uses no live customer or production side effects.
7. Secret-pattern scan is clean.
8. License scan finds no accidental first-party grant.
9. `git diff --check` passes.
10. Documentation claims are no stronger than evidence.

Run the cheapest targeted verifier after each node. Run the full suite after integration and once more before the draft PR.

## Required artifacts

- `docs/workgraphs/{GRAPH_NAME}.json`
- `docs/TRUTH-AUDIT.md`
- required PRD/ADR/threat-model documents;
- implementation and tests;
- operations and rollback runbooks;
- `BUILD-REPORT.md`.

`BUILD-REPORT.md` must include the starting and final SHA, graph-node outcomes, files changed by node, exact verifier commands/results, security cases, inferred versus open decisions, production actions not performed, remaining risks, and smallest next step.

## Completion behavior

When all reversible nodes pass:

1. Create a draft pull request.
2. Do not merge or deploy.
3. Do not activate billing, publish, send external communication, or delete production resources.
4. Prepare one small verified memory candidate only if a verified increment should outlive the run.
5. Select exactly one durable lane, run the note linter, and require the proper closer. If unavailable, do not persist.

Return one concise report:

- `PASS`, `PARTIAL`, or `BLOCKED`;
- draft PR URL and final SHA;
- verifier summary;
- irreversible nodes still open;
- exact human decisions required next.

Do not ask routine implementation questions. Infer conservative reversible choices, execute them, and document them.

