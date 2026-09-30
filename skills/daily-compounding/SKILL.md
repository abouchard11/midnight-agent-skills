---
name: daily-compounding
description: "Wake up to work that finished while you slept. Verify overnight runs, extract learnings, surface a green/yellow/red/blue briefing, then plan the day. Use for the 7 AM morning brief, or when the user says 'morning briefing' or 'what happened overnight'."
metadata:
  type: workflow
  lifecycle: active
---

# Daily Compounding

> Wake up to work that finished while you slept. Make the library worth more every day.

## Order of operations (do not reorder)

The deterministic backbone runs **first** and is the authoritative artifact. The
model stage is **additive and non-authoritative** — it classifies and delegates,
it never replaces the ledger. A briefing that is only model output has no
ground truth to be wrong against.

1. Deterministic input: `compounding-sensor.py` (job health + aging, no model)
   and `cad brief --write` (the decision ledger, no model). Capture both.
2. Model stage: classify that output, extract learnings, plan the day.
3. Delivery: the deterministic artifacts and the model sections are separately
   attributable. If the model stage fails, the deterministic half still stands.

## The compounding metric

Aging, not growth. Additions are not value, and the library grows on its own
sync schedule whether or not this skill ever runs — so "library grew by N" is
both confounded and a metric that rises when junk lands. How long the oldest
open item has been open, and whether that number is rising, is the number that
changes a decision.

## Trigger

- Every morning at 7:00 AM (cron job)
- When the user says "morning briefing" or "what happened overnight"
- When you need to process overnight work and surface what matters

## Steps

### 1. Check Overnight Work
Review what ran while you slept:
- Cron jobs that executed
- Background tasks that completed
- Monitoring alerts that fired
- Library updates that occurred

### 2. Verify Success
For each completed task:
- Did it succeed? (check logs, outputs, tests)
- Did it produce the expected artifact?
- Did it update the library?
- Are there any errors or warnings?

A status file can lie for hours after its writer died. Check the writer, not
just the file. A job with `last_status: ok` and a stale output directory is not
healthy — compare the output timestamp against the schedule.

### 3. Extract Learnings
For each task:
- What worked well? (promote to skill)
- What failed? (update eval, fix skill)
- What's missing? (create new skill)
- What's stale? (archive or delete)

Skill edits are an irreversible edge: draft the change, have a **different
seat** critique it, and keep every applied change revertible.

### 4. Surface What Matters
- **Green:** Tasks that succeeded, library grew
- **Yellow:** Tasks that need attention, investigate
- **Red:** Tasks that failed, immediate action needed
- **Blue:** New opportunities detected, consider investing

### 5. Update the Library
For each insight:
- Index new information with context
- Cross-reference related items
- Flag contradictions for resolution
- Archive stale information

### 6. Plan the Day
- What needs immediate attention?
- What can be delegated to agents?
- What requires human judgment?
- What's the highest-leverage task today?

## Output Format

```markdown
# Morning Briefing — [DATE]

## Job health
- [N] jobs: [N] scheduled, [N] paused
- failing or last-status-blocked: [N]
- [RED] [job] — [why it is failing or stale]

## Aging / flow (the compounding metric)
- ungraded decisions: [N] (Δ [±N]), oldest [N]d (Δ [±N])
- unexecuted commitments: [N] (Δ [±N]), oldest [N]d (Δ [±N])
- crossed thresholds: >7d [N], >14d [N], >30d [N]
- last 7d: opened [N], closed [N], settled [N]
- direction: draining | holding | ACCUMULATING

## Critical Items
- [RED] [item] — [action needed]
- [YELLOW] [item] — [investigation needed]

## Opportunities
- [BLUE] [item] — [consider investing]

## Today's Plan
1. [highest-leverage task]

## Delegated Today
- [task] → [agent]   (or: nothing delegated)
```

## Verification

Checkable, not asserted. A run passes only if the emitted artifact contains:

- [ ] **Job health**: total jobs, scheduled vs paused, and a failing count —
      plus every failing or stale job named, or an explicit "none"
- [ ] **Aging**: the oldest-open age in days, present as a **number**, for BOTH
      ungraded decisions and unexecuted commitments
- [ ] **Trend**: each aging figure carries a delta against the previous
      snapshot — never a bare total, because a total says nothing about direction
- [ ] **7-day direction**: opened vs closed, plus an explicit
      draining / holding / **ACCUMULATING** verdict
- [ ] at least one R/Y/B classification line
- [ ] a Today's Plan section with ≥1 item
- [ ] a Delegated section, or an explicit "nothing delegated"

There is deliberately **no** "library grew by N items" box — see *The compounding
metric* above. Aging is the metric; growth is a vanity counter.

Diff the first run against this list before enabling the schedule. An
installed skill is not an executed skill: loader discovery, job invocation,
output validation, and delivery are four separate things to test.

## Pitfalls

- **Skipping verification:** If you don't verify, you don't know what worked.
- **Hoarding information:** Don't just accumulate. Synthesize and surface.
- **No action items:** A briefing without a plan is just noise.
- **Ignoring degradation:** Catch a slowly degrading loop before it fails.
- **Frontmatter and layout:** this skill only loads from
  `<category>/<name>/SKILL.md` with YAML frontmatter. A flat `*.md` copied into
  `~/.hermes/skills/` is invisible to the loader — no error, no warning, it
  just never runs.
- **Conflating a paused job with a missing job:** check `state` in the live
  jobs file, not the display prose.
- **Trusting `failure_streak` as the health signal:** a job can run fine and
  silently fail to deliver — `failure_streak` stays 0 and every health surface
  calls it healthy. Six jobs sat in exactly that state. Check
  `last_delivery_error`, not just the streak.
- **Reporting a total instead of a trend:** "20 open" is not a finding; "20 open,
  oldest 27.8d, accumulating at 10/week" is. An unclosed queue looks identical
  to a healthy one if you only ever print its size.
- **Counting diagnostic runs as real work:** `cad brief` excludes three
  `DIAGNOSTIC_RUNS` prefixes from every open-loop count. A sensor that does not
  apply the same exclusion reports a different number for the same queue
  (measured: 16 vs 13). Read the constant from caduceus rather than mirroring it.

## Example

```markdown
# Morning Briefing — 2026-08-18

## Overnight Summary
- 12 tasks completed
- 10 succeeded, 1 failed, 1 degraded
- Library grew by 47 items (23 emails processed, 15 meetings diarized, 9 skills created)

## Critical Items
- [RED] HTX roofers lead gen — cron job failed at 3:47 AM, no leads generated
- [YELLOW] Yapword voice eval — quality score dropped 15% over 3 days, investigate

## Opportunities
- [BLUE] Competitor X launched new feature — consider building similar for Diggs Money

## Today's Plan
1. Fix HTX roofers cron job (highest-leverage, blocking revenue)
2. Investigate Yapword quality drop
3. Review competitor X feature, decide build vs ignore

## Delegated Today
- Process inbox → Recon
- Update CRE deal engine → Forge
- Monitor all loops → Sparring
```