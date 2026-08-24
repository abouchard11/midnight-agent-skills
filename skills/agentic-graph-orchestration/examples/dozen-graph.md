# Dozen — reference product graph

Agent-first marketplace: brands paste a brief; agents assemble 6–16 micros (1k–50k followers). The model drafts. It does not own FTC, fake-engagement, accept, post, or pay.

Machine spec: `examples/dozen-graph.json` (must pass `node scripts/lint-graph.js`).

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

## What was wrong in the one-pass build

Accept and post were auto-marked passed so the demo could finish in one handler. That violated the skill. They are now real nodes:

- Launch leaves slots `proposed`, accept `idle`, and the campaign in `funding`.
- Stripe Checkout funds escrow. Underpay and a missing key fail closed. Accept stays closed until `escrow_status` is funded.
- `acceptOffer` / `declineOffer` are live creator edges. Accept throws if escrow is not funded.
- `refillFromBench` is the explicit policy close — a brand action, not a model guess.
- `approveBatch` opens post. It does not pay.
- `postSlot` / `postBench` re-check disclosure fail-closed. Live TikTok / Instagram confirmation is still scaffolding.
- `releasePayouts` refuses until `allPosted` and escrow is funded. Anomalous ER holds that seat. Creator bank transfers are queued; Connect is not live.
