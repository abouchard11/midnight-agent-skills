# midnight-agent-skills

PROPRIETARY — ALL RIGHTS RESERVED.

No copying, redistribution, resale, sublicensing, or derivative use is authorized. No MIT, open-source, permissive, or other license may be added or substituted without Alex Bouchard's prior written approval. See LICENSE.

Private suite. Two skills that are meant to be loaded together.

1. **Work topology** — `skills/agentic-graph-orchestration`
2. **Memory closer** — `skills/gbrain-graph-companion`

The model does not own accept, post, pay, or remember.

This is a clone of those two skills in one repo so they can be dropped into Claude / Codex / Grok as a pair. Canonical singles stay in their own repos. Edit there, copy here.

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
```

Same paths work under `.grok/skills/` or `.codex/skills/`.

```sh
node skills/agentic-graph-orchestration/scripts/lint-graph.js   skills/agentic-graph-orchestration/examples/dozen-graph.json
python3 skills/gbrain-graph-companion/scripts/lint-note.py   skills/gbrain-graph-companion/examples/good-verified.md
```

## What is in this suite vs what is not

| In here | Why |
|---|---|
| `agentic-graph-orchestration` | Work graph. Irreversible edges stay open. |
| `gbrain-graph-companion` | Memory graph. `remember` is irreversible. |

| Not copied in | Why |
|---|---|
| [dozen](https://github.com/abouchard11/dozen) | Reference *product*, not a skill |
| [graphiti-neo4j-ops](https://github.com/abouchard11/graphiti-neo4j-ops) | Operates the entity store. Different job. |
| [llm-safety-gate](https://github.com/abouchard11/llm-safety-gate) | Fail-closed classifier machine. Import it; do not wrap it as a skill. |
| [midnight-seo-skills](https://github.com/abouchard11/midnight-seo-skills) | Portfolio SEO. Does not share this hard rule. |
| [claude-desktop-skills](https://github.com/abouchard11/claude-desktop-skills) | Narrow knowledge-work prompts. Sibling craft, different layer. |

## Related

- [agentic-graph-orchestration](https://github.com/abouchard11/agentic-graph-orchestration) — work topology (private)
- [dozen](https://github.com/abouchard11/dozen) — marketplace graph these skills were dogfooded on (private)
