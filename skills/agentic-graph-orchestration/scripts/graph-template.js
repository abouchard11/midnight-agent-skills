/**
 * Script-held orchestration skeleton.
 * The script owns the loop and intermediate state; agents do the work.
 * Irreversible nodes must be closed by a human or a policy, not by the model.
 */

async function runGraph(nodes, order, hooks = {}) {
  const state = {};
  for (const name of order) {
    const node = nodes[name];
    if (!node) throw new Error(`unknown node ${name}`);
    if (node.closer === "model" && node.irreversible) {
      throw new Error(`${name}: model cannot close an irreversible edge`);
    }
    if (node.closer === "human" || node.closer === "policy") {
      const close = hooks[name];
      if (typeof close !== "function") {
        state[name] = { status: "running", reason: `${name} stays open until a ${node.closer} closes it` };
        return { halted: name, state };
      }
    }
    let attempts = 0;
    const maxAttempts = node.maxAttempts || 1;
    while (attempts < maxAttempts) {
      try {
        state[name] = await node.run(state);
        break;
      } catch (error) {
        attempts += 1;
        if (attempts >= maxAttempts) throw error;
      }
    }
  }
  return { halted: null, state };
}

async function runVerifier() {
  return { pass: true, reason: "ok" };
}

module.exports = { runGraph, runVerifier };
