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

test("--prune removes install files canonical would never ship", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "ago-prune-"));
  try {
    syncGates({ to: target });
    // A stale file from an older sync, and a directory now excluded from shipping.
    const stray = path.join(target, "scripts", "old-gate.js");
    const excluded = path.join(target, ".planning", "IP-CONSTRAINTS.md");
    fs.writeFileSync(stray, "// removed upstream\n");
    fs.mkdirSync(path.dirname(excluded), { recursive: true });
    fs.writeFileSync(excluded, "sealed operator notes\n");

    const { removed, report } = syncGates({ to: target, prune: true });

    assert.equal(fs.existsSync(stray), false, "stale gate file must be pruned");
    assert.equal(fs.existsSync(excluded), false, "excluded-directory file must be pruned");
    assert.ok(removed.some((r) => r.endsWith("old-gate.js")), "removal is reported");
    assert.equal(fs.existsSync(path.join(target, "scripts", "lint-graph.js")), true, "gates survive");
    assert.equal(report.ok, true, "pruned install still passes the sentinel");
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test("prune never touches the install's own git or deps", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "ago-prune-safe-"));
  try {
    syncGates({ to: target });
    fs.mkdirSync(path.join(target, ".git"), { recursive: true });
    fs.writeFileSync(path.join(target, ".git", "HEAD"), "ref: refs/heads/main\n");
    fs.mkdirSync(path.join(target, "node_modules", "x"), { recursive: true });
    fs.writeFileSync(path.join(target, "node_modules", "x", "index.js"), "\n");
    syncGates({ to: target, prune: true });
    assert.equal(fs.existsSync(path.join(target, ".git", "HEAD")), true, ".git must survive");
    assert.equal(fs.existsSync(path.join(target, "node_modules", "x", "index.js")), true, "node_modules must survive");
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
});

test("refuses to sync a tree onto itself", () => {
  const root = path.resolve(__dirname, "..");
  assert.throws(() => syncGates({ to: root }), /onto itself/);
});
