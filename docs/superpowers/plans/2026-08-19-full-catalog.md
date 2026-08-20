# inference-providers — Full Catalog: No Age Filter, Sparse Providers Filled

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** (1) Remove the 12-month age filter — all 45 models return to the main models view; (2) populate sparse providers from verified wire IDs: opencode-zen (24 offerings), opencode-go (16), aws-bedrock (+2), google-vertex (+2), plus offerings for all three zero-offering models (nvidia, io-intelligence, near-ai, synthetic). All Zen/Go wire IDs verified against the LIVE model lists fetched 2026-08-19 (recorded below); reasoning specs clone the native provider's offering for the same model on the matching protocol surface (Zen's documented no-normalization behavior: each surface speaks the upstream wire format).

**Counts after:** 45 models, 30 providers, **147 offerings** (98 + 24 + 16 + 1 + 2 + 2 + 2 + 1 + 1).

## Task 1: Remove age filtering (presentation revert)

- Delete `site/src/lib/freshness.ts`; models index + archive pages: `modelRows.ts` drops the classify split — index shows ALL models; DELETE `site/src/pages/models/archive.astro`; remove the banner block from `models/[id].astro`; remove archived chips from `providers/[id].astro`; homepage: full counts (no "current" qualifier, no archive line) — stat line becomes "45 models · 30 providers · 147 offerings" (auto-computed); download page: drop the current-filter note; keep the backfilled release_dates in data (harmless; the release column still sorts).
- Table controls, providers popover, search, help all stay.

## Task 2: opencode-zen — 24 offerings

Endpoint mapping per Zen docs: Claude → `messages` (anthropic protocol), GPT+Grok → `responses`, everything else → `chat-completions`. Each offering's `[reasoning]` clones the NATIVE provider's offering for that model ADAPTED to the surface protocol (anthropic surface → `thinking` object; responses surface → `reasoning.effort`; chat surface → the native chat param), `source = { url = "https://opencode.ai/zen/v1/models", verified = "2026-08-19" }` (live list) and a short note "Reasoning follows the upstream wire format on this surface." No `[cost]` (Zen bills at cost; per-model prices not enumerated in docs) EXCEPT none — omit cost everywhere.

| model (canonical) | wire_id | endpoint |
|---|---|---|
| anthropic/claude-haiku-4-5 | claude-haiku-4-5 | messages |
| anthropic/claude-sonnet-4-5 | claude-sonnet-4-5 | messages |
| anthropic/claude-sonnet-4-6 | claude-sonnet-4-6 | messages |
| anthropic/claude-opus-4-5 | claude-opus-4-5 | messages |
| anthropic/claude-opus-4-6 | claude-opus-4-6 | messages |
| openai/gpt-5 | gpt-5 | responses |
| openai/gpt-5-1 | gpt-5.1 | responses |
| openai/gpt-5-6 | gpt-5.6-luna | responses |
| openai/gpt-5-6 | gpt-5.6-sol | responses |
| openai/gpt-5-6 | gpt-5.6-terra | responses |
| xai/grok-4-5 | grok-4.5 | responses |
| xai/grok-4-6 | grok-4.6 | responses |
| xai/grok-build-0-1 | grok-build-0.1 | responses |
| deepseek/deepseek-v4-flash | deepseek-v4-flash | chat-completions |
| deepseek/deepseek-v4-pro | deepseek-v4-pro | chat-completions |
| zai/glm-5-2 | glm-5.2 | chat-completions |
| moonshot/kimi-k3 | kimi-k3 | chat-completions |
| moonshot/kimi-k2-7-code | kimi-k2.7-code | chat-completions |
| moonshot/kimi-k2-6 | kimi-k2.6 | chat-completions |
| minimax/minimax-m3 | minimax-m3 | chat-completions |
| minimax/minimax-m2-7 | minimax-m2.7 | chat-completions |
| minimax/minimax-m2-5 | minimax-m2.5 | chat-completions |
| meta/muse-spark-1-2 | muse-spark-1.2 | chat-completions |
| nvidia/nemotron-3-ultra | nemotron-3-ultra-free | chat-completions (note: free tier) |

