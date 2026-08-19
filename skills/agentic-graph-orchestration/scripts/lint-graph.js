#!/usr/bin/env node
/**
 * Fail a graph that cheats.
 *
 * A valid graph has a goal, a stop condition, nodes with verifiers and closers,
 * and never lets the model own an irreversible edge.
 */

const IRREVERSIBLE_IDS = new Set([
  "accept",
  "post",
  "pay",
  "publish",
  "transfer",
  "delete",
  "merge",
  "safety",
  "deploy",
  "remember",
  "forget",
  "persist",
]);

const CLOSERS = new Set(["model", "human", "policy", "script"]);

function lintGraph(graph) {
  const errors = [];
  if (!graph || typeof graph !== "object") return ["graph must be an object"];
  if (!graph.name) errors.push("missing name");
  if (!graph.goal || String(graph.goal).trim().length < 12) errors.push("goal must be a real sentence");
  if (!graph.stop || typeof graph.stop !== "object") {
    errors.push("missing stop condition");
  } else {
    if (!(graph.stop.maxWallMinutes > 0 || graph.stop.maxUsd > 0 || graph.stop.noProgressSteps > 0)) {
      errors.push("stop needs maxWallMinutes, maxUsd, or noProgressSteps");
    }
  }
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) errors.push("nodes[] is empty");

  const ids = new Set();
  for (const node of graph.nodes || []) {
    if (!node.id) {
      errors.push("node missing id");
      continue;
    }
    if (ids.has(node.id)) errors.push(`duplicate node ${node.id}`);
    ids.add(node.id);
    if (!Array.isArray(node.dependsOn)) errors.push(`${node.id}: dependsOn must be an array`);
    if (!Array.isArray(node.owns)) errors.push(`${node.id}: owns must be an array`);
    if (!node.doneWhen || String(node.doneWhen).trim().length < 8) {
      errors.push(`${node.id}: missing doneWhen verifier`);
    }
    if (!CLOSERS.has(node.closer)) errors.push(`${node.id}: closer must be model|human|policy|script`);
    const forced = node.irreversible === true || IRREVERSIBLE_IDS.has(node.id);
    if (forced && node.closer === "model") {
      errors.push(`${node.id}: irreversible edge cannot be closed by the model`);
    }
  }

  for (const node of graph.nodes || []) {
    for (const dep of node.dependsOn || []) {
      if (!ids.has(dep)) errors.push(`${node.id}: depends on unknown node ${dep}`);
    }
  }

  for (const loop of graph.loops || []) {
    if (!(loop.maxAttempts > 0)) errors.push(`${loop.id || "loop"}: maxAttempts required`);
    for (const id of loop.nodes || []) {
      if (!ids.has(id)) errors.push(`${loop.id || "loop"}: unknown node ${id}`);
    }
    if (Array.isArray(loop.restarts) && loop.restarts.length) {
      errors.push(`${loop.id || "loop"}: inner loops must not restart outer nodes (${loop.restarts.join(", ")})`);
    }
  }

  return errors;
}

function loadAndLint(filePath) {
  const fs = require("node:fs");
  const raw = fs.readFileSync(filePath, "utf8");
  const graph = JSON.parse(raw);
  return lintGraph(graph);
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node scripts/lint-graph.js <graph.json>");
    process.exit(2);
  }
  const errors = loadAndLint(file);
  if (errors.length) {
    console.error(`FAIL ${file}`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  console.log(`PASS ${file}`);
}

module.exports = { lintGraph, loadAndLint, IRREVERSIBLE_IDS };
