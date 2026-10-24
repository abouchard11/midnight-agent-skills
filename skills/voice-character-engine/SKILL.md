---
name: voice-character-engine
description: "Specify an AI character's identity and voice, then evaluate consistency and drift with a fixed test set. Use when designing or reviewing persistent character behavior."
version: 0.1.0
metadata:
  type: workflow
  lifecycle: draft
---

# Voice Character Specification and Evaluation

This is a design and evaluation procedure. It does not provide a memory runtime, guarantee persistence, or authorize storing conversation data.

## Specify the character

1. Record the intended audience, use case, boundaries, and source of approved character facts.
2. Write a compact character contract: identity, motivations, stable traits, voice (vocabulary, rhythm, tone), emotional range, and prohibited behavior. Distinguish canon from optional improvisation.
3. Provide representative examples for contrasting situations. Include expected invariants and acceptable variation; avoid making a catchphrase the only voice test.
4. Describe any memory behavior separately from the voice specification. Identify what may be remembered, its purpose, retention, access boundary, and deletion path. Use only consented and minimized data. If these controls or an implemented memory system are unknown, say so; do not invent one.

## Evaluate consistently

1. Before testing, freeze a versioned character prompt/configuration and a fixed scenario set covering ordinary interaction, emotional contrast, correction, ambiguity, boundary refusal, and context changes.
2. Define a rubric before seeing outputs. Score observable dimensions such as identity consistency, voice fit, emotional appropriateness, factual continuity, and boundary compliance. Describe anchors for each score; do not use an unsupported single “consistency” number.
3. Record model/provider/version, relevant settings, prompt/config version, scenario inputs, date, and all outputs. Establish a baseline before changing the specification. Compare versions on the same scenarios and settings where possible.
4. Separate voice quality from memory behavior. Test memory only with consented synthetic or otherwise authorized fixtures, isolated user/session stores, and explicit retention/deletion checks. Never expose one user's context to another test session.
5. Treat a forgotten item and a leaked item as different failures. Verify deletion by checking the relevant storage boundary; a changed response alone does not prove deletion. Record what was actually inspected.
6. Report per-scenario observations, rubric scores with rationale, differences from baseline, failures, and limitations. Recommend a change only when the evidence points to it; rerun the fixed set after the change.

## Report

Include specification version, test date, model/version and settings, scenario-set version, rubric, baseline identifier, results by scenario, memory tests and their isolation/consent assumptions (if run), observed failures, and next steps. Label generated scenarios and outputs as test artifacts, not production behavior.

## Limits

- A prompt or persona document specifies intended behavior; it does not prove the deployed system uses it.
- A small scenario set does not establish consistency across users, sessions, models, or time.
- Do not include real personal conversation excerpts in shared reports without explicit authorization and appropriate minimization.
- Do not claim persistent memory, reliable forgetting, or cross-session continuity unless the underlying runtime and storage were independently verified.
