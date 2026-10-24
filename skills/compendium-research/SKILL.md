---
name: compendium-research
description: "Research a question across available internal and external sources and produce a dated briefing with citations, contradictions, and confidence. Use for deep dives and decision or meeting preparation."
version: 0.1.0
metadata:
  type: workflow
  lifecycle: draft
---

# Compendium Research

Produce a useful, source-linked briefing. Use only sources and tools available in the current session; tool names and capabilities vary, so inspect their current descriptions instead of assuming API signatures.

## Method

1. **Frame the question.** Clarify topic, decision or audience, date range, jurisdiction if relevant, desired depth, and deadline. Separate questions that require current facts from stable background.
2. **Inventory sources.** Start with materials the user supplied or explicitly authorized. Then use available internal search and external research tools as appropriate. Do not search private stores or other users' data without authorization. Prefer primary records for material claims; use independent corroboration for consequential facts.
3. **Keep a source ledger.** For each source record title, publisher/author, URL or stable locator, publication/event date, access date, and the specific claim it supports. Preserve enough context to distinguish direct evidence from a source's interpretation. Note unavailable or inaccessible sources.
4. **Extract carefully.** Capture concise evidence and its locator. Mark each material statement as verified fact, attributed claim, inference, or unknown. Record conflicting accounts, stale data, and source limitations rather than resolving them by guesswork.
5. **Synthesize the briefing first.** Lead with a short answer and decision-relevant facts. Add chronology, analysis, contradictions, open questions, and next steps only where useful. Put citations next to the supported claims. Distinguish confidence in the evidence from confidence in an inference.
6. **Check the draft.** Confirm every nontrivial factual claim has a nearby source; dates and quotations match; sources are not counted as independent when they repeat one another; and uncertainty is visible. A source-count target may guide discovery but is never a quota or substitute for relevance and quality.
7. **Deliver and persist only if authorized.** Provide the cited report in the requested destination. Do not write to memory, a vault, or another persistent store by default. If the user explicitly requests persistence, follow that store's current write procedure, preserve the returned receipt, and verify completion before claiming it was saved.

## Brief format

- **Question and as-of date**
- **Answer:** concise synthesis with inline citations
- **Evidence:** key facts, dates, and provenance
- **Contradictions and unknowns:** what sources disagree on or do not establish
- **Analysis:** clearly labeled inference, with assumptions
- **Next steps:** only if they follow from the evidence
- **Sources:** linked ledger with publication and access dates

## Limits

- A search result or generated summary is a pointer, not verification; inspect the underlying source when available.
- Do not invent citations, dates, tool outputs, company facts, or source access.
- If a source is unavailable, say what could not be checked and narrow the conclusion.
- For high-stakes or fast-changing claims, use current authoritative sources and state the as-of date.
- Keep confidential materials within their authorized boundary; remove sensitive details from shareable outputs.
