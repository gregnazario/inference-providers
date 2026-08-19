# inference-providers — Keyless Sync Targets

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Fetch model lists that need no credentials on every sync run (live-verified 2026-08-19 via unauthenticated probes): openrouter, opencode-zen, opencode-go, ollama-cloud, synthetic, near-ai, io-intelligence, nvidia. Refine the drift-issue rule: fire only on removals (catalog broken), with additions capped + labeled as leads.

**Verified probe facts** (node fetch, no auth, 2026-08-19): the 8 above return 200 with `data[]` bodies; openai/anthropic/xai/mistral/deepseek/minimax/dashscope/moonshot/baseten/fireworks-ai/hetzner/meta return 401. Synthetic's body also carries non-standard fields — verify its `data[].id` mapping against the live response during smoke (fallback: it may need a custom mapper).

## Changes

### packages/sync/src/adapters.ts
- `SyncTarget` gains `auth?: "bearer" | "none"` (default `"bearer"`).
- Mark the 8 verified targets `auth: "none"`.

### packages/sync/src/run.ts
- Keyless targets (`auth === "none"`): always processed, never require env, fetched WITHOUT an Authorization header.
- Keyed targets: unchanged (env required, else missingTargets).
- TDD: update tests first — keyless target with empty env is fetched and produces a report when drift exists; no Authorization header sent for keyless (assert via injected fetchImpl); keyed target still gated; missingTargets excludes keyless.

### .github/workflows/sync.yml (drift-issue step)
- Fire (create/comment) ONLY when at least one provider has non-empty `removed`. When firing, body lists removals (action needed) AND additions capped at 50 entries per provider with "… and N more" truncation, labeled as uncataloged leads. No removals → print "no removals — issue not opened"; exit 0 (additions still land in the artifact).

### Smoke (local, network allowed)
- `pnpm --filter @inference-providers/sync run report` (no env) → processes 8 keyless targets, prints real drift markdown, writes report JSON; confirm each mapper handled its live body (if synthetic's data[] lacks `id`, add a mapper fix in the same commit with a fixture test).
- `pnpm test`, `pnpm validate`, `npx --yes js-yaml .github/workflows/sync.yml`.

## Constraints
English only; plain commits, NO trailers; branch `feat/keyless-sync`; no network in unit tests (live smoke is manual, not in the suite).
