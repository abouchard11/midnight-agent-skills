const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { lintGraph, loadAndLint } = require("./lint-graph.js");

const examples = path.join(__dirname, "..", "examples");
const memoryExample = path.join(__dirname, "..", "companions/gbrain/examples/memory-loop.json");

test("dozen graph passes", () => {
  assert.deepEqual(loadAndLint(path.join(examples, "dozen-graph.json")), []);
});

test("coding loop passes", () => {
  assert.deepEqual(loadAndLint(path.join(examples, "coding-loop.json")), []);
});

test("memory loop passes — remember is not model-owned", () => {
  assert.deepEqual(loadAndLint(memoryExample), []);
});

test("README refusal demo: a graph that lets the model close pay is refused", () => {
  // The quickstart shows this file failing. If it ever passes, the README lies.
  const errors = loadAndLint(path.join(examples, "refused-model-pays.json"));
  assert.ok(
    errors.some((e) => /pay: irreversible edge cannot be closed by the model/.test(e)),
    `expected the pay refusal, got: ${errors.join("; ")}`
  );
});

test("model cannot close remember", () => {
  const errors = lintGraph({
    name: "cheat-memory",
    goal: "Dump the session into GBrain so the next chat knows.",
    stop: { maxUsd: 1 },
    nodes: [
      {
        id: "remember",
        dependsOn: [],
        owns: ["brain"],
        closer: "model",
        irreversible: true,
        doneWhen: "captured the transcript",
      },
    ],
  });
  assert.ok(errors.some((e) => /irreversible/.test(e)));
});

test("model cannot close accept", () => {
  const errors = lintGraph({
    name: "cheat",
    goal: "Finish the demo in one handler.",
    stop: { maxUsd: 1 },
    nodes: [
      {
        id: "accept",
        dependsOn: [],
        owns: ["slots"],
        closer: "model",
        irreversible: true,
        doneWhen: "auto-marked passed",
      },
    ],
  });
  assert.ok(errors.some((e) => /irreversible/.test(e)));
});

test("compound irreversible ids cannot hide behind a model closer", () => {
  for (const id of [
    "release-payout",
    "place-order",
    "send-email",
    "approve_transfer",
    "store-memory",
    "deploy-production",
  ]) {
    const errors = lintGraph({
      name: `compound-${id}`,
      goal: "Reject consequential compound node identifiers owned by a model.",
      stop: { maxUsd: 1 },
      nodes: [{ id, dependsOn: [], owns: [], closer: "model", doneWhen: "action completed" }],
    });
    assert.ok(errors.some((error) => /irreversible/.test(error)), `${id} should fail`);
  }
});

test("enforcement verbs cannot hide behind a model closer", () => {
  for (const id of [
    "ban",
    "ban-accounts",
    "enforce",
    "enforce_decision",
    "clawback",
    "clawback-votes",
    "revoke-prize",
    "disqualify-entry",
    "suspend-account",
    "freeze-funds",
    "withhold-payout",
  ]) {
    const errors = lintGraph({
      name: `enforcement-${id}`,
      goal: "Reject enforcement-domain node identifiers owned by a model.",
      stop: { maxUsd: 1 },
      nodes: [{ id, dependsOn: [], owns: [], closer: "model", doneWhen: "action completed" }],
    });
    assert.ok(errors.some((error) => /irreversible/.test(error)), `${id} should fail`);
  }
});

test("enforcement inference stays narrow — lookalikes and reversible verbs stay free", () => {
  // `banner`/`enforcement`/`revoked` are prefixes, not the verbs themselves.
  // Bare `suspend` and `hold` stay with the explicit flag: suspending a job is
  // scheduling, and a hold is the designed-reversible action in enforcement
  // graphs — inferring them would make the irreversible list lie.
  for (const id of ["banner-rotation", "enforcement-report", "revoked-list", "suspend", "hold"]) {
    const errors = lintGraph({
      name: `benign-${id}`,
      goal: "Keep unrelated identifiers free to use any closer they want.",
      stop: { maxUsd: 1 },
      nodes: [{ id, dependsOn: [], owns: [], closer: "model", doneWhen: "action completed" }],
    });
    assert.deepEqual(errors, [], `${id} should stay lintable with a model closer`);
  }
});

test("irreversible declaration must be boolean when present", () => {
  const errors = lintGraph({
    name: "typed-authority",
    goal: "Reject truthy strings that only look like authority declarations.",
    stop: { maxUsd: 1 },
    nodes: [
      {
        id: "draft",
        dependsOn: [],
        owns: ["draft"],
        closer: "model",
        irreversible: "false",
        doneWhen: "draft exists",
      },
    ],
  });
  assert.ok(errors.some((error) => /irreversible must be a boolean/.test(error)));
});

