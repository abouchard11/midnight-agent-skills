/**
 * Script-held graph runtime.
 * Lint first. The script owns the loop. The model does not own irreversible edges.
 */
const { lintGraph, IRREVERSIBLE_IDS } = require("./lint-graph.js");

function isIrreversible(node) {
  if (node.irreversible === true) return true;
  const id = String(node.id || "").toLowerCase();
  if (IRREVERSIBLE_IDS && IRREVERSIBLE_IDS.has(id)) return true;
  return /^(accept|post|pay|publish|transfer|delete|merge|deploy|remember|forget|persist)(?:[-_:]|$)/.test(id);
}

function startRun(graph, now = Date.now()) {
  const errors = lintGraph(graph);
  if (errors.length) {
    throw new Error(`graph failed lint:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
  const status = {};
  const attempt = {};
  for (const node of graph.nodes) {
    status[node.id] = "queued";
    attempt[node.id] = 0;
  }
  const loopAttempts = {};
  for (const loop of graph.loops || []) loopAttempts[loop.id] = 0;
  return {
    graph,
    status,
    evidence: {},
    attempt,
    loopAttempts,
    startedAt: now,
    spentUsd: 0,
    noProgressSteps: 0,
    halted: null,
    finished: false,
    logs: [{ t: now, msg: `Graph ${graph.name} started.` }],
  };
}

function depsMet(run, node) {
  return (node.dependsOn || []).every((id) => run.status[id] === "passed");
}

function readyNodes(run) {
  return run.graph.nodes.filter((node) => run.status[node.id] === "queued" && depsMet(run, node));
}

function stopReason(run, now) {
  const stop = run.graph.stop || {};
  const wallMin = (now - run.startedAt) / 60000;
  if (stop.maxWallMinutes > 0 && wallMin >= stop.maxWallMinutes) return "Time limit reached.";
  if (stop.maxUsd > 0 && run.spentUsd >= stop.maxUsd) return "Spend limit reached.";
  if (stop.noProgressSteps > 0 && run.noProgressSteps >= stop.noProgressSteps) {
    return "No-progress detector. Same verifier failure, no new evidence.";
  }
  return null;
}

function cloneRun(run) {
  return {
    ...run,
    status: { ...run.status },
    evidence: { ...run.evidence },
    attempt: { ...run.attempt },
    loopAttempts: { ...run.loopAttempts },
    logs: [...run.logs],
    halted: run.halted ? { ...run.halted } : null,
  };
}

function loopForNode(graph, nodeId) {
  return (graph.loops || []).find((loop) => (loop.nodes || []).includes(nodeId));
}

function restartLoop(next, loop, failedId, now) {
  next.loopAttempts[loop.id] = (next.loopAttempts[loop.id] || 0) + 1;
  for (const id of loop.nodes || []) {
    if (id === failedId || next.status[id] !== "passed") {
      next.status[id] = "queued";
    }
  }
  next.status[failedId] = "queued";
  next.noProgressSteps += 1;
  next.logs.push({
    t: now,
    msg: `Retry ${loop.id} ${next.loopAttempts[loop.id]}/${loop.maxAttempts}. Failed: ${failedId}.`,
  });
}

function tick(run, opts = {}) {
  const now = opts.now ?? Date.now();
  const handlers = opts.handlers ?? {};
  if (run.finished) return run;
  if (run.halted && run.halted.closer === "stop") return run;

  const stopped = stopReason(run, now);
  if (stopped) {
    const next = cloneRun(run);
    next.halted = { nodeId: null, closer: "stop", reason: stopped };
    next.logs.push({ t: now, msg: `Stopped: ${stopped}` });
    return next;
  }

  const next = cloneRun(run);
  if (next.halted && next.halted.closer !== "stop") {
    // Waiting on human/policy. Do not advance dependents.
    return next;
  }

  const ready = readyNodes(next);
  if (ready.length === 0) {
    const pending = next.graph.nodes.filter((node) => next.status[node.id] !== "passed");
    if (pending.length === 0) {
      next.finished = true;
      next.logs.push({ t: now, msg: "Graph complete. Only verified nodes passed." });
    }
    return next;
  }

  for (const node of ready) {
    const irreversible = isIrreversible(node);
    if (node.closer === "model" && irreversible) {
      throw new Error(`${node.id}: model cannot close an irreversible edge`);
    }
    if (node.closer === "human" || node.closer === "policy") {
      next.status[node.id] = "gate";
      next.halted = {
        nodeId: node.id,
        closer: node.closer,
        reason: `${node.id} stays open until a ${node.closer} closes it`,
      };
      next.logs.push({ t: now, msg: next.halted.reason });
      return next;
    }

    const handler = handlers[node.id];
    let result;
    if (typeof handler === "function") {
      result = handler(next, node);
    } else if (node.closer === "script") {
      result = { ok: false, evidence: `${node.id}: no script handler. Fail-closed.` };
    } else {
      result = { ok: true, evidence: `${node.id}: model increment` };
    }

    next.attempt[node.id] += 1;
    next.spentUsd = Number((next.spentUsd + (result.costUsd || 0)).toFixed(4));
    if (result.ok) {
      next.status[node.id] = "passed";
      next.evidence[node.id] = result.evidence || node.doneWhen;
      next.noProgressSteps = 0;
      next.logs.push({ t: now, msg: `Passed: ${node.id} · ${next.evidence[node.id]}` });
    } else {
      next.status[node.id] = "failed";
      next.evidence[node.id] = result.evidence || "verifier failed";
      const loop = loopForNode(next.graph, node.id);
      const max = loop?.maxAttempts || 1;
      const used = next.loopAttempts[loop?.id] || 0;
      if (loop && used + 1 < max) {
        restartLoop(next, loop, node.id, now);
      } else {
        next.halted = {
          nodeId: node.id,
          closer: "stop",
          reason: `${node.id} failed. Max attempts. Human tie-breaker.`,
        };
        next.logs.push({ t: now, msg: next.halted.reason });
        return next;
      }
    }
  }

  if (next.graph.nodes.every((node) => next.status[node.id] === "passed")) {
    next.finished = true;
    next.logs.push({ t: now, msg: "Graph complete. Only verified nodes passed." });
  }
  return next;
}

function closeNode(run, nodeId, opts = {}) {
  const now = opts.now ?? Date.now();
  const closer = opts.closer;
  const node = run.graph.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`unknown node ${nodeId}`);
  if (run.status[nodeId] !== "gate") {
    throw new Error(`${nodeId} is not waiting on a closer`);
  }
  if (closer !== node.closer) {
    throw new Error(`${nodeId} requires closer ${node.closer}, got ${closer}`);
  }
  if (closer === "model") {
    throw new Error(`${nodeId}: model cannot close a gated node`);
  }
  const next = cloneRun(run);
  next.status[nodeId] = "passed";
  next.evidence[nodeId] = opts.evidence || `${closer} closed ${nodeId}`;
  next.halted = null;
  next.logs.push({ t: now, msg: `Closed: ${nodeId} by ${closer}` });
  return next;
}

function drive(graph, opts = {}) {
  let run = startRun(graph, opts.now ?? Date.now());
  const maxTicks = opts.maxTicks ?? graph.nodes.length * 4;
  for (let i = 0; i < maxTicks; i++) {
    const prev = run;
    run = tick(run, opts);
    if (run.finished) return run;
    if (run.halted) return run;
    if (run === prev) return run;
  }
  return run;
}

if (require.main === module) {
  const fs = require("node:fs");
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node scripts/run-graph.js <graph.json>");
    process.exit(2);
  }
  const graph = JSON.parse(fs.readFileSync(file, "utf8"));
  const run = drive(graph);
  const halted = run.halted ? `${run.halted.nodeId || "stop"}: ${run.halted.reason}` : "none";
  console.log(JSON.stringify({ name: graph.name, finished: run.finished, halted, status: run.status }, null, 2));
  process.exit(run.finished ? 0 : 2);
}

module.exports = { startRun, tick, closeNode, drive, isIrreversible };
