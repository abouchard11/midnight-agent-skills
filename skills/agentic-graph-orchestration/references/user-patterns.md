# Patterns from the author's working repos

These are not generic advice. They are invariants already shipped in `abouchard11/*`.

- **The model cannot touch the score** — `yapoleons-court`. Scoring, payout, and accept/post are outside the generator.
- **Fail-closed safety** — `llm-safety-gate`. Majority vote, refusal-vs-noise taxonomy, classifier-agnostic. A maybe is a no.
- **Reliability as infrastructure** — `gemini-reliability-proxy`. Fallback chains, 429-vs-5xx retry, chain-wide time budgets, denial-of-wallet.
- **Adversarial roles + source of truth** — `ai-boardroom-forecast-audit`. Roles argue; invariants are machine-checkable; assumptions are explicit.
- **Knowledge-graph ops** — `graphiti-neo4j-ops`. Health recovery and backups are scripts, not vibes. Graphiti stays canonical for entities; GBrain is not a substitute.
- **Skill suites with narrow triggers** — `claude-desktop-skills`. One skill, one job.
- **Memory writes are gated** — `companions/gbrain`. Observed notes die with the session. Only verified / decided increments persist.

When the graph touches character systems, content safety, money, or multi-turn evaluation, default to these patterns. Do not invent a softer gate.
