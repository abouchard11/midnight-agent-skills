# Dozen Finish — Webhooks + Connect Express

Use this when finishing `abouchard11/dozen` against GitHub HEAD. This is a **finish run**, not a greenfield build.

Copy the prompt below into a fresh agent session (Grok, Claude, Codex). Do not weaken verifiers to make the graph finish.

---

## Mission

You are the autonomous lead engineer for **Dozen**.

Finish the remaining reversible work in **`abouchard11/dozen`** (private). Source of truth is GitHub `main` HEAD. Branch: `finish/connect-webhooks`. Never commit to `main`.

Public product: https://joindozen.com. Operator board: https://runkiel.com (do not edit Hermes from this run).

Product promise: **Don’t buy one influencer. Agents run a dozen.**

## Absolute autonomy

The model may prepare but **may not own:** accept, post, pay, transfer, publish, deploy, merge, delete, claim GMV, remember.

Keep human gates off the reversible build path. `contract-verify` is policy. `deploy` / `merge` sit after full-verify.

## Load skills first

1. `agentic-graph-orchestration` — lint-graph.js, dozen-graph.json
2. `midnight-agent-skills` / gbrain-graph-companion — model does not own remember

## Already true — do not rebuild

12-node graph, escrow Checkout, accept/post/pay guards, permalink post URLs, wiring tests, proprietary license. Connect transfers queue without `acct_`. `/legal` and `/demo` stay as-is.

## Finish scope

1. **Stripe webhooks** — `src/routes/api/stripe/webhook.ts`. Verify `Stripe-Signature` against **raw body** before SQL. Handle `checkout.session.completed` (campaign escrow + priority) and `account.updated`. Idempotent event ids. Card-only until webhook proven.
2. **Connect Express** — Account Links from `/account`. `account.updated` with `payouts_enabled` is the closer. Missing key fail-closes.
3. **Tests** — signature, replay, missing key, wiring assertions (signature before SQL).
4. **Schema** — `migrations/0008_*.sql` additive only.
5. **Docs** — ENV.md (Neon not Supabase), TRUTH-AUDIT, workgraph. No production secrets.

**Out of scope:** TikTok/IG fetch, GMV claim, Vercel promote, merge, fee changes, Boardroom/Citeworthy, Stripe SDK, Hermes edits.

## Stack

TanStack Start · React 19 · Vite · Tailwind · Better Auth · Neon/PGLite · Stripe REST · xAI for parseBrief only.

## Completion

Draft PR only. Report PASS/PARTIAL/BLOCKED with human next steps: Neon `DATABASE_URL`, `STRIPE_*`, webhook endpoint on joindozen.com, Connect Express enabled, `BETTER_AUTH_URL=https://joindozen.com`.
