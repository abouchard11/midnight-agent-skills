# Cookbook

Small recipes. Load `SKILL.md` first.

## Add a third irreversible edge

1. Put the node in the table with `closer: human` or `policy`.
2. Add its id to `scripts/lint-graph.js` `IRREVERSIBLE_IDS` if the name is new.
3. Run `node scripts/lint-graph.js` on the JSON. A `closer: model` must fail.
4. Implement the product so the node stays `running` until the verifier or a human closes it.
5. Persist a memory note only after it closes. Load `companions/gbrain/SKILL.md`.

## Persist a session learning

```sh
python3 companions/gbrain/scripts/lint-note.py .scratch/note.md
```

If that exits 1, do not `gbrain capture`. Observed notes die with the session.

## Dozen-shaped product

Copy `examples/dozen-graph.json`. Do not auto-close accept, post, or pay so a demo handler looks finished.
