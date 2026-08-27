#!/usr/bin/env node
/**
 * Deliberate gate release: copy the canonical skill tree over an install,
 * then prove the result in-sync with the same sentinel that gates it.
 *
 * The invariant was never "a human must type cp" — it is that a drifted
 * gate must not quietly become in-sync. So: the checker never copies, this
 * script never runs automatically on drift, and the caller's commit is the
 * release record. Extra files in the install are left alone (no deletes).
 */

const fs = require("node:fs");
const path = require("node:path");
const { checkSentinel, formatReport } = require("./check-sentinel");

const EXCLUDE = new Set([".git", "node_modules", ".DS_Store", ".planning"]);

function syncTree(fromRoot, toRoot) {
  const copied = [];
  const walk = (rel) => {
    for (const entry of fs.readdirSync(path.join(fromRoot, rel), { withFileTypes: true })) {
      if (EXCLUDE.has(entry.name)) continue;
      const childRel = path.join(rel, entry.name);
      const from = path.join(fromRoot, childRel);
      const to = path.join(toRoot, childRel);
      if (entry.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        walk(childRel);
      } else if (entry.isFile()) {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
        copied.push(childRel);
      }
    }
  };
  walk(".");
  return copied;
}

function syncGates(opts = {}) {
  const fromRoot = path.resolve(opts.from || path.resolve(__dirname, ".."));
  const toRoot = path.resolve(opts.to);
  if (!fs.existsSync(path.join(fromRoot, "scripts", "lint-graph.js"))) {
    throw new Error(`${fromRoot} does not look like the skill root`);
  }
  if (fromRoot === toRoot) {
    throw new Error("refusing to sync a tree onto itself");
  }
  const copied = syncTree(fromRoot, toRoot);
  const report = checkSentinel({ canonicalRoot: fromRoot, candidateRoot: toRoot });
  return { fromRoot, toRoot, copied, report };
}

function main(argv) {
  const args = argv.slice(2);
  let to = null;
  let from = undefined;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--to" && args[i + 1]) to = args[++i];
    else if (arg === "--from" && args[i + 1]) from = args[++i];
    else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "usage: node scripts/sync-gates.js --to INSTALL_DIR [--from CANONICAL_DIR]\n" +
          "Copies the skill tree, then re-runs the sentinel on the result.\n"
      );
      return 0;
    } else {
      process.stderr.write(`unknown arg: ${arg}\n`);
      return 2;
    }
  }
  if (!to) {
    process.stderr.write("--to INSTALL_DIR is required\n");
    return 2;
  }
  const { copied, report } = syncGates({ to, from });
  process.stdout.write(`synced ${copied.length} files\n${formatReport(report)}\n`);
  return report.ok ? 0 : 1;
}

if (require.main === module) {
  process.exit(main(process.argv));
}

module.exports = { syncGates, syncTree };
