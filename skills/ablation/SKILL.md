---
name: ablation
description: "Run a controlled comparison to assess whether optional prompts, tools, or skills improve agent task outcomes. Use for model upgrades, regressions, or agent workflow reviews."
version: 0.1.0
metadata:
  type: workflow
  lifecycle: draft
---

# Ablation

Use this procedure to evaluate optional scaffolding. It is a measurement plan, not an instruction to remove live controls.

## Guardrails

- Keep security checks, privacy controls, human approval gates, access boundaries, and required verification intact in every condition.
- Never disable production hooks, automations, or enforcement. Work from an isolated copy or test configuration that cannot affect live users or data.
- Preserve the full baseline configuration and a rollback copy. Record every change; do not overwrite the source setup.
- Make no changes to a shared agent, account, or service without authorization from its owner.

## Method

1. **Scope the question.** Name the optional component and the claim being tested. Identify an owner, an isolated environment, and tasks that represent the intended use. Do not test by removing several components at once.
2. **Pre-register the comparison.** Fix the task set, model/provider/version, system context, tool availability, sampling settings, time window, repetition count, and scoring rubric before running. Use the same task inputs for baseline and treatment. If randomness cannot be controlled, record that limitation and repeat trials.
3. **Capture baseline.** Save the configuration by version or copy, raw outputs, task-level scores, completion/failure status, elapsed time, and available token or cost measurements. Do not expose private data in the report.
4. **Change one variable.** Remove or alter only the optional component in the isolated treatment. Confirm that mandatory safeguards remain active and the baseline is still recoverable.
5. **Run paired trials.** Execute the fixed task set in both conditions with the same settings and number of repetitions. Record failures and missing measurements; do not silently drop them. Score with the prewritten rubric, preferably without revealing condition labels to the scorer.
6. **Compare.** Report per-task results and aggregate differences for success, quality, time, and cost where measured. Include sample size and uncertainty. A small or noisy difference is inconclusive, not proof of improvement or learned capability.
7. **Recommend separately.** State whether evidence supports retaining, revising, or proposing removal of the optional component. The owner makes the change decision; this experiment does not promote a configuration.

## Report

Include: question and scope; baseline/treatment identifiers; safeguards held constant; task set and repetitions; model/version and run dates; rubric; per-task outcomes; aggregate results and missing data; limitations; recommendation; owner decision and follow-up, if any.

## Interpretation

- Do not claim a model “learned” a behavior from one comparison. This measures performance under the tested conditions only.
- Do not generalize beyond the tasks, version, settings, and sample size tested.
- Keep raw prompts and outputs access-controlled; redact personal or confidential content before sharing.
- If the baseline cannot be reproduced or the conditions differ, label the result exploratory.
