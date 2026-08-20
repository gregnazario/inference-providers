# inference-providers — Catalog Refresh: Claude 5, Gemini 3.x Flashes, OpenRouter Expansion, Superseded-Generation Removal

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Remove superseded generations per Greg (Claude Sonnet/Opus < 5, Qwen < 3.7, Gemini < 3, grok-build-0.1); add Claude Opus 5 / Sonnet 5 / Fable 5 and Gemini 3.7 Flash / 3.6 Flash / 3.5 Flash-Lite with full facts (2026-08-19 research, official sources); expand OpenRouter to cover every canonical model it actually serves (live-list intersect).

**Removal is deletion** (git history preserves everything). Deleting a canonical model requires deleting ALL offerings referencing it (validator enforces).

## Task 1: Removals (12 canonical models + their offerings)

Delete model files: anthropic/claude-3-7-sonnet, claude-sonnet-4-5, claude-sonnet-4-6, claude-opus-4-5, claude-opus-4-6; alibaba/qwen3-max, qwen3-5, qwen3-6-27b, qwen3-6-35b-a3b; google/gemini-2-5-pro, gemini-2-5-flash; xai/grok-build-0-1.
Delete offerings: anthropic/{claude-3-7-sonnet,claude-sonnet-4-5,claude-sonnet-4-6,claude-opus-4-6}; bedrock/{claude-sonnet-4-5,claude-sonnet-4-6,claude-opus-4-6}; zen/{claude-haiku? NO — haiku-4-5 STAYS} — zen: claude-sonnet-4-5, claude-sonnet-4-6, claude-opus-4-5, claude-opus-4-6, grok-build-0-1; openrouter/{claude-sonnet-4-6,gemini-2-5-pro}; dashscope/qwen3-max; ollama/qwen3-5; near-ai/qwen3-6-27b; synthetic/qwen3-6-27b; hetzner/qwen3-6-35b-a3b; google-gemini/{gemini-2-5-pro,gemini-2-5-flash}; google-vertex/{gemini-2-5-pro,gemini-2-5-flash}; xai/grok-build-0-1-responses. (= 24 offering files)
Also: xai provider quirk mentioning grok-code-fast-1 migration — update? Leave (historical). google-gemini OpenAI-compat quirk unchanged.

## Task 2: Claude 5 additions

Canonical models (all: modalities text+image in / text out, open_weights false, family claude, lab anthropic, aliases [] — 5-series IDs are dateless snapshots):
- claude-opus-5: release 2026-07-24, cutoff 2026-05-31, desc "Frontier Opus; adaptive thinking (output_config.effort, default high); disabling accepted only at effort up to high."
- claude-sonnet-5: release 2026-06-30, cutoff 2026-01-31, desc "Mainstream 5-series; adaptive thinking; $2/$10 pricing made permanent 2026-08-10."
- claude-fable-5: release 2026-06-09, cutoff 2026-01-31, desc "Top tier for long-horizon reasoning (2x Opus pricing); thinking cannot be disabled; mandatory 30-day retention; refusals return stop_reason refusal."

Offerings on anthropic/v1-messages (cost in/out/cache_read/cache_write; limits 1_000_000/128_000; source = pricing + announcement URLs, verified 2026-08-19):
- opus-5: 5.00/25.00/0.50/6.25 (5m write)
- sonnet-5: 2.00/10.00/0.20/2.50
- fable-5: 10.00/50.00/1.00/12.50
Reasoning (all three): style "adaptive", default "adaptive", returns "thinking_blocks", must_round_trip "signature", incompatible_with ["temperature","top_p","top_k","prefill"], [reasoning.effort] param "output_config.effort" values ["low","medium","high","xhigh","max"] default "high", notes: "thinking.type disabled→400 on fable-5 (mandatory=true there); opus-5/sonnet-5 accept disabled only at effort ≤ high; enabled+budget_tokens→400 on all 5-series; effort changes invalidate prompt-cache breakpoints; 300k output via Batch beta header output-300k-2026-03-24 (opus/sonnet)." mandatory: fable-5 = true; opus-5/sonnet-5 = false.

Bedrock offerings (3): wire anthropic.claude-{opus,sonnet,fable}-5 on invoke-anthropic, same reasoning clones (no cost — verify later; limits 1_000_000), notes add "Bedrock 5-series IDs carry no -v1:0 suffix; mantle Messages endpoint exists at bedrock-mantle.{region}.api.aws/anthropic/v1/messages."

