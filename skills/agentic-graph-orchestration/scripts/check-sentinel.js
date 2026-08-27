#!/usr/bin/env node
/**
 * Fail-closed hash check for installed copies of this skill's gates.
 *
 * 2026-08-25: a 101-line installed lint-graph.js passed a graph the
 * canonical 341-line linter rejects. Comparing trees after the fact
 * is a dashboard. This file is the gate: a drifted copy must not
 * be allowed to say PASS.
 *
 * This checker never copies files. Repair is scripts/sync-gates.js — a
 * deliberate, committed release step, never an automatic reaction to drift.
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const SKILL_ROOT = path.resolve(__dirname, "..");

const GATE_RELPATHS = [
  "scripts/lint-graph.js",
  "scripts/run-graph.js",
  "companions/gbrain/scripts/lint-note.py",
];

// Floors sit well above the 2026-08-25 stale copy (~101 lines) and
// below the current canonical. They catch a truncated install even
// when the canonical tree is not on disk.
const FLOORS = {
  "scripts/lint-graph.js": { minBytes: 10000, minLines: 280 },
  "scripts/run-graph.js": { minBytes: 4000, minLines: 120 },
};

function sha256Buffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function statFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const text = buf.toString("utf8");
  return {
    path: filePath,
    bytes: buf.length,
    lines: text.split(/\r?\n/).length,
    sha256: sha256Buffer(buf),
  };
}

function existsGate(root, rel) {
  return fs.existsSync(path.join(root, rel));
}

function looksLikeSkillRoot(root) {
  return existsGate(root, "scripts/lint-graph.js") && fs.existsSync(path.join(root, "SKILL.md"));
}

function resolveCanonical(explicit) {
  if (explicit) return path.resolve(explicit);
  if (process.env.AGO_CANONICAL) return path.resolve(process.env.AGO_CANONICAL);

  const home = process.env.HOME || "";
  const preferred = [
    path.join(home, "projects", "agentic-graph-orchestration"),
    path.join(home, "projects", "hq", "..", "agentic-graph-orchestration"),
  ];
  for (const guess of preferred) {
    const resolved = path.resolve(guess);
    if (looksLikeSkillRoot(resolved)) return resolved;
  }

  // Last resort: this tree. A copy running in isolation still has
  // floor checks; hash compare becomes a no-op against itself.
  if (looksLikeSkillRoot(SKILL_ROOT)) return SKILL_ROOT;
  return null;
}

function floorErrors(rel, stats) {
  const floor = FLOORS[rel];
  if (!floor) return [];
  const errors = [];
  if (stats.bytes < floor.minBytes) {
    errors.push(`${rel}: ${stats.bytes} bytes < floor ${floor.minBytes}`);
  }
  if (stats.lines < floor.minLines) {
    errors.push(`${rel}: ${stats.lines} lines < floor ${floor.minLines}`);
  }
  return errors;
}

function checkPair(rel, canonicalRoot, candidateRoot) {
  const row = {
    rel,
    state: "in-sync",
    detail: "",
    candidate: null,
    canonical: null,
    errors: [],
  };
  const candidatePath = path.join(candidateRoot, rel);
  const canonicalPath = path.join(canonicalRoot, rel);

  if (!fs.existsSync(candidatePath)) {
    row.state = "missing";
    row.detail = "candidate path absent";
    row.errors.push(`${rel}: candidate missing`);
    return row;
  }

  row.candidate = statFile(candidatePath);
  row.errors.push(...floorErrors(rel, row.candidate));

  if (!fs.existsSync(canonicalPath)) {
    row.state = "missing";
    row.detail = "canonical path absent";
    row.errors.push(`${rel}: canonical missing`);
    return row;
  }

  row.canonical = statFile(canonicalPath);
  if (row.candidate.sha256 !== row.canonical.sha256) {
    row.state = "drift";
    row.detail =
      `sha256 ${row.candidate.sha256.slice(0, 12)}… != ` +
      `canonical ${row.canonical.sha256.slice(0, 12)}… ` +
      `(${row.candidate.lines} vs ${row.canonical.lines} lines)`;
    row.errors.push(`${rel}: hash mismatch`);
  } else if (row.errors.length) {
    row.state = "drift";
    row.detail = row.errors.join("; ");
  } else {
    row.detail = `${row.candidate.lines} lines · ${row.candidate.sha256.slice(0, 12)}`;
  }
  return row;
}

function checkSentinel(opts = {}) {
  const candidateRoot = path.resolve(opts.candidateRoot || SKILL_ROOT);
  const canonicalRoot = resolveCanonical(opts.canonicalRoot);

  if (!canonicalRoot) {
    return {
      ok: false,
      state: "missing",
      canonicalRoot: null,
      candidateRoot,
      rows: GATE_RELPATHS.map((rel) => ({
        rel,
        state: "missing",
        detail: "canonical skill root not found",
        errors: [`${rel}: canonical skill root not found`],
      })),
    };
  }

  const rows = [];
  for (const rel of GATE_RELPATHS) {
    rows.push(checkPair(rel, canonicalRoot, candidateRoot));
  }

  const drifted = rows.filter((r) => r.state !== "in-sync");
  return {
    ok: drifted.length === 0,
    state: drifted.some((r) => r.state === "drift")
      ? "drift"
      : drifted.length
        ? "missing"
        : "in-sync",
    canonicalRoot,
    candidateRoot,
    sameTree: path.resolve(canonicalRoot) === path.resolve(candidateRoot),
    rows,
  };
}

function assertThisFile(filePath, opts = {}) {
  const rel = "scripts/lint-graph.js";
  const abs = path.resolve(filePath);
  const stats = statFile(abs);
  const errors = floorErrors(rel, stats);
  const report = {
    ok: errors.length === 0,
    path: abs,
    bytes: stats.bytes,
    lines: stats.lines,
    sha256: stats.sha256,
    errors,
    comparedTo: null,
  };

  const canonicalRoot = resolveCanonical(opts.canonicalRoot);
  if (!canonicalRoot) {
    report.ok = errors.length === 0 && opts.allowUnanchored === true;
    if (!opts.allowUnanchored) {
      report.errors = [...errors, "canonical skill root not found"];
      report.ok = false;
    }
    return report;
  }

  const canonicalPath = path.join(canonicalRoot, rel);
  if (!fs.existsSync(canonicalPath)) {
    report.errors.push("canonical lint-graph.js missing");
    report.ok = false;
    return report;
  }

  const canonical = statFile(canonicalPath);
  report.comparedTo = canonicalPath;
  report.canonicalSha256 = canonical.sha256;
  if (stats.sha256 !== canonical.sha256) {
    report.errors.push(
      `running lint-graph.js sha256 ${stats.sha256.slice(0, 12)} ` +
        `!= canonical ${canonical.sha256.slice(0, 12)} ` +
        `(${stats.lines} vs ${canonical.lines} lines)`
    );
    report.ok = false;
  }
  return report;
}

function formatReport(report) {
  const lines = [
    `sentinel ${report.state.toUpperCase()}`,
    `  canonical: ${report.canonicalRoot || "(missing)"}`,
    `  candidate: ${report.candidateRoot}`,
  ];
  for (const row of report.rows) {
    lines.push(`  ${row.state.padEnd(7)} ${row.rel}  ${row.detail}`);
  }
  return lines.join("\n");
}

function main(argv) {
  const args = argv.slice(2);
  let candidateRoot = SKILL_ROOT;
  let canonicalRoot = undefined;
  let json = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--json") json = true;
    else if (arg === "--candidate" && args[i + 1]) candidateRoot = args[++i];
    else if (arg === "--canonical" && args[i + 1]) canonicalRoot = args[++i];
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "usage: node scripts/check-sentinel.js [--canonical DIR] [--candidate DIR] [--json]\n" +
          "Never copies files. Exit 1 on drift or missing gates.\n"
      );
      return 0;
    } else {
      process.stderr.write(`unknown arg: ${arg}\n`);
      return 2;
    }
  }

  const report = checkSentinel({ canonicalRoot, candidateRoot });
  if (json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else process.stdout.write(`${formatReport(report)}\n`);
  if (!report.ok) {
    process.stderr.write(
      "refusing to treat this install as a gate. repair deliberately: node scripts/sync-gates.js --to <install>\n"
    );
    return 1;
  }
  return 0;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = {
  GATE_RELPATHS,
  FLOORS,
  sha256Buffer,
  statFile,
  resolveCanonical,
  checkSentinel,
  assertThisFile,
  formatReport,
  main,
};
