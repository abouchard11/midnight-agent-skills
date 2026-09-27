---
name: graphiti-brain
description: Query, write, and maintain the Graphiti knowledge graph — the library plus the librarian. Use when recalling what is known about a person, project, business or decision, when storing a new fact or insight, when the user says "what do we know about X" or "remember this", or when checking graph health. Covers the 19 MCP tools, receipt-based writes, the 38-group namespace map, and world-time vs record-time read semantics.
metadata:
  type: workflow
  lifecycle: active
---

# Skill: Graphiti Brain Operations

> Query, write, and maintain the knowledge graph. The library plus the librarian.
>
> **Last reconciled against the live stack: 2026-09-27.** Every count, model
> name, and namespace below was measured that day (bolt read-only + the
> registered MCP tool list). Re-verify before trusting any number here — this
> graph grows continuously from multiple writers.

## Trigger

Use this skill:
- When you need to recall context about a person, project, business, or decision
- When you need to store a new insight, fact, or relationship
- When maintaining knowledge graph health
- When the user says "what do we know about X" or "remember this"

## Architecture Overview

The brain is a three-layer memory system:

```
┌─────────────────────────────────────────────────────────┐
│              K2 VAULT (Obsidian)                         │
│         ~/Documents/K2 Vault/                            │
│         Human-facing UX. Markdown notes.                │
│         The source of truth for curated knowledge.       │
└──────────┬──────────────────────────────┬───────────────┘
           │ sync_vault_to_graphiti.py    │ sync_vault_to_zep.py
           │ (hourly, launchd)            │ (hourly, launchd)
           ▼                              ▼
┌─────────────────────┐       ┌─────────────────────┐
│  LOCAL GRAPHITI      │       │  ZEP CLOUD          │
│  Neo4j on localhost  │       │  alex-bouchard      │
│  ~50.9K edges        │       │  graph              │
│  2,825 episodes      │       │  Conversational     │
│  38 group_ids        │       │  memory for K2 /    │
│  Entity extraction   │       │  Dispatch agents    │
│  Smart-routed by     │       │                      │
│  business namespace  │       │  source_agent filter │
│                      │       │                      │
│  MCP: mcp__graphiti__*│      │                      │
│  19 tools available  │       │                      │
└─────────────────────┘       └─────────────────────┘
```

## Available MCP Tools

These tools are registered in Hermes as `mcp__graphiti__*` — **19 as of
2026-09-27**. Re-check with a tool search before assuming the list; it has
grown this month.

### Write (receipt-based — read this before storing anything)

| Tool | Purpose |
|------|---------|
| `add_memory` | Write an episode. **Returns a receipt, not a confirmation** |
| `confirm_write` | Redeem an `add_memory` receipt → `landed`/`pending`/`failed` + `episode_uuid` |
| `add_triplet` | Write one fact triplet directly, bypassing episode extraction |

`add_memory` is **asynchronous**. It returns
`{receipt: {receipt_id, status: "spooled"}}` and nothing is saved yet.
`confirm_write(receipt_id)` waits for the verdict by default — **one call is
the whole procedure**. Measured over 39 landed writes: median time-to-land
**17.2s**, p90 **22.9s**; only 1 in 39 landed inside 5s. So a check with
`wait_s=0` reading `pending` is **normal, not a failure, and not a reason to
re-send**. Do not poll in a loop, and do not infer landing from `get_status`
timestamps.

### Read

| Tool | Purpose |
|------|---------|
| `recall_entity` | Everything the graph knows about one real-world thing, across every project |
| `search_nodes` | Search entities (people, companies, concepts) |
| `search_memory_facts` | Search relationships/facts between entities |
| `get_episodes` | Recent episodes, newest first — also the read-back for a write |
| `get_entity_edge` | Get a specific relationship by UUID |
| `get_episode_entities` | Provenance: which nodes/facts a given episode produced |
| `summarize_saga` | Summarize an ordered group of related episodes |
| `get_status` | Health from LIVE PROBES: `ok`/`degraded`/`down` with reasons |

**Prefer `recall_entity` over `search_nodes` when you need the whole story on
one thing.** Graphiti dedupes entities *inside* a `group_id` and never across
one, so a concept used in several projects exists as several nodes and an
ordinary search returns only one of them. Measured on this graph: "Alex" is
**47 nodes holding 2,455 facts**, and the best single node answers ~16% of the
question. `recall_entity` resolves to a canonical hub when identity
consolidation has run.

