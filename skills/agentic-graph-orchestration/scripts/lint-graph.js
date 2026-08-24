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

// Node ids are prose, so exact-name checks are too easy to evade accidentally.
// Keep this list deliberately narrow: infer consequence from clear verb/object
// compounds, while leaving ambiguous implementation verbs (build, write, run)
// to the explicit `irreversible: true` declaration.
const IRREVERSIBLE_ID_PATTERNS = [
  /^(?:accept|post|pay|publish|transfer|delete|merge|deploy|remember|forget|persist)(?:[-_:]|$)/,
  /^(?:release|issue|trigger)[-_:](?:payout|payment|refund)(?:[-_:]|$)/,
  /^(?:place|submit|execute|cancel)[-_:](?:order|trade)(?:[-_:]|$)/,
  /^send[-_:](?:email|message|notification)(?:[-_:]|$)/,
  /^(?:store|write)[-_:](?:memory|brain|ledger|database|db)(?:[-_:]|$)/,
  /^approve[-_:](?:transfer|payment|payout|refund|order|trade|publish|post|deploy|merge)(?:[-_:]|$)/,
];

const CLOSERS = new Set(["model", "human", "policy", "script"]);

function inferredIrreversibleId(id) {
  const normalized = String(id || "").trim().toLowerCase();
  return IRREVERSIBLE_IDS.has(normalized)
    || IRREVERSIBLE_ID_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeSurface(surface) {
  return String(surface).trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");
}

function surfaceOverlap(left, right) {
  const a = normalizeSurface(left);
  const b = normalizeSurface(right);
  if (a === b) return true;

  // Only infer parent/child overlap for path-shaped ownership declarations.
  // Semantic labels such as `policy` and `policy_result` remain independent.
  const pathLike = (value) => value.includes("/") || value.endsWith("/**");
  if (!pathLike(a) || !pathLike(b)) return false;
  const prefix = (value) => value.replace(/\/\*\*$/, "/").replace(/\/$/, "") + "/";
  return b.startsWith(prefix(a)) || a.startsWith(prefix(b));
}

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
    if (node.irreversible !== undefined && typeof node.irreversible !== "boolean") {
      errors.push(`${node.id}: irreversible must be a boolean when present`);
    }
    if (!node.doneWhen || String(node.doneWhen).trim().length < 8) {
      errors.push(`${node.id}: missing doneWhen verifier`);
    }
    if (!CLOSERS.has(node.closer)) errors.push(`${node.id}: closer must be model|human|policy|script`);
    const forced = node.irreversible === true || inferredIrreversibleId(node.id);
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
  const ownedSurfaces = [];
  for (const node of nodesById.values()) {
    for (const surface of Array.isArray(node.owns) ? node.owns : []) {
      if (typeof surface === "string" && surface.trim()) {
        ownedSurfaces.push({ nodeId: node.id, surface });
      }
    }
  }
  for (let left = 0; left < ownedSurfaces.length; left += 1) {
    for (let right = left + 1; right < ownedSurfaces.length; right += 1) {
      const a = ownedSurfaces[left];
      const b = ownedSurfaces[right];
      if (a.nodeId === b.nodeId || !surfaceOverlap(a.surface, b.surface)) continue;
      const ordered = ancestors.get(a.nodeId)?.has(b.nodeId) || ancestors.get(b.nodeId)?.has(a.nodeId);
      if (!ordered) {
        errors.push(
          `parallel ownership conflict: ${a.nodeId} owns ${a.surface}; ${b.nodeId} owns ${b.surface}`
        );
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
      const targetOwns = Array.isArray(target.owns) ? target.owns : [];
      const overlap = (Array.isArray(node.owns) ? node.owns : []).filter((surface) =>
        targetOwns.some((targetSurface) => surfaceOverlap(surface, targetSurface))
      );
      if (overlap.length) {
        errors.push(`${node.id}: verifier owns producer surface(s): ${overlap.join(", ")}`);
      }
    }
  }

  if (graph.loops !== undefined && !Array.isArray(graph.loops)) {
    errors.push("loops must be an array");
  }
  const loopIds = new Set();
  for (const loop of Array.isArray(graph.loops) ? graph.loops : []) {
    if (!loop.id || typeof loop.id !== "string") {
      errors.push("loop missing id");
    } else if (loopIds.has(loop.id)) {
      errors.push(`duplicate loop ${loop.id}`);
    } else {
      loopIds.add(loop.id);
    }
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

    const hasIndependentVerifier = [...loopNodes].some((id) => {
      const node = nodesById.get(id);
      if (!node || node.closer === "model" || !Array.isArray(node.verifies)) return false;
      return node.verifies.some((targetId) => loopNodes.has(targetId));
    });
    if (loopNodes.size && !hasIndependentVerifier) {
      errors.push(`${loop.id || "loop"}: loop needs a non-model verifier with verifies[] targeting a loop node`);
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

module.exports = {
  lintGraph,
  loadAndLint,
  IRREVERSIBLE_IDS,
  IRREVERSIBLE_ID_PATTERNS,
  inferredIrreversibleId,
  surfaceOverlap,
};