test("missing verifier fails", () => {
  const errors = lintGraph({
    name: "thin",
    goal: "Do something vaguely useful.",
    stop: { maxUsd: 1 },
    nodes: [{ id: "draft", dependsOn: [], owns: [], closer: "model", doneWhen: "" }],
  });
  assert.ok(errors.some((e) => /doneWhen/.test(e)));
});

test("inner loop cannot restart intake", () => {
  const errors = lintGraph({
    name: "restart",
    goal: "Retry the whole swarm because a caption failed.",
    stop: { noProgressSteps: 2 },
    nodes: [
      { id: "intake", dependsOn: [], owns: [], closer: "script", doneWhen: "brief parsed" },
      { id: "draft", dependsOn: ["intake"], owns: [], closer: "model", doneWhen: "caption exists" },
    ],
    loops: [{ id: "inner", nodes: ["draft"], maxAttempts: 2, restarts: ["intake"] }],
  });
  assert.ok(errors.some((e) => /must not restart/.test(e)));
});

test("a retry loop needs an independent declared verifier", () => {
  const errors = lintGraph({
    name: "self-closing-loop",
    goal: "Reject a retry loop in which the model is its own verifier.",
    stop: { noProgressSteps: 2 },
    nodes: [
      { id: "draft", dependsOn: [], owns: ["draft"], closer: "model", doneWhen: "draft exists" },
      { id: "revise", dependsOn: ["draft"], owns: ["draft"], closer: "model", doneWhen: "revision exists" },
    ],
    loops: [{ id: "retry", nodes: ["draft", "revise"], maxAttempts: 2, restarts: [] }],
  });
  assert.ok(errors.some((error) => /non-model verifier/.test(error)));
});

test("loop ids are required and unique", () => {
  const errors = lintGraph({
    name: "loop-identities",
    goal: "Reject ambiguous retry loops with duplicate identifiers.",
    stop: { noProgressSteps: 2 },
    nodes: [
      { id: "draft", dependsOn: [], owns: ["draft"], closer: "model", doneWhen: "draft exists" },
      {
        id: "verify",
        dependsOn: ["draft"],
        owns: ["report"],
        verifies: ["draft"],
        closer: "script",
        doneWhen: "report passes",
      },
    ],
    loops: [
      { id: "retry", nodes: ["draft", "verify"], maxAttempts: 2, restarts: [] },
      { id: "retry", nodes: ["draft", "verify"], maxAttempts: 2, restarts: [] },
    ],
  });
  assert.ok(errors.some((error) => /duplicate loop retry/.test(error)));
});

test("dependency cycles fail", () => {
  const errors = lintGraph({
    name: "cycle",
    goal: "Reject a graph whose dependency structure cannot be scheduled.",
    stop: { noProgressSteps: 2 },
    nodes: [
      { id: "a", dependsOn: ["b"], owns: ["a"], closer: "script", doneWhen: "a completes" },
      { id: "b", dependsOn: ["a"], owns: ["b"], closer: "script", doneWhen: "b completes" },
    ],
  });
  assert.ok(errors.some((error) => /dependency cycle/.test(error)));
  assert.ok(errors.some((error) => /no root node/.test(error)));
});

test("parallel nodes cannot own the same mutable surface", () => {
  const errors = lintGraph({
    name: "parallel-conflict",
    goal: "Detect parallel workers that would overwrite the same output.",
    stop: { noProgressSteps: 2 },
    nodes: [
      { id: "intake", dependsOn: [], owns: ["brief"], closer: "script", doneWhen: "brief parsed" },
      { id: "left", dependsOn: ["intake"], owns: ["src/shared.js"], closer: "model", doneWhen: "left draft exists" },
      { id: "right", dependsOn: ["intake"], owns: ["src/shared.js"], closer: "model", doneWhen: "right draft exists" },
    ],
  });
  assert.ok(errors.some((error) => /parallel ownership conflict/.test(error)));
});

test("parallel parent and child path ownership conflicts", () => {
  const errors = lintGraph({
    name: "path-conflict",
    goal: "Detect parallel workers whose path ownership declarations overlap.",
    stop: { noProgressSteps: 2 },
    nodes: [
      { id: "intake", dependsOn: [], owns: ["brief"], closer: "script", doneWhen: "brief parsed" },
      { id: "left", dependsOn: ["intake"], owns: ["src/"], closer: "model", doneWhen: "left draft exists" },
      { id: "right", dependsOn: ["intake"], owns: ["src/core.js"], closer: "model", doneWhen: "right draft exists" },
    ],
  });
  assert.ok(errors.some((error) => /parallel ownership conflict/.test(error)));
});

