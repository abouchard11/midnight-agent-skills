#!/bin/bash
# daily-compounding — DETERMINISTIC stage of the 07:00 morning brief.
#
# This script contains NO model call. It emits the deterministic half; the cron
# job injects this stdout into its agent prompt as context, and the agent does
# the classification and delivery. One model call per morning, not two.
#
# Order is load-bearing (council run 20260929-212805-792dec):
#   1. compounding-sensor.py  — job health + aging deltas (AUTHORITATIVE)
#   2. cad brief --write      — the Caduceus decision ledger (AUTHORITATIVE)
# The agent stage is ADDITIVE and non-authoritative. If it fails, everything
# above still stands.
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

# --- 1. deterministic sensor ---------------------------------------------
python3 "$HOME/.hermes/scripts/compounding-sensor.py" > "$SENSOR_FILE" 2>&1
SENSOR_RC=$?

# --- 2. deterministic decision ledger ------------------------------------
cad brief --write > "$LEDGER_FILE" 2>&1
LEDGER_RC=$?

# --- emit (this stdout is what the cron job injects) ---------------------
echo "# Deterministic inputs — ${STAMP}"
echo
if [ "$SENSOR_RC" -ne 0 ]; then
  echo "**RED** — compounding-sensor.py exited ${SENSOR_RC} (see ${SENSOR_FILE})"
else
  cat "$SENSOR_FILE"
fi
echo
if [ "$LEDGER_RC" -ne 0 ]; then
  echo "**RED** — \`cad brief --write\` exited ${LEDGER_RC} (see ${LEDGER_FILE})"
else
  cat "$LEDGER_FILE"
fi

if [ "$SENSOR_RC" -ne 0 ] || [ "$LEDGER_RC" -ne 0 ]; then
  exit 1
fi
exit 0