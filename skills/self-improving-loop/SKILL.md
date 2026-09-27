---
name: self-improving-loop
description: Design a recursive automation loop that improves while it runs — Sensor, Policy, Tools, Quality Gate, Learning. Use when building any automation or agent workflow, when the user says "make this self-improving" or "automate this loop", or when turning a one-time task into a recurring process.
metadata:
  type: workflow
  lifecycle: active
---

# Skill: Self-Improving Loop

> Build recursive AI loops that get better while you sleep. Sensor → Policy → Tools → Quality Gate → Learning.

## Trigger

Use this skill:
- When building any automation or agent workflow
- When the user says "make this self-improving" or "automate this loop"
- When you need to turn a one-time task into a recurring process

## Steps

### 1. Define the Sensor Layer
What data flows into the loop?
- Emails, support tickets, calendar events
- Code changes, PRs, deployments
- Product telemetry, user feedback
- Market data, competitor news
- Meeting recordings, conversation transcripts

Document:
```yaml
sensor:
  sources:
    - [source 1]
    - [source 2]
  frequency: [how often to check]
  format: [data format]
  validation:
    - [check 1]
    - [check 2]
  on_validation_failure: [quarantine/alert/reject — never silently pass through]
```

**The quality gate checks output. Validation checks input.** They are not the
same gate, and a loop with only one of them is open on the other side. A false
premise that enters at the sensor is carried cleanly through every downstream
check — each layer validates the *shape* of what it received, not whether it
corresponds to the world.

Required input checks:
- **Full-string match on identifiers.** Never filter or compare on a prefix or
  truncation. A model name, id, or slug sliced to N characters silently drops
  valid matches.
- **Format before lookup.** Validate the token's format first, then query it. A
  successful lookup does not retroactively validate a malformed source token.
- **Bounds, schema, and completeness** on every inbound record.
- **Provenance and freshness** — when was this true, and where did it come from?

On failure: quarantine and alert. Do not drop silently (you lose the signal)
and do not pass it through (you poison the loop).

### 2. Define the Policy Layer
What rules govern the loop?
- What can the agent do autonomously?
- What requires human approval?
- What must be logged?
- What are the guardrails?

Document:
```yaml
policy:
  autonomous_actions:
    - [action 1]
    - [action 2]
  requires_approval:
    - [action 3]
  logging:
    - [what to log]
  guardrails:
    - [constraint 1]
    - [constraint 2]
```

### 3. Define the Tools Layer
What deterministic APIs does the agent call?
- Database queries
- API calls
- File operations
- Code execution
- External integrations

Document:
```yaml
tools:
  - name: [tool name]
    type: [api/script/query]
    input: [what it needs]
    output: [what it returns]
```

### 4. Define the Quality Gate
How do you verify the output?
- Automated tests
- Eval against known-good output
- Human review for high-stakes decisions
- Sanity checks (bounds, format, completeness)

Document:
```yaml
quality_gate:
  checks:
    - [check 1]
    - [check 2]
  pass_threshold: [X]%
  failure_action: [retry/escalate/abort]
```

### 5. Define the Learning Layer
How does the loop improve?
- Extract learnings from failures
- Update skills based on patterns
- Archive stale information
- Promote successful approaches

Document:
```yaml
learning:
  on_success:
    - [action 1]
  on_failure:
    - [action 2]
  skill_updates:
    - [what to update]
  gate:
    proposed_by: model          # the loop may DRAFT a change
    applied_by: human|policy    # the loop may NOT apply it to itself
    critic: [a different seat/model than the actor — self-grading is not a gate]
    confidence_floor: 0.6       # below this, do not apply; log and surface
    max_attempts: 3
    no_progress_streak: 2       # >= 2 on the same step -> stop and surface
    reversible: required        # VCS-tracked; an un-revertible learning is not a learning
```

**The learning layer is an irreversible edge.** A loop that edits its own
governing document has closed the only gate that could have caught it — the
next run reads the edited rule as ground truth and no longer has access to the
version it replaced. This is `persist`/`remember` under another name, and it
gets the same treatment: the model drafts, a human or policy applies.

Enforcement is not prose. A `skill_updates` action must be either:
- a **human-closed node in a linted graph** — `agentic-graph-orchestration`'s
  `lint-graph.js` fails any `irreversible: true` node whose `closer` is
  `model`, and its `IRREVERSIBLE_IDS` already covers `remember`, `persist`,
  `forget`; or
- a **VCS-reviewed commit** to the skill file, so the change is attributable
  and revertible.

Note the limit honestly: that linter checks graph JSON, not skill files. An
in-loop self-edit with no graph and no commit is caught by nothing but review.
If your loop can write its own skills, that gap is your highest-value
hardening target — close it with a hook, not a paragraph.

