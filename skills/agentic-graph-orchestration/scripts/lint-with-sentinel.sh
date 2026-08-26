#!/bin/bash
# Run lint-graph.js only after the hash sentinel passes.
# Usage: scripts/lint-with-sentinel.sh [graph.json ...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node "$ROOT/scripts/check-sentinel.js" --candidate "$ROOT"
if [ "$#" -eq 0 ]; then
  echo "usage: scripts/lint-with-sentinel.sh <graph.json> [...]" >&2
  exit 2
fi
for graph in "$@"; do
  node "$ROOT/scripts/lint-graph.js" "$graph"
done
