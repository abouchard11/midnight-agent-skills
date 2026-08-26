const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {
  FLOORS,
  assertThisFile,
  checkSentinel,
  statFile,
} = require("./check-sentinel.js");

function writeGateTree(prefix, lintBody, extras = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(root, "companions", "gbrain", "scripts"), { recursive: true });
  fs.writeFileSync(path.join(root, "SKILL.md"), "# fixture\n");
  fs.writeFileSync(path.join(root, "scripts", "lint-graph.js"), lintBody);
  fs.writeFileSync(
    path.join(root, "scripts", "run-graph.js"),
    extras.runGraph || `${"// run-graph fixture line that keeps the byte floor honest\n".repeat(160)}module.exports = {};\n`
  );
  fs.writeFileSync(
    path.join(root, "companions", "gbrain", "scripts", "lint-note.py"),
    extras.lintNote || "#!/usr/bin/env python3\nprint('fixture')\n"
  );
  if (extras.sentinel) {
    fs.writeFileSync(path.join(root, "scripts", "check-sentinel.js"), extras.sentinel);
  }
  return root;
}

function fatLint(tag) {
  const floor = FLOORS["scripts/lint-graph.js"];
  const line = `// ${tag} canonical lint-graph line\n`;
  return line.repeat(floor.minLines + 20) + "module.exports = { lintGraph() { return []; } };\n";
}

test("identical trees are in-sync and share a hash", () => {
  const body = fatLint("same");
  const canonical = writeGateTree("ago-canon-", body);
  const candidate = writeGateTree("ago-copy-", body);
  const report = checkSentinel({ canonicalRoot: canonical, candidateRoot: candidate });
  assert.equal(report.ok, true);
  assert.equal(report.state, "in-sync");
  const lint = report.rows.find((row) => row.rel === "scripts/lint-graph.js");
  assert.equal(lint.candidate.sha256, lint.canonical.sha256);
});

test("assertThisFile accepts a copy whose hash matches canonical", () => {
  const body = fatLint("self");
  const canonical = writeGateTree("ago-self-canon-", body);
  const report = assertThisFile(path.join(canonical, "scripts", "lint-graph.js"), {
    canonicalRoot: canonical,
  });
  assert.equal(report.ok, true);
  assert.deepEqual(report.errors, []);
});

test("a 101-line installed copy fails the floor and the hash", () => {
  const canonical = writeGateTree("ago-stale-canon-", fatLint("canon"));
  const stale = Array.from({ length: 101 }, (_, i) => `// stale line ${i}`).join("\n") + "\n";
  const candidate = writeGateTree("ago-stale-copy-", stale);
  const report = checkSentinel({ canonicalRoot: canonical, candidateRoot: candidate });
  assert.equal(report.ok, false);
  assert.equal(report.state, "drift");
  const lint = report.rows.find((row) => row.rel === "scripts/lint-graph.js");
  assert.ok(lint.errors.some((error) => /lines < floor/.test(error)));
  assert.ok(lint.errors.some((error) => /hash mismatch/.test(error)));

  const self = assertThisFile(path.join(candidate, "scripts", "lint-graph.js"), {
    canonicalRoot: canonical,
  });
  assert.equal(self.ok, false);
  assert.ok(self.errors.some((error) => /lines < floor|!= canonical/.test(error)));
});

test("missing installed gate is not in-sync", () => {
  const canonical = writeGateTree("ago-miss-canon-", fatLint("canon"));
  const candidate = fs.mkdtempSync(path.join(os.tmpdir(), "ago-empty-"));
  fs.writeFileSync(path.join(candidate, "SKILL.md"), "# empty install\n");
  const report = checkSentinel({ canonicalRoot: canonical, candidateRoot: candidate });
  assert.equal(report.ok, false);
  assert.equal(report.state, "missing");
});

test("canonical fixture itself clears the lint-graph floors", () => {
  const canonical = writeGateTree("ago-floor-", fatLint("floor"));
  const stats = statFile(path.join(canonical, "scripts", "lint-graph.js"));
  assert.ok(stats.bytes >= FLOORS["scripts/lint-graph.js"].minBytes);
  assert.ok(stats.lines >= FLOORS["scripts/lint-graph.js"].minLines);
});
