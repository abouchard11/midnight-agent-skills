# Marketplace — reference product graph

Agent-first marketplace: brands paste a brief; agents assemble 6–16 micros (1k–50k followers). The model drafts. It does not own FTC, fake-engagement, accept, post, or pay.

Machine spec: `examples/marketplace-graph.json` (must pass `node scripts/lint-graph.js`).

## Node table

| Node | Depends on | Owns | Closer | Done when |
|------|------------|------|--------|-----------|
| intake | — | parsed brief | script | Budget ≥ $200, niche + platform present |
| safety | intake | policy | policy | Fail-closed banned verticals |
| assemble | safety | slot list | script | 6–16 micros, fee math, fake-risk cap |
| offer | assemble | payouts | script | Payout inside each creator's rate band + brand escrow funded |
| accept | offer | slot.status | human | ≥60% accept **or explicit** bench refill |
| draft | accept | captions | model | Drafts exist only for accepted seats |
| verify | draft | verifier[] | script | FTC + must-say + avoid |
| revise | verify | same captions | script | ≤2 selective retries on this subgraph only |
| review | revise | brand taste | human | Brand sees only the batch |
| post | review | live URLs | human | Disclosure still present on every accepted slot |
| measure | post | ER | script | Not anomalous vs baseline |
| pay | measure | escrow | policy | Escrow funded + posted + no open dispute |

## Closed loops

- **Inner:** draft → verify → revise (max 2). Intake and assemble are not restarted. The script checker declares `verifies: ["draft"]`.
- **Outer:** accept stays `running` until the threshold or an explicit refill. Post stays `running` until every accepted slot posts.

## The mistake this graph guards against

A one-pass build auto-marks accept and post as passed so a demo can finish in one handler. That hands the model a creator's consent and a public post. Here they are real nodes:

- Launch leaves slots `proposed`, accept `idle`, and the campaign unfunded.
- Escrow must be funded before accept can close. Underpayment and a missing payment key fail closed.
- Accept and decline are creator actions. A bench refill is an explicit brand action, not a model guess.
- Approving the batch opens post. It does not pay.
- Post re-checks disclosure on every slot and fails closed.
- Pay refuses until every accepted slot has posted and escrow is funded. An anomalous engagement rate holds that seat.