test("sequential nodes may deliberately revise the same surface", () => {
  const errors = lintGraph({
    name: "sequential-revision",
    goal: "Allow a later node to revise an earlier node's owned output.",
    stop: { noProgressSteps: 2 },
    nodes: [
      { id: "draft", dependsOn: [], owns: ["src/shared.js"], closer: "model", doneWhen: "draft exists" },
      { id: "revise", dependsOn: ["draft"], owns: ["src/shared.js"], closer: "script", doneWhen: "revision verified" },
    ],
  });
  assert.deepEqual(errors, []);
});

test("declared verifier must be downstream and ownership-independent", () => {
  const errors = lintGraph({
    name: "self-verification",
    goal: "Reject a verifier that edits the same surface it claims to check.",
    stop: { noProgressSteps: 2 },
    nodes: [
      { id: "produce", dependsOn: [], owns: ["src/core.js"], closer: "model", doneWhen: "core exists" },
      {
        id: "verify",
        dependsOn: ["produce"],
        owns: ["src/core.js"],
        verifies: ["produce", "verify"],
        closer: "script",
        doneWhen: "verification passes",
      },
    ],
  });
  assert.ok(errors.some((error) => /verifier owns producer surface/.test(error)));
  assert.ok(errors.some((error) => /verifier cannot verify itself/.test(error)));
});

test("duplicate dependencies and disconnected cycle components fail", () => {
  const errors = lintGraph({
    name: "unreachable",
    goal: "Reject invalid dependency declarations and unreachable components.",
    stop: { noProgressSteps: 2 },
    nodes: [
      { id: "root", dependsOn: [], owns: ["root"], closer: "script", doneWhen: "root completes" },
      { id: "child", dependsOn: ["root", "root"], owns: ["child"], closer: "script", doneWhen: "child completes" },
      { id: "x", dependsOn: ["y"], owns: ["x"], closer: "script", doneWhen: "x completes" },
      { id: "y", dependsOn: ["x"], owns: ["y"], closer: "script", doneWhen: "y completes" },
    ],
  });
  assert.ok(errors.some((error) => /duplicate dependency root/.test(error)));
  assert.ok(errors.some((error) => /x: unreachable/.test(error)));
  assert.ok(errors.some((error) => /y: unreachable/.test(error)));
});

test("a loop may restart its own nodes — that is what a retry loop is", () => {
  const errors = lintGraph({
    name: "in-loop-restart",
    goal: "Retry the implement node until its independent verifier passes.",
    stop: { noProgressSteps: 3 },
    nodes: [
      { id: "implement", dependsOn: [], owns: ["src/thing.js"], closer: "model", doneWhen: "the change is written" },
      {
        id: "verify",
        dependsOn: ["implement"],
        owns: [],
        closer: "script",
        verifies: ["implement"],
        doneWhen: "the test suite passes",
      },
    ],
    loops: [{ id: "impl", nodes: ["implement", "verify"], maxAttempts: 3, restarts: ["implement"] }],
  });
  assert.deepEqual(errors, []);
});

test("restarts must name a known node", () => {
  const errors = lintGraph({
    name: "restart-ghost",
    goal: "Reject a retry loop that restarts a node which does not exist.",
    stop: { noProgressSteps: 3 },
    nodes: [
      { id: "implement", dependsOn: [], owns: ["src/thing.js"], closer: "model", doneWhen: "the change is written" },
      {
        id: "verify",
        dependsOn: ["implement"],
        owns: [],
        closer: "script",
        verifies: ["implement"],
        doneWhen: "the test suite passes",
      },
    ],
    loops: [{ id: "impl", nodes: ["implement", "verify"], maxAttempts: 3, restarts: ["ghost"] }],
  });
  assert.ok(errors.some((e) => /restarts unknown node ghost/.test(e)));
});

test("restarts must be an array when present", () => {
  const errors = lintGraph({
    name: "restart-shape",
    goal: "Reject a retry loop whose restarts field is not a list.",
    stop: { noProgressSteps: 3 },
    nodes: [
      { id: "implement", dependsOn: [], owns: ["src/thing.js"], closer: "model", doneWhen: "the change is written" },
      {
        id: "verify",
        dependsOn: ["implement"],
        owns: [],
        closer: "script",
        verifies: ["implement"],
        doneWhen: "the test suite passes",
      },
    ],
    loops: [{ id: "impl", nodes: ["implement", "verify"], maxAttempts: 3, restarts: "implement" }],
  });
  assert.ok(errors.some((e) => /restarts must be an array/.test(e)));
});
