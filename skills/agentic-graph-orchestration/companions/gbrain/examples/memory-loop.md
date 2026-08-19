# Memory loop

The smallest topology that is allowed to persist a learning.

```
recall → draft-note → verify-note → remember
```

`remember` is irreversible. The model drafts. The script checks tier, lane, and secrets. Policy or a human closes persist.

See `memory-loop.json`. Lint it with the parent:

```sh
node scripts/lint-graph.js companions/gbrain/examples/memory-loop.json
```
