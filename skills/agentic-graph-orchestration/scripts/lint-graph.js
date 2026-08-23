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
  const nodesById = new Map();
  for (const node of graph.nodes || []) {
    if (!node.id) {
      errors.push("node missing id");
      continue;
    }
    if (ids.has(node.id)) {
      errors.push(`duplicate node ${node.id}`);
    } else {
      ids.add(node.id);
      nodesById.set(node.id, node);
    }

    if (!Array.isArray(node.dependsOn)) {
      errors.push(`${node.id}: dependsOn must be an array`);
    } else {
      const dependencies = new Set();
      for (const dep of node.dependsOn) {
        if (dependencies.has(dep)) errors.push(`${node.id}: duplicate dependency ${dep}`);
        dependencies.add(dep);
        if (dep === node.id) errors.push(`${node.id}: cannot depend on itself`);
      }
    }

    if (!Array.isArray(node.owns)) {
      errors.push(`${node.id}: owns must be an array`);
    } else {
      const surfaces = new Set();
      for (const surface of node.owns) {
        if (typeof surface !== "string" || !surface.trim()) {
          errors.push(`${node.id}: owns entries must be non-empty strings`);
          continue;
        }
        if (surfaces.has(surface)) errors.push(`${node.id}: duplicate owned surface ${surface}`);
        surfaces.add(surface);
      }
    }

    if (node.verifies !== undefined && !Array.isArray(node.verifies)) {
      errors.push(`${node.id}: verifies must be an array when present`);
    }
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
    if (!node || typeof node !== "object" || !node.id) continue;
    for (const dep of Array.isArray(node.dependsOn) ? node.dependsOn : []) {
      if (!ids.has(dep)) errors.push(`${node.id}: depends on unknown node ${dep}`);
    }
  }

  for (const cycle of findDependencyCycles(nodesById)) {
    errors.push(`dependency cycle: ${cycle.join(" -> ")}`);
  }

  const roots = [...nodesById.values()].filter(
    (node) => Array.isArray(node.dependsOn) && node.dependsOn.length === 0
  );
  if (nodesById.size && roots.length === 0) errors.push("graph has no root node");

  const reachable = reachableFromRoots(nodesById, roots);
  for (const id of ids) {
    if (!reachable.has(id)) errors.push(`${id}: unreachable from every root node`);
  }

  const ancestors = dependencyAncestors(nodesById);
  const ownership = new Map();
  for (const node of nodesById.values()) {
    for (const surface of Array.isArray(node.owns) ? node.owns : []) {
      if (typeof surface !== "string" || !surface.trim()) continue;
      const owners = ownership.get(surface) || [];
      owners.push(node.id);
      ownership.set(surface, owners);
    }
  }
  for (const [surface, owners] of ownership) {
    for (let left = 0; left < owners.length; left += 1) {
      for (let right = left + 1; right < owners.length; right += 1) {
        const a = owners[left];
        const b = owners[right];
        const ordered = ancestors.get(a)?.has(b) || ancestors.get(b)?.has(a);
        if (!ordered) {
          errors.push(`parallel ownership conflict: ${a} and ${b} both own ${surface}`);
        }
      }
    }
  }

  for (const node of nodesById.values()) {
    if (!Array.isArray(node.verifies)) continue;
    const verified = new Set();
    for (const targetId of node.verifies) {
      if (verified.has(targetId)) errors.push(`${node.id}: duplicate verifies target ${targetId}`);
      verified.add(targetId);
      if (targetId === node.id) {
        errors.push(`${node.id}: verifier cannot verify itself`);
        continue;
      }
      const target = nodesById.get(targetId);
      if (!target) {
        errors.push(`${node.id}: verifies unknown node ${targetId}`);
        continue;
      }
      if (!ancestors.get(node.id)?.has(targetId)) {
        errors.push(`${node.id}: verifier must depend on ${targetId}`);
      }
      const targetOwns = new Set(Array.isArray(target.owns) ? target.owns : []);
      const overlap = (Array.isArray(node.owns) ? node.owns : []).filter((surface) => targetOwns.has(surface));
      if (overlap.length) {
        errors.push(`${node.id}: verifier owns producer surface(s): ${overlap.join(", ")}`);
      }
    }
  }

  if (graph.loops !== undefined && !Array.isArray(graph.loops)) {
    errors.push("loops must be an array");
  }
  for (const loop of Array.isArray(graph.loops) ? graph.loops : []) {
    if (!(Number.isInteger(loop.maxAttempts) && loop.maxAttempts > 0)) {
      errors.push(`${loop.id || "loop"}: maxAttempts required`);
    }
    if (!Array.isArray(loop.nodes) || loop.nodes.length === 0) {
      errors.push(`${loop.id || "loop"}: nodes must be a non-empty array`);
    }
    const loopNodes = new Set();
    for (const id of Array.isArray(loop.nodes) ? loop.nodes : []) {
      if (loopNodes.has(id)) errors.push(`${loop.id || "loop"}: duplicate node ${id}`);
      loopNodes.add(id);
      if (!ids.has(id)) errors.push(`${loop.id || "loop"}: unknown node ${id}`);
    }
    if (Array.isArray(loop.restarts) && loop.restarts.length) {
      errors.push(`${loop.id || "loop"}: inner loops must not restart outer nodes (${loop.restarts.join(", ")})`);
    }
  }

  return errors;
}

function findDependencyCycles(nodesById) {
  const state = new Map();
  const stack = [];
  const cycles = [];
  const seen = new Set();

  function visit(id) {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      const start = stack.lastIndexOf(id);
      const cycle = [...stack.slice(start), id];
      const key = cycle.join(" -> ");
      if (!seen.has(key)) {
        seen.add(key);
        cycles.push(cycle);
      }
      return;
    }

    state.set(id, 1);
    stack.push(id);
    const node = nodesById.get(id);
    for (const dep of Array.isArray(node?.dependsOn) ? node.dependsOn : []) {
      if (nodesById.has(dep)) visit(dep);
    }
    stack.pop();
    state.set(id, 2);
  }

  for (const id of nodesById.keys()) visit(id);
  return cycles;
}

function reachableFromRoots(nodesById, roots) {
  const dependents = new Map([...nodesById.keys()].map((id) => [id, []]));
  for (const node of nodesById.values()) {
    for (const dep of Array.isArray(node.dependsOn) ? node.dependsOn : []) {
      if (dependents.has(dep)) dependents.get(dep).push(node.id);
    }
  }

  const reachable = new Set();
  const queue = roots.map((node) => node.id);
  while (queue.length) {
    const id = queue.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const dependent of dependents.get(id) || []) queue.push(dependent);
  }
  return reachable;
}

function dependencyAncestors(nodesById) {
  const result = new Map();
  for (const id of nodesById.keys()) {
    const seen = new Set();
    const stack = [...(Array.isArray(nodesById.get(id).dependsOn) ? nodesById.get(id).dependsOn : [])];
    while (stack.length) {
      const dep = stack.pop();
      if (seen.has(dep) || !nodesById.has(dep)) continue;
      seen.add(dep);
      stack.push(...(Array.isArray(nodesById.get(dep).dependsOn) ? nodesById.get(dep).dependsOn : []));
    }
    result.set(id, seen);
  }
  return result;
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
