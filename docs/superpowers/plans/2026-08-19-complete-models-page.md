# inference-providers — Complete the Models Page (dates, cutoffs, limits)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Fill every `""` release_date and knowledge_cutoff that the 2026-08-19 research verified, add `[limits]` to the offerings that lack them where a window is documented, and add the two missing Inkling offerings on Baseten (fixing the last zero-offering models). Dates that exist only as third-party corroboration land WITH the fact noted in the model description or stay `""` per the rules below.

**Source rules** (from the research report, flagged per fact):
- Official vendor-domain dates → set `release_date` directly.
- Third-party-only dates (vendor page exists but undated): kimi-k2-5/k2-6/k2-7-code, qwen3.8-27b → set the date AND append to `description`: "Release date per third-party reporting." (The registry's own rule: community-sourced facts must be flagged.)
- Conflicting dates: use the official-source date (grok-4-5 → 2026-07-16 x.ai; glm-5-3 → 2026-08-18 docs.z.ai; mistral-medium-3-5 → 2026-04-28 changelog; qwen3.7-plus → 2026-06-02 with description note "announced Jun 1–3").
- Knowledge cutoffs: only the verified ones — gpt-5-6 "2026-02-16", gemini-3-pro "2025-01-31" (January 2025 → use 2025-01-31? NO — cutoffs are month-granular in sources; our schema wants YYYY-MM-DD. Store month-end ISO: January 2025 → "2025-01-31"; Feb 2026 → "2026-02-28"? The gpt-5.6 cutoff is stated as exact date 2026-02-16 → use it. grok-4-6 "2026-02-01" exact. gemini-3 "January 2025" → "2025-01-31" with no note (convention: month-end). Anthropic training cutoffs (sonnet-4-6 Jan 2026, opus-4-6 Aug 2025, opus-4-5 Aug 2025) → "2026-01-31", "2025-08-31", "2025-08-31". muse-glimmer 2026-01-04 [3P] → set with description note.
- Everything else stays `""` — never invent.

## Task 1: Model files — dates + cutoffs (data edits, values only)

| file | release_date | knowledge_cutoff |
|---|---|---|
| anthropic/claude-sonnet-4-6 | 2026-02-17 | 2026-01-31 |
| anthropic/claude-opus-4-6 | 2026-02-05 | 2025-08-31 |
| anthropic/claude-opus-4-5 | 2025-11-24 | 2025-08-31 |
| zai/glm-4-7 | 2025-12-22 | "" |
| zai/glm-5-2 | 2026-06-16 | "" |
| zai/glm-5-3 | 2026-08-18 | "" |
| minimax/minimax-m2-5 | 2026-02-12 | "" |
| minimax/minimax-m3 | 2026-06-01 | "" |
| moonshot/kimi-k3 | 2026-07-22 | "" |
| moonshot/kimi-k2-7-code | 2026-06-12 [3P note] | "" |
| moonshot/kimi-k2-6 | 2026-04-20 [3P note] | "" |
| moonshot/kimi-k2-5 | 2026-01-27 [3P note] | "" |
| xai/grok-4-5 | 2026-07-16 | "" |
| xai/grok-4-6 | 2026-08-12 | 2026-02-01 |
| xai/grok-build-0-1 | 2026-05-29 | "" |
| mistral/mistral-medium-3-5 | 2026-04-28 | "" |
| mistral/mistral-small-latest | 2026-03-16 | "" |
| alibaba/qwen3-max | 2026-01-23 | "" |
| alibaba/qwen3-7-plus | 2026-06-02 [note "announced Jun 1–3"] | "" |
| alibaba/qwen3-5 | 2026-02-15 | "" |
| alibaba/qwen3-8-27b | 2026-08-14 [3P note] | "" |
| alibaba/qwen3-6-27b | 2026-04-16 | "" |
| alibaba/qwen3-6-35b-a3b | 2026-04-14 | "" |
| meta/muse-spark-1-2 | 2026-08-05 | "" |
| meta/muse-glimmer-30b | 2026-08-10 | 2026-01-04 [3P note] |
| nvidia/nemotron-3-ultra | 2026-06-04 | "" |
| thinkingmachines/inkling | 2026-07-15 | "" |
| thinkingmachines/inkling-small | 2026-07-29 | "" |
| openai/gpt-5-6 (already dated) | — | 2026-02-16 |
| google/gemini-3-pro (already dated) | — | 2025-01-31 |

[3P note] = append " Release date per third-party reporting." to description (for muse-glimmer cutoff: " Knowledge cutoff per third-party model-card summaries."). qwen3-7-plus note: " Announced June 1–3, 2026 (sources differ on exact day)."

## Task 2: Offering limits where documented (fill `[limits]` on offerings that lack them — source = the research's official docs URLs, verified 2026-08-19)

- anthropic native offerings missing output/context: claude-sonnet-4-6/opus-4-6 currently `context = 200_000` — UPDATE to 1_000_000 + output 128_000 (announcement). claude-opus-4-5: context 200_000 output 64_000 (already? check file; set if missing). claude-3-7-sonnet/haiku-4-5: leave as-is (200k correct).
- zai/glm-4-7 (baseten glm-4.7 offering? exists? NO — glm-4-7 has no offering with limits except fireworks glm-4p7 (none). baseten doesn't serve glm-4.7 (serves GLM-4.7? yes! `zai-org/GLM-4.7` — offering exists w/o limits? check: baseten glm offerings only glm-5-2. ADD limits to fireworks glm-4p7: context 200_000, output 128_000, source docs.z.ai glm-4.7.)
- glm-5-2 baseten offering: add output 128_000 (context 1_048_576 already there? check — add if missing).
- minimax-m2-5: minimax native offering lacks limits? (check; Moonshot-style) — set context 204_800 [3P — note in reasoning notes? limits have source field; use openrouter URL as source with note? Our rule: community-sourced must be flagged. Put limits on the ollama/fireworks minimax-m2p7? m2.5 ≠ m2.7. minimax provider m2-5 offering: add context 204_800 with source = openrouter.ai/minimax/minimax-m2.5 and description-level flag impossible on offerings → put note in `[limits]`? Schema has no notes on limits. Decision: skip m2-5 context (3P-only) → leave "—".) 
- minimax-m3: minimax offering — add context 1_000_000 (official blog), output "" omitted.
- kimi offerings (moonshot native): kimi-k2-6/k2-7-code/k2-5 have limits 262_144 ✓. kimi-k3 1_048_576 ✓.
- grok-4-5/grok-4-6 xai offerings: add context 500_000 (docs.x.ai models) — both chat+responses.
- grok-build-0-1: has 256_000 ✓.
- mistral offerings: add context 256_000 (docs.mistral.ai models) to both.
- muse-spark-1-2 meta offerings: context 1_048_576 output 131_072 ✓ already.
- nemotron-3-ultra: baseten offering has 202k? research said 202k (Baseten 202,000?) vs NVIDIA "up to 1M" — baseten file has limits? Check; if none add context 1_000_000 output "" w/ source nvidia blog. If baseten has 202_752 leave.
- inkling: NEW baseten offerings (Task 3) carry limits.
- qwen3-* : qwen3-max dashscope offering — add context 262_144 [3P]? skip (3P). qwen3.8-27b hetzner has 262_144 ✓. qwen3.6-35b hetzner 262_144 ✓. qwen3.6-27b near/synthetic: near has 262_144 ✓ (added in wave). synthetic qwen3-6-27b: no limits (synthetic pattern) — fine, model shows via near.

## Task 3: Baseten Inkling offerings (2 NEW files)

`data/providers/baseten/offerings/inkling.toml` + `inkling-small.toml`: model thinkingmachines/inkling|inkling-small, wire `thinkingmachines/inkling` / `thinkingmachines/inkling-small`, endpoint chat-completions, status ga, cost inkling 1.00/4.05/0.17 + inkling-small 0.50/1.20/0.10 (cache_read; from baseten pricing page — source https://www.baseten.co/pricing/), limits context 1_048_576 output 32_768 (source = baseten pricing/docs page listing), reasoning: effort `reasoning_effort` values [none, low, high] default high (Baseten reasoning doc: inkling default high; none disables) mandatory=false default on, returns reasoning_content, must_round_trip reasoning_content (billed as completion; message.reasoning_content), notes "Billed as completion tokens; enable_thinking unvalidated per Baseten docs" — source https://docs.baseten.co/inference/model-apis/reasoning.

## Verification
- `pnpm validate` → 46 models, 30 providers, **148 offerings** (146+2).
- Models page: release column has NO "—" rows (all 46 dated); context column "—" only for minimax-m2-5 (accepted, 3P-only) — verify via built HTML row scan in the report.
- Full suite + site build + standing greps.

## Constraints
English; plain commits ("Fill verified release dates and knowledge cutoffs", "Fill documented context limits and add Baseten Inkling offerings"), NO trailers; branch `feat/complete-models-page`; conflicting dates resolved to official sources as specified; third-party-flagged facts carry the description note.
