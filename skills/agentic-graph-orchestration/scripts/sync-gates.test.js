const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { syncGates } = require("./sync-gates.js");

test("sync produces an install the sentinel accepts", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "ago-sync-"));
  try {
    const { copied, report } = syncGates({ to: target });
    assert.ok(copied.includes(path.join("scripts", "lint-graph.js")));
    assert.equal(report.ok, true, "synced install must be in-sync");
    assert.equal(report.state, "in-sync");
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test("refuses to sync a tree onto itself", () => {
  const root = path.resolve(__dirname, "..");
  assert.throws(() => syncGates({ to: root }), /onto itself/);
});
