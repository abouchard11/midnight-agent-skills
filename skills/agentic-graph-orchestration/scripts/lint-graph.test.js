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