Reasoning clones: claude-* → anthropic provider offerings (budget/adaptive per model, budget min 1024, round-trip signature); gpt-5 → effort [minimal..high] default medium; gpt-5.1 → [none,low,medium,high] default none; gpt-5.6-* → [none..xhigh] default medium (+max for sol? use the responses shape [none,low,medium,high,xhigh,max] default medium, note variant differences); grok-4.5/4.6 → mandatory default high ([low,medium,high] / +xhigh); grok-build → style none; deepseek → effort+toggle combo (chat); glm-5.2 → toggle enabled/disabled default on (upstream GLM wire on openai-chat: thinking.type) — note verify; kimi-k3 → effort [none? — moonshot native is [low,high,max] mandatory... on zen's CHAT surface kimi speaks thinking.type per community evidence: use toggle thinking.type enabled/disabled default on + verify note]; kimi-k2.7-code → toggle on-only mandatory (upstream rule); kimi-k2.6 → toggle default on; minimax-m3 → toggle adaptive/disabled; m2.7/m2.5 → always_on mandatory; muse-spark-1.2 → effort [minimal..xhigh] mandatory (upstream); nemotron-free → toggle enable_thinking (upstream NIM wire) + verify note.

## Task 3: opencode-go — 16 offerings

Endpoints per Go docs routing: grok/gpt → `go-responses`; glm/kimi/deepseek → `go-chat-completions`; minimax/qwen → `go-messages`. Same cloning rules; source = live list `https://opencode.ai/zen/go/v1/models`.

| model | wire_id | endpoint |
|---|---|---|
| openai/gpt-5-6 | gpt-5.6-luna | go-responses |
| xai/grok-4-5 | grok-4.5 | go-responses |
| deepseek/deepseek-v4-flash | deepseek-v4-flash | go-chat-completions |
| deepseek/deepseek-v4-pro | deepseek-v4-pro | go-chat-completions |
| zai/glm-5-2 | glm-5.2 | go-chat-completions |
| zai/glm-5-3 | glm-5.3 | go-chat-completions (always_on mandatory — upstream rule) |
| moonshot/kimi-k3 | kimi-k3 | go-chat-completions |
| moonshot/kimi-k2-7-code | kimi-k2.7-code | go-chat-completions (toggle on-only mandatory) |
| moonshot/kimi-k2-6 | kimi-k2.6 | go-chat-completions (toggle default on) |
| minimax/minimax-m3 | minimax-m3 | go-messages (toggle adaptive/disabled) |
| minimax/minimax-m2-7 | minimax-m2.7 | go-messages (always_on) |
| minimax/minimax-m2-5 | minimax-m2.5 | go-messages (always_on) |
| meta/muse-spark-1-2 | muse-spark-1.2 | go-chat-completions (effort mandatory) |
| meta/muse-spark-1-2 | muse-spark-1.2-contributor | go-chat-completions (same shape; contributor note) |
| alibaba/qwen3-7-plus | qwen3.7-plus | go-messages (toggle enable_thinking true/false default on — DashScope wire; verify note) |
| alibaba/qwen3-7-plus | qwen3.7-max | go-messages — NOTE: qwen3.7-max is a DIFFERENT variant from qwen3.7-plus; our canonical qwen3-7-plus is the plus variant. Do NOT map max to it. SKIP qwen3.7-max → 15 offerings (drop that row). |

## Task 4: bedrock + vertex + zero-offering fixes (7 offerings)

- aws-bedrock: claude-haiku-4-5 (wire anthropic.claude-haiku-4-5-20251001-v1:0) + claude-opus-4-6 (wire anthropic.claude-opus-4-6-v1) on invoke-anthropic; reasoning clones sonnet-4-6 bedrock offering (haiku: budget; opus-4-6: adaptive style).
- google-vertex: gemini-2-5-flash (wire gemini-2.5-flash; budget 1–24576 zero_means_off, clone gemini api offering) + gemini-3-pro (wire gemini-3-pro-preview; effort [low,high] mandatory — clone; note "Vertex id — verify").
- nvidia: meta/llama-3-3-70b (wire meta/llama-3.3-70b-instruct; style none — Llama 3.3 is not a reasoning model).
- io-intelligence: llama-3-3-70b (wire meta-llama/Llama-3.3-70B-Instruct; style none) + llama-4-maverick (wire meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8; style none — Llama 4 non-reasoning).
- near-ai: qwen3-6-27b (wire Qwen/Qwen3.6-27B-FP8; toggle chat_template_kwargs.enable_thinking default on — NEAR docs rule).
- synthetic: qwen3-6-27b (wire hf:Qwen/Qwen3.6-27B; adaptive + verify note per synthetic pattern).

## Verification
- `pnpm validate` after each task: 45/30/122 → 45/30/137 → 45/30/137+... final **45/30/147** (zen 24 → 122; go 15 → 137; task 4 +10? bedrock 2 + vertex 2 + nvidia 1 + io 2 + near 1 + synthetic 1 = 9... +24+15+9 = 48 → 98+48 = 146. Recount: 98+24=122, +15=137, +9=146. FINAL: **45 models, 30 providers, 146 offerings** — use live validate output as truth and fix this plan's arithmetic in the commit if needed).
- Full test suite; site build: models index shows all 45 rows incl. "Gemini 2.5 Pro"; homepage stat line "45 models · 30 providers · 146 offerings"; no /models/archive/ (redirect or 404 acceptable — remove nav links); zen provider page lists 24 offerings; go 15; zero-offering models now have ≥1 (popovers non-zero everywhere); standing greps (search form, help, prov-pop, table-enhance).

## Constraints
English; plain commits ("Show all models without age filtering", "Populate OpenCode Zen and Go from live model lists", "Fill sparse providers and zero-offering models"), NO trailers; branch `feat/full-catalog`; unknown pricing omitted; every new source URL is the live list or upstream docs; verify-notes where a reasoning clone crosses protocol surfaces.