Never: apply a learning because the loop felt confident, batch unreviewed
self-edits, or treat "the run succeeded" as evidence the rule change was right.

### 6. Wire the Loop
Connect the layers:
```
Sensor → Policy → Tools → Quality Gate → Learning → (back to Sensor)
```

Set up cron job or trigger:
```yaml
schedule: [cron expression or event trigger]
timeout: [max execution time]
retry_policy: [on failure]
```

### 7. Monitor the Loop
Track metrics:
- Execution frequency
- Success rate
- Token usage
- Quality score
- Improvement over time

## Output Format

```markdown
# Self-Improving Loop: [NAME]

## Purpose
[what this loop does]

## Sensor Layer
- Sources: [list]
- Frequency: [how often]
- Format: [data format]
- Validation: [input checks — full-string identifier match, format-before-lookup, bounds/schema]
- On validation failure: [quarantine/alert/reject]

## Policy Layer
- Autonomous: [what it can do]
- Requires approval: [what needs human]
- Guardrails: [constraints]

## Tools Layer
- [tool 1]: [what it does]
- [tool 2]: [what it does]

## Quality Gate
- Checks: [list]
- Pass threshold: [X]%
- On failure: [action]

## Learning Layer
- On success: [what it learns]
- On failure: [what it learns]
- Skill updates: [what gets updated]
- Gate: model drafts → [critic seat/model] reviews → [human/policy] applies
- Reversible: [VCS path / rollback method]

## Metrics
- Runs per day: [N]
- Success rate: [X]%
- Token usage: [N] per run
- Quality score: [X]/10

## Status
[GREEN/YELLOW/RED]
```

## Verification

- All five layers defined
- Loop wired correctly
- **Sensor validates input**, and validation failure quarantines rather than
  passing through
- Quality gate catches failures
- **Learning layer's `skill_updates` is gated** — model drafts, human/policy
  applies, and the applied change is revertible
- Metrics tracked
- Loop runs on schedule

## Pitfalls

- **No quality gate:** Without verification, the loop produces garbage. Always verify.
- **No learning layer:** Without learning, the loop doesn't improve. Always extract learnings.
- **Too much autonomy:** If the agent can do anything, it will do the wrong thing. Define clear policies.
- **No monitoring:** If you don't track metrics, you don't know if it's working. Always monitor.
- **Skipping the sensor:** If data doesn't flow in, nothing happens. Define clear sensors.
- **Ungated self-modification:** A loop that writes its own skills removes the
  only gate that could catch it, and launders the change as "learning." The
  model drafts; a human or policy applies.
- **No input validation:** The quality gate only sees output. A false premise
  entering at the sensor passes every downstream shape check. Real case
  (2026-09-27): a catalog probe filtered model names on a 12-character prefix,
  so `gemini-3.6-flash` never matched `'flash'`; the loop concluded the model
  did not exist and nearly wrote that falsehood into canonical memory. Only an
  independent human-gated verifier caught it. Validate identifiers on the full
  string.
- **Self-grading critic:** If the critic is the same model instance that
  produced the work, it is not a gate. Use a different seat or model.
- **Confidence as a retry trigger:** An unsure critic must not force retries —
  that burns budget without improving output. Below the confidence floor, log
  and surface; do not loop.

## Example

```markdown
# Self-Improving Loop: Email Triage

## Purpose
Process inbox, triage by priority, draft responses, surface what matters.

## Sensor Layer
- Sources: Gmail API
- Frequency: Every 15 minutes
- Format: Email objects (from, subject, body, date)
- Validation: sender address full-string match against contacts (no prefix
  matching); thread ids format-checked before lookup; body non-empty; date
  within the polling window
- On validation failure: quarantine to a review label, alert, never triage

## Policy Layer
- Autonomous: Triage, draft responses, file emails
- Requires approval: Send responses, delete emails
- Guardrails: Never respond to spam, never delete without confirmation

## Tools Layer
- gmail_search: Query emails
- gmail_draft: Create draft response
- gmail_label: Apply labels
- library_search: Look up sender context

## Quality Gate
- Checks: Response addresses all points, tone matches relationship, no hallucinated facts
- Pass threshold: 95%
- On failure: Flag for human review

## Learning Layer
- On success: Extract response patterns, update sender context
- On failure: Update triage rules, refine draft prompts
- Skill updates: Triage skill, draft skill
- Gate: model drafts the change → a different seat critiques it (confidence
  floor 0.6; below that, log and surface, do not retry) → human applies
- Reversible: skills are git-tracked; every applied change is one revert away

## Metrics
- Runs per day: 96
- Success rate: 94%
- Token usage: 2,400 per run
- Quality score: 8.7/10

## Status
GREEN
```
