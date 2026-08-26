#!/usr/bin/env node
const path = require("node:path");
require("./preflight-sentinel").rejectIfDrifted(path.join(__dirname, "lint-graph.js"));
const { loadAndLint } = require("./lint-graph");
const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/lint.js <graph.json>");
  process.exit(2);
}
const errors = loadAndLint(file);
if (errors.length) {
  console.error(`FAIL ${file}`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`PASS ${file}`);