### Search scope

`search_nodes`, `search_memory_facts`, and `get_episodes` all treat **omitted
`group_ids` (or `"all"`) as EVERY group**, and the result carries a `scope`
field saying which groups were searched. Omit the filter for cross-portfolio
work instead of guessing a group list.

`search_memory_facts` excludes expired facts, and excludes superseded facts
(past `invalid_at`) unless you filter for them with `invalid_at_*`.

### Destructive (gated)

| Tool | Purpose |
|------|---------|
| `delete_entity_edge` | Remove a relationship |
| `delete_episode` | Remove an episode (cascades to entities/facts only it created) |
| `clear_graph` | Clear a namespace — **count-then-confirm gated** |

`clear_graph` will not delete anything until you have counted what you are
about to destroy and echoed that count back: call once without `confirm` to get
the count, show the number to the user in plain language, get explicit
approval, then call again with `confirm="DELETE <count> NODES"`. Every accepted
delete auto-exports the affected groups to `~/projects/_archive/`.

### Meta

`get_prompt`, `list_prompts`, `list_resources`, `read_resource`.

## Namespace Map

**Writes go to a project-scoped `group_id`.** Measured 2026-09-27:
**38 distinct group_ids**, 2,825 episodes.

| group_id | Episodes | Purpose |
|----------|----------|---------|
| `k2-vault` | 875 | Curated vault knowledge (hourly sync) |
| `yapword` | 468 | Yapword product |
| `global` | 350 | Cross-project / system facts — **written, see below** |
| `methyleneblueultra` | 185 | Methylene Blue Ultra |
| `stackd` | 161 | StackD |
| `thatsmybest` | 153 | ThatsMyBest |
| `bouchard-breaker` | 141 | Bouchard Breaker |
| `readablebyai` | 59 | ReadableByAI |
| `htxworkinjury` | 55 | HTX work injury |
| `jonesactcalculator` | 52 | Jones Act calculator |
| `midnightdev` | 52 | MidnightDev |
| `htxaccidentattorney` | 31 | HTX accident attorney |
| `htxpermitfix` | 29 | HTX PermitFix |
| `semantix` | 25 | Semantix |
| …24 more | | plus `main` (11 episodes / 91 relationships) |

### Routing Rules

- **Write to the project's own `group_id`.** Not `main`. `main` holds 0.4% of
  the graph (11 of 2,825 episodes) — it is a legacy default, not the home of
  "all knowledge". It does still receive occasional writes (latest 2026-09-27),
  so don't treat it as read-only either.
- **`global` is for genuinely cross-project facts** and IS written — 350
  episodes / 4,140 relationships as of 2026-09-27, latest 09-24. The standing
  rule (Alex, 2026-09-24): the default profile may write to `global` when the
  fact is worth it. **Ask Alex, not another seat, if a write may collide.**
- **Project-scoped queries:** pass `group_ids=["the-project"]`.
- **Cross-portfolio queries:** omit `group_ids` entirely (= all groups) and
  read the `scope` field in the result.
- **Embed project identifiers in episode content** as well as the group_id —
  it makes full-text recall work across groups.

## Provenance Convention

Every Graphiti write must include provenance in the `source_description` field:

```
src=<what this is> | orig=<seat> | promoted_by=finisher
```

**Fields:**
- `src`: Source type (e.g., "meeting transcript", "code review", "research finding", "architecture decision")
- `orig`: Which seat originated this (forge, recon, finisher, sparring, envoy)
- `promoted_by`: Always "finisher" — Finisher is the **intended** gate for
  seat-originated writes

**Example:**
```
src=architecture decision | orig=forge | promoted_by=finisher
```

**Gate rule:** Finisher rejects any seat-originated write missing or malformed
provenance. All three fields (`src`, `orig`, `promoted_by`) are mandatory.

> **Reality check (2026-09-27):** Finisher is the *policy* gate, not the only
> writer. The `com.alex.k2vault.graphiti` hourly sync writes continuously, and
> other agents write directly — the graph grew 50,897 → 50,905 edges during a
> 35-minute audit window from writers other than Finisher. Treat the convention
> as "what seat-originated writes must carry", not as "nothing else writes".

## Steps

### Query: "What do we know about X?"

