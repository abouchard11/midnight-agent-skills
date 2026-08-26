const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { preflightSentinel } = require("./preflight-sentinel");

test("canonical lint-graph.js matches itself", () => {
  const gate = preflightSentinel(path.join(__dirname, "lint-graph.js"));
  assert.equal(gate.ok, true);
  assert.equal(gate.errors.length, 0);
});

test("truncated lint-graph.js fails the floor", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "preflight-"));
  const stale = path.join(dir, "lint-graph.js");
  fs.writeFileSync(stale, "// stale\n".repeat(101));
  const gate = preflightSentinel(stale);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some((error) => /floor|hash mismatch|sha256/.test(error)));
});
