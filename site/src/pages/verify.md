---
layout: ../layouts/Base.astro
title: "Verification — inference-providers"
active: verify
---

# Verification methodology

Every fact in this registry is verified against a source, stamped with a
`verified` date, and re-checked on a cycle. This page documents exactly how to
verify each dimension for any provider — the ones already cataloged and new
ones. CI enforces the mechanical rules; the judgment calls below are on you.

## Universal rules

1. **Source hierarchy.** Official provider docs and console/pricing pages are
   the only acceptable primary sources. Live API responses are the ground
   truth for wire IDs and parameter shapes. Community reports (GitHub issues,
   forums) are last-resort corroboration only — any fact that rests on them
   must carry a `notes` entry saying so.
2. **One surface at a time.** Facts attach to *offerings* (provider × endpoint
   × model), never to "the provider" in general. The same model can behave
   differently on two endpoints of one provider — e.g. an OpenAI-compatible
   endpoint and an Anthropic-compatible one. Never copy facts across surfaces
   without checking.
3. **Unknown ≠ false ≠ free.** Omit anything you cannot verify. A price of `0`
   requires `free = true` plus a source. Uncertain defaults go in `notes`
   with the word "verify" — that word is the registry's flag for "next audit
   must settle this."
4. **Provenance is mandatory.** `cost`, `limits`, and `reasoning` sections each
   carry `[*.source]` with `url` and `verified` (YYYY-MM-DD). Point `url` at
   the *specific* page proving the fact — a pricing page for prices, the
   thinking guide for reasoning params — not the docs root. CI rejects facts
   older than 180 days and warns after 90.
5. **Wire IDs are copied, never typed from memory.** Take model IDs verbatim
   from a live `GET /models` response or the provider's model page — watch for
   date suffixes (`claude-3-7-sonnet-20250219`), region prefixes
   (`us.anthropic.…` on Bedrock), dot forms (`grok-4.6`), and tag forms
   (`gpt-oss:120b-cloud`).

## 1. Verify pricing

**What:** input / output / cache-read / cache-write USD per 1M tokens, per
offering.

**How:**
- Find the provider's canonical pricing page (docs or console). Record
  `input`, `output`, `cache_read`, `cache_write` exactly as published — some
  providers quote cache-hit and cache-miss input prices separately; record the
  cache-hit value in `cache_read`.
- Cross-check with a live response where possible: a small real request plus
  the usage dashboard catches stale-doc errors.
- Watch for: prompt-size tiers (grok-build-0.1 doubles above 200K prompt),
  speed-variant pricing (kimi-k2.7-code-highspeed is exactly 2x), free tiers,
  and subscription surfaces — those have **no** per-token `[cost]` at all;
  they carry a `[plan]` block instead.

**Record:** `[cost]` with `source.url` = the exact pricing page.

## 2. Verify models

**What:** which models a surface serves, and their exact wire IDs.

**How:**
- Primary: the live model-list endpoint for the surface (the registry's sync
  package enumerates them — see `TARGETS` in `packages/sync/src/adapters.ts`).
  With credentials set, run:
  `pnpm --filter @inference-providers/sync run report`
  and read the added/removed diff against the catalog.
- Without credentials: the provider's model catalog page.
- Watch for: snapshot IDs vs aliases (`claude-sonnet-4-5` vs
  `claude-sonnet-4-5-20250929`), retired IDs that still resolve via redirect
  (grok-code-fast-1 → grok-build-0.1), deployment-name indirection (Azure),
  and models that exist in docs but are gated behind entitlements (SuperGrok
  OAuth).

**Record:** `wire_id` exactly as accepted; aliases on the canonical model
file; `status` + `status_date` for deprecations (see kimi-k2.5). A new wire ID
lands as an offering **only** after a human verifies its facts with sources —
sync reports are leads, not facts.

## 3. Verify features (reasoning and capabilities)

**What:** the reasoning parameter spec and the feature flags per offering.