Zen offerings (3): wire claude-{opus,sonnet,fable}-5 on messages endpoint, adaptive clones (from live list — source https://opencode.ai/zen/v1/models), no cost/limits per zen pattern.

## Task 3: Gemini 3.x flash additions

Canonical (google, family gemini, open false, text+image/text, aliases []):
- gemini-3-7-flash: release 2026-08-13, cutoff 2026-03-31, desc "Flash flagship; minimal thinking level returns an error."
- gemini-3-6-flash: release 2026-07-21, cutoff 2026-03-31, desc "Intro pricing (50% off) through 2026-12-31."
- gemini-3-5-flash-lite: release 2026-07-21, cutoff "" (unpublished), desc "Cheapest tier; default minimal — docs recommend medium/high for multi-step subagent work; temperature/top_p/top_k deprecated (3.6/3.7)."

Offerings google-gemini + google-vertex (6 files): wire = model name, endpoint generate-content, cost: 3.7-flash 0.75/3.75/0.075 cache_read; 3.6-flash same; 3.5-flash-lite 0.30/2.50/0.03; limits 1_048_576/65_536; reasoning: style effort, param generationConfig.thinkingConfig.thinkingLevel, values 3.7 ["low","medium","high"] default "medium" mandatory=true note "minimal unsupported (errors)"; 3.6 ["minimal","low","medium","high"] default "medium" mandatory=false; lite ["minimal","low","medium","high"] default "minimal" mandatory=false + premature-termination note; all: returns "thought_parts", must_round_trip "thought_signature", incompatible_with [] but notes "temperature/top_p/top_k deprecated on 3.6/3.7". Sources: ai.google.dev model pages + thinking doc, verified 2026-08-19.

## Task 4: OpenRouter expansion (live intersect)

Fetch https://openrouter.ai/api/v1/models (keyless). For EVERY canonical model in the post-task-1/2/3 catalog whose OR equivalent exists (map: anthropic/claude-* → anthropic/claude-*; google/gemini-* → google/gemini-*; openai/gpt-*, xai/grok-*, zai/glm-5* (OR has glm-5.1/5.2 — canonical glm-5-2 yes, glm-5-1 NOT canonical, skip), deepseek-v4-*, moonshot kimi-k3/k2.7-code/k2.6/k2.5, minimax-m3/m2.7/m2.5, meta muse-spark-1.2, nvidia nemotron-3-ultra (OR: nvidia/nemotron-3-ultra-550b-a55b), alibaba qwen3-7-plus, mistral-medium-3-5/small (check exact OR ids — only add if unambiguous), thinkingmachines inkling (OR: thinking-machines/inkling?) — only add unambiguous matches), create an openrouter offering: endpoint chat-completions, wire = exact OR id, reasoning = clone of the existing OR pattern (effort param reasoning.effort values ["none","low","medium","high","xhigh","max"] default per family — claude/grok default high, gpt default medium, others medium; mandatory flag matching the family; returns reasoning_content, must_round_trip reasoning_content), no cost/limits, source https://openrouter.ai/api/v1/models verified 2026-08-19. Update existing OR offerings only if their wire changed (gpt-5.6 → luna already done; gpt-5/gpt-5.1/gemini-2-5-pro — the latter two get DELETED in task 1; gpt-5/gpt-5.1 stay).
Also delete OR offering for any canonical removed (task 1 covers claude-sonnet-4-6, gemini-2-5-pro).

## Verification
- `pnpm validate` after each task — final: **40 models, 30 providers, ~160 offerings** (live count is truth; report it).
- Full suite; emit; site build; greps: models page 40 rows; no removed model names anywhere in dist (spot: "Gemini 2.5" absent, "Sonnet 4.6" absent, "Qwen3.6" absent, "Grok Build" absent); new pages exist (claude-fable-5, gemini-3-7-flash); anthropic provider page shows opus-5/sonnet-5/fable-5; openrouter provider page offering count large (~20); standing greps.

## Constraints
English; plain commits ("Remove superseded model generations", "Add Claude 5 family", "Add Gemini 3.x flashes", "Expand OpenRouter to served catalog"), NO trailers; branch `feat/catalog-refresh`.
