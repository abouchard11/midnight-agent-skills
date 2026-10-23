# midnight-agent-skills

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23502955.svg)](https://doi.org/10.5281/zenodo.23502955)

Two skills that are meant to be loaded together, plus two MidnightDev operation skills.

1. **Work topology** — `skills/agentic-graph-orchestration`
2. **Memory closer** — `skills/gbrain-graph-companion`
3. **Graph operations** — `skills/graphiti-brain`
4. **Loop design** — `skills/self-improving-loop`
5. **Daily compounding** — `skills/daily-compounding`

The model does not own accept, post, pay, or remember.

This is a clone of those skills in one repo so they can be dropped into Claude / Codex / Grok as a set. Canonical singles stay in their own repos. Edit there, copy here.

`graphiti-brain` and `self-improving-loop` were added 2026-09-27 from
`midnightdev/agents/skills/`, which is **not** version-controlled — this repo is
now their canonical home. `graphiti-brain` was reconciled against the live
stack the same day (19 MCP tools, receipt-based `add_memory`, the measured
38-group namespace map, `gemini-3.1-flash-lite` replacing the 2.5 Flash models
Google retires 2026-10-16).

`daily-compounding` was added 2026-09-29. It had never run: no YAML frontmatter,
an install instruction pointing at a flat path Hermes cannot load, and no
scheduler entry — the 07:00 job that looked like it was paused, and the 08:00
one that was failing on a missing credential. The rewrite pins the ordering rule
(deterministic `cad brief --write` first and authoritative; model classification
additive and non-authoritative) and a checkable verification list. Verified by an
independent council (FINISHER + SPARRING) that confirmed the diagnosis and
rejected the original "fold it into the brief" fix in favour of ledger-first.

## Stack

```
agentic-graph-orchestration     ← canonical work topology + linter
        ↑ consumed by
midnight-agent-skills           ← THIS REPO: packaging pair (work + memory closer)
        ↑ consumed by
midnight-reasoning              ← reflection / critic library
        ↑ consumed by
Kiel (runkiel.com)              ← operator UI + run state
```

Ownership is directed. Canonical skill content lives upstream. This repo packages the pair for install; edit upstream, copy here.

## How they compose

```
goal + verifier
        ↓
agentic-graph-orchestration     nodes, closers, linter
        ↓
gbrain-graph-companion          only verified / decided notes persist
        ↓
Graphiti  (entities)     GBrain  (pages)     MEMORY.md  (cache)
```

Load the graph skill when the job is a loop. Load the companion when a node should outlive the process. A passed `pay` node may produce a `decided` memory. An open `pay` node may not.

## Install

```sh
cp -R skills/agentic-graph-orchestration ~/.claude/skills/
cp -R skills/gbrain-graph-companion ~/.claude/skills/
cp -R skills/graphiti-brain ~/.claude/skills/
cp -R skills/self-improving-loop ~/.claude/skills/
cp -R skills/daily-compounding ~/.claude/skills/
```

For Hermes the target is `<category>/<name>/SKILL.md` and the skill **must** carry
YAML frontmatter — a flat `*.md` in `~/.hermes/skills/` never loads:

```sh
cp -R skills/daily-compounding ~/.hermes/skills/software-development/
```

Same paths work under `.grok/skills/` or `.codex/skills/`.

```sh
node skills/agentic-graph-orchestration/scripts/lint-graph.js   skills/agentic-graph-orchestration/examples/marketplace-graph.json
python3 skills/gbrain-graph-companion/scripts/lint-note.py   skills/gbrain-graph-companion/examples/good-verified.md
```

## What is in this suite vs what is not

| In here | Why |
|---|---|
| `agentic-graph-orchestration` | Work graph. Irreversible edges stay open. |
| `gbrain-graph-companion` | Memory graph. `remember` is irreversible. |
| `graphiti-brain` | Operates the entity store through the 19 MCP tools. Now canonical here. |
| `self-improving-loop` | Loop design template. Feeds the work graph. |
| `daily-compounding` | Morning brief. Deterministic ledger first, model stage additive. |

| Not copied in | Why |
|---|---|
| [graphiti-neo4j-ops](https://github.com/abouchard11/graphiti-neo4j-ops) | Operates the entity store. Different job. |
| [llm-safety-gate](https://github.com/abouchard11/llm-safety-gate) | Fail-closed classifier machine. Import it; do not wrap it as a skill. |
| [midnight-seo-skills](https://github.com/abouchard11/midnight-seo-skills) | Portfolio SEO. Does not share this hard rule. |
| [claude-desktop-skills](https://github.com/abouchard11/claude-desktop-skills) | Narrow knowledge-work prompts. Sibling craft, different layer. |
| [midnight-reasoning](https://github.com/abouchard11/midnight-reasoning) | Reflection library — load as its own skill; not duplicated here yet |

## License

Apache License 2.0. See [LICENSE](LICENSE). Copyright 2026 Alex Bouchard.

## Related

- [agentic-graph-orchestration](https://github.com/abouchard11/agentic-graph-orchestration) — work topology (canonical)
- [midnight-reasoning](https://github.com/abouchard11/midnight-reasoning) — cross-run reflection / critic
- Kiel — operator UI, live at runkiel.com (source private)
