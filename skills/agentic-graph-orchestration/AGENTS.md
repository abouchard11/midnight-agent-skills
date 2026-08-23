# Agent notes

This repo is a skill, not an app.

- Load `SKILL.md` first. Open `references/` only when the job needs depth.
- Before implementing a graph, write JSON and run `node scripts/lint-graph.js`.
- Irreversible nodes (`accept`, `post`, `pay`, `publish`, `merge`, `safety`, `remember`, `forget`) cannot have `closer: model`.
- Inner loops must set `restarts: []`. A failed caption does not restart intake.
- Memory: load `companions/gbrain/SKILL.md`. Do not substitute GBrain for Graphiti.
- Keep the repo private until a human says otherwise.
- Do not claim novelty without reading `references/prior-art.md`.

## Retrospective

After every invocation, follow the **Retrospective** section at the bottom of `SKILL.md`.
Draft an observed note only when one of the four trigger conditions is met.
Never edit this skill, any graph JSON, or shared types from a retrospective.
Never call promote / persist / remember on a retro note.
