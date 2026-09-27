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
```

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
```

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
- Quality gate catches failures
- Learning layer updates skills
- Metrics tracked
- Loop runs on schedule

## Pitfalls

- **No quality gate:** Without verification, the loop produces garbage. Always verify.
- **No learning layer:** Without learning, the loop doesn't improve. Always extract learnings.
- **Too much autonomy:** If the agent can do anything, it will do the wrong thing. Define clear policies.
- **No monitoring:** If you don't track metrics, you don't know if it's working. Always monitor.
- **Skipping the sensor:** If data doesn't flow in, nothing happens. Define clear sensors.

## Example

```markdown
# Self-Improving Loop: Email Triage

## Purpose
Process inbox, triage by priority, draft responses, surface what matters.

## Sensor Layer
- Sources: Gmail API
- Frequency: Every 15 minutes
- Format: Email objects (from, subject, body, date)

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

## Metrics
- Runs per day: 96
- Success rate: 94%
- Token usage: 2,400 per run
- Quality score: 8.7/10

## Status
GREEN
```