1. **Determine scope** — one project, or cross-portfolio?
2. **If X is a single entity, start with `recall_entity`** — it crosses
   group boundaries that `search_nodes` cannot:
   ```
   mcp__graphiti__recall_entity(name="X")
   ```
3. **Search nodes** — find entities matching the query
   ```
   mcp__graphiti__search_nodes(query="X", group_ids=["relevant-group", "k2-vault"])
   ```
4. **Search facts** — find relationships between entities
   ```
   mcp__graphiti__search_memory_facts(query="X", group_ids=["relevant-group", "k2-vault"])
   ```
5. **Get recent episodes** — check for latest context
   ```
   mcp__graphiti__get_episodes(group_ids=["relevant-group"], max_episodes=5)
   ```
6. **Synthesize** — combine entity data, facts, and episodes into a coherent answer
7. **Flag gaps** — note what's missing from the graph

### Store: "Remember this"

1. **Determine the group_id** — which project does this belong to?
2. **Check for duplicates** — search before storing; manual writes have no
   content-hash guard (the vault sync does, `add_memory` does not):
   ```
   mcp__graphiti__search_nodes(query="the thing to store", group_ids=["target-group"])
   ```
3. **Add the memory** — with provenance in `source_description`:
   ```
   mcp__graphiti__add_memory(
     name="short episode name",
     episode_body="The fact to remember, with full context",
     group_id="target-group",
     source_description="src=research finding | orig=recon | promoted_by=finisher"
   )
   -> {receipt: {receipt_id, status: "spooled"}}
   ```
4. **Confirm the write** — ONE call, it waits for the verdict (~17s median):
   ```
   mcp__graphiti__confirm_write(receipt_id="...")
   -> {status: "landed", episode_uuid: "..."}
   ```
   `pending` at `wait_s=0` is normal. Do not re-send.
5. **Cross-reference** — link to related entities if relevant (`add_triplet`)

### Maintain: Graph Health

1. **Check status** — `ok`/`degraded`/`down` with reasons, from live probes
   ```
   mcp__graphiti__get_status()
   ```
   A `degraded` verdict with a real reason is healthy behaviour. Before
   2026-09-09 this tool was a connection ping that reported `ok` through a
   broken provider; it now composes canary + startup-probe + queue + lens
   checks, and a failed write in the last 24h can never read as `ok`.
2. **Verify sync daemons** — all should show exit code 0
   ```bash
   launchctl list | grep -E "k2vault|graphiti|neo4j"
   ```
   Expected (2026-09-27): `com.alex.graphiti.health`,
   `com.alex.graphiti.mcp`, `com.alex.neo4j-graphiti.up`,
   `com.alex.neo4j-graphiti.backup`, `com.alex.neo4j-graphiti.drive-sync`,
   `com.alex.k2vault.graphiti`, plus `dev.midnightdev.graphiti-lens`.
3. **Check Neo4j container**
   ```bash
   docker ps | grep neo4j-graphiti
   ```
4. **Review sync logs**
   ```bash
   tail -20 ~/Documents/K2\ Vault/_scripts/.graphiti.out.log
   ```
5. **Count episodes per namespace** (via cypher)
   ```cypher
   MATCH (e:Episodic) RETURN e.group_id, count(*) ORDER BY count(*) DESC;
   ```

## Verification

- Query returns relevant entities with summaries
- **A write is only done when `confirm_write` reports `landed`** — a receipt is
  not a confirmation
- Facts stored are retrievable via search
- Namespace routing is correct (project group_id, not a blind `main`)
- Sync daemons are running (launchctl shows exit 0)
- Neo4j container is healthy

## Pitfalls

- **Treating `add_memory` as synchronous.** It returns a receipt. Without
  `confirm_write` you don't know whether it landed, and re-sending on
  `pending` creates duplicates.
- **Wrong namespace:** check the namespace map. Writing everything to `main`
  strands it outside the project scopes people actually query.
- **Embedding dimension mismatch:** Graphiti uses 768-dim Gemini embeddings
  (`gemini-embedding-001`). Don't change the embedder without reindexing —
  every existing vector becomes incomparable.
- **Stale sync state:** If `.graphiti_sync_state.json` is corrupted, run
  `--full` to re-push everything. Cost: ~$1-3.
- **Duplicate episodes:** The sync script dedupes by SHA-256 content hash. But
  manual `add_memory` calls don't have this guard — search before storing.