**How:**
- Find the provider's thinking/reasoning docs page. Classify the control
  style: effort enum (`reasoning_effort` / `reasoning.effort`), token budget
  (`thinking.budget_tokens` / `thinkingBudget` / `reasoning.max_tokens`),
  toggle object (`thinking: {type}` — note the exact value set: enabled/disabled
  vs adaptive/disabled vs enabled-only), adaptive, or always-on. Encode style +
  per-model value sets + defaults in `[reasoning]`.
- Check the three follow-ons every time: (a) can thinking be *disabled*
  (`mandatory = true` only when it truly cannot — never combine with `none`
  in values); (b) what must round-trip (`signature`, `thoughtSignature`,
  `encrypted_content`, or replayed `reasoning_content` — dropping these causes
  real 400s); (c) which sampling params conflict — `incompatible_with` is for
  params that *error*, silently-ignored behavior goes in `notes`.
- The gold standard is a live request. Every model page on this site renders
  copy-pasteable curl/Python/TypeScript examples built from the registry's own
  data — run one; if the API rejects it, the data is wrong, file the
  correction.
- Features (`streaming`, `tools`, `structured_output`, `vision`,
  `prompt_caching`) are per-surface: check docs, then confirm with a request.

**Record:** `[reasoning]` blocks with `source.url` = the thinking guide;
`[features]` overrides only where the surface differs from the model default.

## 4. Verify auth model(s)

**What:** every way a provider authenticates requests.

**How:**
- Enumerate the methods from the provider's authentication docs: API key
  (record the exact header scheme — `Authorization: Bearer` vs `x-api-key` vs
  `api-key` vs query param), OAuth (record the flow: browser PKCE vs device
  code; and the token transport — Anthropic OAuth tokens ride `x-api-key`,
  *not* Bearer), request signing (Bedrock SigV4), and subscription keys that
  are distinct credentials from pay-as-you-go keys (Z.ai, Kimi for Coding —
  mixing them is the top 401 cause on those platforms).
- Confirm with a live 401: the error body usually names the header the server
  expected.
- Watch for: required extra headers on every request (`anthropic-version`,
  Azure's classic `api-version`), key prefixes (`sk-ant-`, `sk-sp-`, `sk-`),
  region-bound keys (Kimi .ai vs .cn), and the env-var conventions
  coding tools expect (`ANTHROPIC_BASE_URL` overrides for Anthropic-compat
  surfaces).

**Record:** one `[[auth]]` entry per method with `getting_credentials` prose
and a docs link; mismatches and traps as `[[quirks]]`.

## 5. Verify compatible APIs

**What:** which wire protocol each endpoint speaks, and where it diverges.

**How:**
- Classify each endpoint's protocol: `openai-chat`, `openai-responses`,
  `anthropic-messages`, `google-generate-content`, or `bedrock-converse`.
- The practical test: point the *official* OpenAI or Anthropic SDK at the base
  URL with a key and make a minimal call. If it works unmodified, it's
  compatible; every divergence you hit goes in quirks. Known divergence
  patterns to check: path shape (`/v1/chat/completions` vs root paths vs
  `/api/v1` that doesn't exist), unsupported parameters (rejected vs ignored),
  missing endpoints (no embeddings, no files), non-standard auth on a standard
  protocol, and response-shape differences (`reasoning_content` vs thinking
  blocks vs `message.thinking`).
- Record which operation families exist at all in `api_surfaces` (text,
  streaming, embeddings, files, batch, …) — absence of an embeddings endpoint
  is a fact worth recording (Kimi has none).

**Record:** `[[endpoints]]` with `protocol` per endpoint; divergences as
`[[quirks]]` with the doc or test that proved them.

## Re-verification cycle

- CI fails any fact whose `source.verified` is older than 180 days and warns
  after 90 — that is the forcing function for re-checks.
- The daily sync run (with credentials configured) reports model additions and
  removals; treat every report as a verification ticket.
- Deprecation announcements on provider changelogs should be reflected as
  `status` changes with dates, not left in quirks.
- Anything carrying a "verify" note in `notes` is an open question for the
  next audit — grep for it: `grep -rn "verify" data/`.
