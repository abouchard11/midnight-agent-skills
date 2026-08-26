const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { startRun, tick, closeNode, drive } = require("./run-graph.js");

const coding = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../examples/coding-loop.json"), "utf8"),
);
const dozen = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../examples/dozen-graph.json"), "utf8"),
);

const pass = {
  implement: () => ({ ok: true, evidence: "tests exist" }),
  verify: () => ({ ok: true, evidence: "CLEAN_PASS" }),
};

test("unlintable graphs never start", () => {
  assert.throws(() => startRun({ name: "x", goal: "nope", nodes: [] }), /failed lint/);
});

test("coding-loop gates on plan — model cannot skip the human", () => {
  const run = drive(coding, { handlers: pass });
  assert.equal(run.finished, false);
  assert.equal(run.status.plan, "gate");
  assert.equal(run.status.implement, "queued");
  assert.equal(run.halted.closer, "human");
});

function untilHalt(run, opts = {}) {
  for (let i = 0; i < 12; i++) {
    const next = tick(run, opts);
    if (next.finished || next.halted) return next;
    if (JSON.stringify(next.status) === JSON.stringify(run.status)) return next;
    run = next;
  }
  return run;
}

test("after plan, implement+verify pass and merge stays open", () => {
  let run = startRun(coding);
  run = tick(run, { handlers: pass });
  run = closeNode(run, "plan", { closer: "human", evidence: "criteria written" });
  run = untilHalt(run, { handlers: pass });
  assert.equal(run.status.implement, "passed");
  assert.equal(run.status.verify, "passed");
  assert.equal(run.status.merge, "gate");
  assert.equal(run.finished, false);
});

test("model cannot close merge", () => {
  let run = startRun(coding);
  run = tick(run);
  run = closeNode(run, "plan", { closer: "human" });
  run = untilHalt(run, { handlers: pass });
  assert.throws(() => closeNode(run, "merge", { closer: "model" }), /requires closer human/);
});

test("human merge finishes the coding loop", () => {
  let run = startRun(coding);
  run = tick(run);
  run = closeNode(run, "plan", { closer: "human" });
  run = untilHalt(run, { handlers: pass });
  run = closeNode(run, "merge", { closer: "human", evidence: "diff understood" });
  run = tick(run, { handlers: pass });
  assert.equal(run.finished, true);
  assert.equal(run.status.merge, "passed");
});

test("verify failure retries implement-verify, not plan", () => {
  let run = startRun(coding);
  run = tick(run);
  run = closeNode(run, "plan", { closer: "human" });
  let blows = 0;
  const handlers = {
    implement: () => ({ ok: true, evidence: "tests exist" }),
    verify: () => {
      blows += 1;
      return blows < 2 ? { ok: false, evidence: "RED" } : { ok: true, evidence: "CLEAN_PASS" };
    },
  };
  run = tick(run, { handlers });
  run = tick(run, { handlers });
  assert.equal(run.status.plan, "passed");
  assert.equal(run.status.verify, "queued");
  run = tick(run, { handlers });
  run = tick(run, { handlers });
  assert.equal(run.status.verify, "passed");
  assert.equal(run.loopAttempts["implement-verify"], 1);
});

test("dozen safety then accept stay open — model handlers cannot close them", () => {
  const handlers = Object.fromEntries(
    dozen.nodes
      .filter((n) => n.closer === "model" || n.closer === "script")
      .map((n) => [n.id, () => ({ ok: true, evidence: `${n.id} ok` })]),
  );
  let run = drive(dozen, { handlers, maxTicks: 20 });
  assert.equal(run.status.safety, "gate");
  run = closeNode(run, "safety", { closer: "policy", evidence: "verticals clean" });
  run = driveTick(run, { handlers, maxTicks: 8 });
  assert.equal(run.status.accept, "gate");
  assert.equal(run.finished, false);
  assert.throws(() => closeNode(run, "accept", { closer: "model" }), /requires closer human/);
});

function driveTick(run, opts) {
  const max = opts.maxTicks ?? 8;
  for (let i = 0; i < max; i++) {
    const next = tick(run, opts);
    if (next.finished || next.halted) return next;
    run = next;
  }
  return run;
}
