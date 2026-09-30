#!/bin/bash
# daily-compounding — morning brief for the 07:00 cron job.
#
# Order is load-bearing (council run 20260929-212805-792dec):
#   Stage 1  deterministic, NO MODEL:
#              1a. compounding-sensor.py  — job health + aging deltas
#              1b. cad brief --write      — the decision ledger
#            AUTHORITATIVE.
#   Stage 2  model classification of stage 1 — ADDITIVE, non-authoritative.
# If stage 2 fails, stage 1 still stands and is still delivered.
#
# The sensor exists because two boxes of the original contract could not be
# satisfied from `cad brief --write` alone: it carries no job-execution data and
# no library metric. See the skill's "The compounding metric" section.
#
# Safe to run by hand. Does not enable or modify any cron schedule.

set -uo pipefail

STAMP="$(date +%F)"
OUT_DIR="$HOME/.hermes/cron/output/daily-compounding"
mkdir -p "$OUT_DIR"
SENSOR_FILE="$OUT_DIR/${STAMP}-sensor.md"
LEDGER_FILE="$OUT_DIR/${STAMP}-ledger.md"

# --- Stage 1a: deterministic sensor --------------------------------------
python3 "$HOME/.hermes/scripts/compounding-sensor.py" > "$SENSOR_FILE" 2>&1
SENSOR_RC=$?

# --- Stage 1b: deterministic decision ledger -----------------------------
cad brief --write > "$LEDGER_FILE" 2>&1
LEDGER_RC=$?

# --- Stage 2: model stage, bounded input ---------------------------------
MODEL_FILE="$OUT_DIR/${STAMP}-model.md"
if [ "$SENSOR_RC" -eq 0 ] && [ "$LEDGER_RC" -eq 0 ]; then
  # `read -d ''` rather than PROMPT="$(cat <<'EOF'...)" — a heredoc nested inside
  # a command substitution inside double quotes makes the parser count an
  # apostrophe in the body (e.g. "Today's") as an unclosed quote. This form has
  # no such nesting.
  read -r -d '' PROMPT <<'EOF' || true
Below are two DETERMINISTIC artifacts for today: a job-health + aging sensor,
and the Caduceus decision ledger. They are AUTHORITATIVE — do not restate,
recompute, or contradict their numbers; you may only classify and act on them.
Using ONLY those two artifacts as input, emit exactly these sections and nothing
else, per the daily-compounding skill contract:

## Critical Items
- [RED|YELLOW] <item> — <action needed>

## Opportunities
- [BLUE] <item> — <consider investing>

## Today's plan
1. <highest-leverage task>

## Delegated Today
- <task> -> <seat>   (or the single line: nothing delegated)

Rules:
- Do NOT invent counts. If a number is absent from the artifacts, write
  "unknown (not in artifacts)".
- Do NOT re-print the aging or job-health numbers as your own summary. They are
  already stated verbatim above you; re-stating them adds nothing.
- The ledger names a SINGLE MOST IMPORTANT item. It must appear as RED.
- Judge severity by AGING, not by raw count: an item open 27 days outranks
  three items opened yesterday.
EOF
  hermes -z "${PROMPT}

$(cat "$SENSOR_FILE")

$(cat "$LEDGER_FILE")" > "$MODEL_FILE" 2>&1
  MODEL_RC=$?
else
  MODEL_RC=1
fi

# --- Delivery ------------------------------------------------------------
echo "# Morning Briefing — ${STAMP}"
echo
echo "## Deterministic (authoritative, no model)"
echo
cat "$SENSOR_FILE"
echo
cat "$LEDGER_FILE"

if [ "$SENSOR_RC" -ne 0 ] || [ "$LEDGER_RC" -ne 0 ]; then
  echo
  echo "**RED** — deterministic stage failed (sensor rc=${SENSOR_RC}, ledger rc=${LEDGER_RC}). Model stage skipped."
  exit 1
fi

if [ "$MODEL_RC" -ne 0 ]; then
  echo
  echo "**YELLOW** — model stage exited ${MODEL_RC}. Everything above stands alone."
  exit 0
fi

echo
echo "## Classification (model stage — additive, not authoritative)"
echo
cat "$MODEL_FILE"