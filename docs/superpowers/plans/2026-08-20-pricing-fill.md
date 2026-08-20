# inference-providers — Fill All Missing Pricing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Fill `[cost]` on every fillable offering (~110 of 166 gaps). Two source classes: (A) **live public APIs** — OpenRouter (48 offerings), IO Intelligence (2), NEAR AI (3 gemma/deepseek/glm — glm-5-2 already has cost; check which near offerings lack it); (B) **research-verified first-party pages** (2026-08-20 research, cited). Subscription surfaces stay costless BY DESIGN: opencode-go, synthetic, kimi-coding, alibaba-token-plan, qwen-coding-plan, minimax-token-plan, nvidia (free tier), ollama-cloud (usage-level), poolside (free period), cohere command-a-plus (free-until-limits), zen free-tier entries, gemma-4 on google-gemini (free tier only — no paid tier exists). Z.ai-coding-plan glm offerings: subscription — costless.

## Task 1: API-driven fills (script, then hand-verify 8 samples)

Write a one-off node script (in /tmp, NOT committed) that:
1. Fetches https://openrouter.ai/api/v1/models — for each of our openrouter offerings lacking `[cost]`, read `pricing.prompt/completion/input_cache_read` (per-token USD), multiply ×1e6, round to ≤6 significant decimals, and insert a `[cost]` block (input/output/cache_read; `free = true` only if all are 0 — some OR entries are :free but we didn't catalog those; `:batch`/`:free` suffixed ids not cataloged). Source: `{ url = "https://openrouter.ai/api/v1/models", verified = "2026-08-20" }`. TOML insert position: after status_date, before [limits]/[reasoning] per house layout.
2. Same for io-intelligence 2 offerings (meta-llama ids — input_token_price/output_token_price/cache_read_token_price from https://api.intelligence.io.solutions/api/v1/models): Llama-3.3 → 0.638/0.768/0.319; Maverick → 0.274/0.8992/0.137.
3. near-ai offerings lacking cost (check: gemma-4 has? glm-5-2 has 1.4/4.4): fill from https://cloud-api.near.ai/v1/models pricing.input/output (per-Mtok fields already) for any missing.
Script must skip files that already have [cost]; print a per-file summary. After running: hand-verify 8 sampled OR files against the fetched JSON (paste in report), `pnpm validate`.

## Task 2: First-party fills from the research table (values below verbatim; source = the research's URL; verified 2026-08-20)

**xai** grok-4.5 chat+responses (4 files? 2 files each w/ cost): input 2.00 output 6.00 cache_read 0.30, notes "Doubles for prompts over 200k." grok-4.6 ×2: 2.00/6.00/0.50 same note. Source https://docs.x.ai/docs/models.
**openai**: gpt-5-1 chat+responses: 1.25/10.00/0.125. gpt-5.6 chat (the plain id — price the TERRA tier per OpenAI's default mapping? NO — plain gpt-5.6 has no price; the chat offering wire is "gpt-5.6"… OpenAI ships only variants. Our gpt-5-6-chat/responses offerings with wire "gpt-5.6": set cost from TERRA (the mid tier) with notes "Plain gpt-5.6 id bills as Terra; variant prices: sol 5/30, luna 0.2/1.2, tiered ≥200k(?) — verify mapping" — actually research gives long-ctx thresholds per variant. Simplest honest: terra short-ctx 2.00/12.00/0.20 + note. luna/sol codex offerings: luna 0.20/1.20/0.02, sol 5.00/30.00/0.50, notes "Short-ctx tier; long-ctx doubles." o3 chat+responses: 2.00/8.00/0.50. gpt-5-responses (has cost? it has $1.25/$10 — leave). Source https://developers.openai.com/api/docs/pricing.
**zai**: glm-4-6: 0.60/2.20/0.11; glm-5-3: 1.40/4.40/0.26. Source https://docs.z.ai/guides/overview/pricing.
**mistral**: medium-3.5: 1.50/7.50 (no cache); small: 0.15/0.60. Source https://mistral.ai/pricing/api/.
**minimax**: m3: 0.30/1.20/0.06 notes "50% off ≤512k promo made permanent; >512k doubles; Priority tier 1.5x."; m2-5: 0.30/1.20/0.03/0.375 cache_write. Source https://platform.minimax.io/docs/guides/pricing-paygo.
**deepseek** v4 flash+pro chat (2): flash 0.44/1.32/0.014, pro 1.32/3.96/0.044, notes "Peak hours; off-peak is half. Cache hit = input cache-read." anthropic clones (2): same values, source https://platform.kimi.ai/docs/guide/claude-code-kimi? NO — deepseek anthropic endpoint priced same as native (no separate page): use native values + note "Same rates as the native endpoint (no separate /anthropic pricing published)."
**bedrock** 4: opus-5 5.00/25.00/0.50/6.25; sonnet-5 2.00/10.00/0.20/2.50; fable-5 10.00/50.00/1.00/12.50; haiku-4-5 1.00/5.00/0.10/1.25. Source https://aws.amazon.com/bedrock/pricing/ (note "US East on-demand").
**azure-foundry** gpt-5.6@v1-responses: terra-tier 2.00/12.00/0.20/2.50 + variant note. Source https://azure.microsoft.com/en-us/blog/gpt-5-6-now-available-in-microsoft-foundry/.
**cohere** command-a-reasoning: NO PAYG price (free-until-limits) — add notes only? Cost stays absent; append to reasoning notes "Free until rate limits; no published PAYG price." command-a-plus: confirm costless (already noted in description).
**google-gemini** gemini-3-pro: 2.00/12.00/0.20 notes "Tiered: >200k doubles. Gemini 3 Pro text pricing now carried by gemini-3.1-pro-preview." Source https://ai.google.dev/gemini-api/docs/pricing. gemma-4: stays costless (free tier only) — append reasoning note "Free tier only; no paid tier."
**google-vertex** gemini-3-pro: same values, same source.
**moonshot** kimi-k2.7-code@anthropic: 0.95/4.00/0.19 note "Same as native rates (Claude Code guide links the native pricing page)." Source https://platform.kimi.ai/docs/pricing/chat-k27-code.
**dashscope** qwen3.7-plus both endpoints (2): 0.40/1.60 notes "≤256k tier; 256k–1M is 1.20/4.80; cache hits billed at 10% of input (rule-based); limited-time promos may apply." Source https://www.alibabacloud.com/help/en/model-studio/model-pricing.
**stepfun** 2: 3.5-flash 0.10/0.30/0.02; 3.7-flash 0.20/1.15/0.04. Source https://platform.stepfun.ai/docs/en/guides/pricing/details.
**zen** (docs page table — the research extracted it): claude-fable-5 10/50/1/12.5; claude-opus-5 5/25/0.5/6.25; claude-sonnet-5 2/10/0.2/2.5; claude-haiku-4-5 1/5/0.1/1.25; gpt-5.6-sol 5/30/0.5 (+note 272k tier doubles); terra 2/12/0.2; luna 0.2/1.2/0.02; gpt-5 + gpt-5.1 1.07/8.5/0.107 (note "Below OpenAI direct — Zen at-cost pass-through"); grok-4.5 2/6/0.3 (200k note); grok-4.6 2/6/0.5 (200k note); deepseek-v4-pro 1.32/3.96 (+peak/off-peak note); deepseek-v4-flash 0.44/1.32 (same note); glm-5.2 1.4/4.4/0.26; kimi-k3 3/15/0.3; kimi-k2.7-code 0.95/4/0.19; kimi-k2.6 0.95/4/0.16; minimax m3/m2.7/m2.5 0.3/1.2/0.06 each; muse-spark-1.2 1.25/4.25/0.15 (note "Paid tier; Contributor-Free excluded"). nemotron free-tier entries: costless (they're -free ids) — leave. Source https://opencode.ai/docs/zen.

## Task 3: Verify + ship
- `pnpm validate` (55/34/206), full suite, rm -rf dist && emit && site build.
- Cost-coverage report: node count of offerings with/without cost by provider; expected no-cost remainder = subscription/free surfaces ONLY (go 19, synthetic 3, kimi-coding 4, token-plan 3, qwen-plan 1, minimax-plan 2, nvidia 7, ollama 11, poolside 2, cohere 2, gemma gemini+vertex 2, zen free 2) ≈ 58.
- Greps: model pages show prices (grok-4.6 "2.00 / 6.00", zen kimi-k3 "3.00 / 15.00", OR laguna shows OR price, bedrock fable "10.00 / 50.00"); standing greps.

## Constraints
English; plain commits ("Fill pricing from live provider APIs", "Fill first-party pricing from official pages"), NO trailers; branch `feat/pricing-fill`; every cost block carries source + verified 2026-08-20; zero = only with free=true; no invented numbers — where a plain-id bills as a variant (gpt-5.6), price the documented default tier and note the mapping; script NOT committed.