- **Context window limits:** Don't dump raw graph data into prompts.
  Synthesize. Diarize. Give breadcrumbs.
- **Echo loops:** The vault↔graphiti sync filters by `source_description:
  "vault:"` to prevent round-trips. Don't circumvent this.
- **Trusting one node for a cross-project entity.** Deduplication never crosses
  `group_id`, so `search_nodes` can return 1 of 47 nodes for "Alex". Use
  `recall_entity`.
- **Asserting graph contents from memory.** This doc was wrong about three
  things on 2026-09-27 (tool count, model names, namespace map) because it was
  written from recall instead of measurement. Run the query.

## Example: Cross-Portfolio Intelligence

**User:** "What do we know about our Houston market position?"

**Agent:**
1. Recall the umbrella entity first, across every group:
   ```
   mcp__graphiti__recall_entity(name="Houston")
   ```
2. Search nodes — omit `group_ids` to hit all 38 groups:
   ```
   mcp__graphiti__search_nodes(query="Houston market position revenue leads")
   ```
3. Search facts:
   ```
   mcp__graphiti__search_memory_facts(
     query="Houston lead generation revenue performance",
     group_ids=["htxdentalimplants", "htxaccidentattorney", "k2-vault"]
   )
   ```
4. Synthesize results into a briefing:
   - Per-site performance
   - Cross-site patterns
   - Gaps in knowledge
   - Recommendations

## LLM + Embedding Stack

Updated 2026-09-27. **The previous values (Gemini 2.5 Flash / 2.5 Flash Lite)
are dead** — Google shuts the 2.5 Flash family down **2026-10-16**.

- **Entity extraction:** `gemini-3.1-flash-lite` (`MODEL_NAME` in
  `mcp_server/.env`)
- **Small extractions:** `gemini-3.1-flash-lite` (`SMALL_MODEL_NAME`)
- **Embeddings:** `gemini-embedding-001` at 768-dim (MUST match existing vectors)
- **Reranker:** OpenAI default
- **Sync cost:** ~$0.01-0.03 per note; bulk re-run ~$1-3

Models are **pinned explicitly, not via a `-latest` alias**: an alias is a
moving target, and a long-running daemon should not discover a model family
retirement at request time. Verify a model before pinning — list the catalog
and ping it with a 1-token `generateContent`:

```bash
curl --noproxy '*' "https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_API_KEY"
```

Check names against the **full** string. Filtering on a prefix silently drops
models (`gemini-3.6-flash`[:12] contains no "flash"), which is how a
non-existent-model claim got made about a model that exists.

## Read semantics (post 2026-09-26)

Two stamps, two meanings — conflating them hid facts from search for months:

- `invalid_at` = **world time**: when the fact stops being true.
- `expired_at` = **record time**: when the record was superseded.

Superseded-for-reads means `invalid_at IS NOT NULL AND invalid_at <= datetime()`.
A **future** `invalid_at` is a *scheduled supersession* and stays live — e.g.
"gemini-2.5-flash shuts down 2026-10-16" is a true, current fact until that
date. 18 such edges existed on 2026-09-26; migration
`004_scheduled_supersessions.py` cleared their contradictory `expired_at`
(prior values kept as `expired_at_before_004`), and `edge_operations.py` now
only record-expires an edge whose `invalid_at` has already passed.

## Infrastructure

Verified 2026-09-27:

- **Neo4j container:** `neo4j-graphiti` (Docker, bolt://localhost:7687) — Up, healthy
- **Auto-heal:** `neo4j-graphiti-autoheal` container — Up, healthy
- **Nightly backup:** `com.alex.neo4j-graphiti.backup` launchd agent
- **Container keep-up:** `com.alex.neo4j-graphiti.up` launchd agent
- **Drive sync:** `com.alex.neo4j-graphiti.drive-sync` launchd agent
- **Health check:** `com.alex.graphiti.health` launchd agent (writes the canary
  read by `get_status`)
- **Vault→Graphiti sync:** `com.alex.k2vault.graphiti` (hourly)
- **Lens:** `dev.midnightdev.graphiti-lens` (port 7878)
- **MCP server:** `com.alex.graphiti.mcp` — Hermes native MCP, stdio transport via uv
- **Deploy path:** edit `~/dev/graphiti` → `uv sync --extra providers
  --directory mcp_server` → `launchctl kickstart -k
  gui/$(id -u)/com.alex.graphiti.mcp`
