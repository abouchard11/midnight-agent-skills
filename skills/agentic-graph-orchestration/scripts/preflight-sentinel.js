#!/usr/bin/env node
const path = require("node:path");

function preflightSentinel(lintGraphPath) {
  let assertThisFile;
  try {
    ({ assertThisFile } = require("./check-sentinel"));
  } catch (err) {
    return {
      ok: false,
      errors: [
        "check-sentinel.js missing next to this linter",
        err.message,
      ],
    };
  }
  return assertThisFile(path.resolve(lintGraphPath));
}

function rejectIfDrifted(lintGraphPath) {
  const gate = preflightSentinel(lintGraphPath);
  if (gate.ok) return gate;
  console.error("FAIL sentinel");
  for (const error of gate.errors || []) console.error(`  - ${error}`);
  process.exit(1);
  return gate;
}

module.exports = { preflightSentinel, rejectIfDrifted };
