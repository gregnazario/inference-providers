# ai-providers New Providers Implementation Plan (Kimi, xAI OAuth, Ollama Cloud)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Moonshot Kimi (pay-as-you-go) + Kimi for Coding (subscription), xAI OAuth (SuperGrok) auth + grok-build-0.1, and Ollama Cloud — 10 new canonical models, 3 new provider surfaces, 21 new offerings, 2 new sync targets.

**Architecture:** Pure data entry into the existing validated pipeline plus one small sync-adapter code change. All facts from the 2026-08-19 research reports (sources cited per fact); unknowns omitted; uncertain defaults flagged in `notes` with "verify".

**Tech Stack:** TOML under `data/`, verified via `pnpm validate`; sync adapters in `packages/sync`.

## Global Constraints

- English only; plain commits, NO attribution trailers; branch `feat/new-providers` (already created — skip branch steps in briefs).
- TOML layout: root keys (incl. api_surfaces) before tables; offering root keys before [cost]/[limits]/[reasoning]; reasoning base keys before sub-blocks.
- All new sources use `verified = "2026-08-19"`. Unknown = omitted/"" — never invented. Uncertain defaults go in notes with "verify".
- Totals after this plan: 34 models, 21 providers, 65 offerings.

---

### Task 1: 10 new canonical models

**Files:** `data/models/moonshot/{kimi-k3,kimi-k2-7-code,kimi-k2-6,kimi-k2-5}.toml`, `data/models/xai/grok-build-0-1.toml`, `data/models/openai/{gpt-oss-120b,gpt-oss-20b}.toml`, `data/models/alibaba/qwen3-5.toml`, `data/models/zai/glm-5-2.toml`, `data/models/minimax/minimax-m2-7.toml`

All with `release_date = ""`, `retired_date = ""`, `knowledge_cutoff = ""`, `license = ""` unless noted. Source URLs in descriptions are not needed (models carry no provenance sections).

- `moonshot/kimi-k3`: name "Kimi K3", family kimi, aliases ["k3"], open_weights false, hf_repo "", description "Flagship 2.8T-param MoE (16/896 active) with vision; always-on reasoning; weights open-sourcing promised 2026-07-27.", modalities input [text, image] output [text]
- `moonshot/kimi-k2-7-code`: name "Kimi K2.7 Code", family kimi, aliases ["kimi-k2.7-code"], open false, description "Current coding model (~180 tok/s); text/image/video input; thinking.type accepts only enabled.", modalities input [text, image, video] output [text]
- `moonshot/kimi-k2-6`: name "Kimi K2.6", family kimi, aliases ["kimi-k2.6"], open false, description "General-purpose multimodal with hybrid thinking (enabled/disabled) and Preserved Thinking (keep=all).", input [text, image] output [text]
- `moonshot/kimi-k2-5`: name "Kimi K2.5", family kimi, aliases ["kimi-k2.5"], open false, description "Closed to new registrations; platform sunset 2026-08-31.", input [text, image] output [text]
- `xai/grok-build-0-1`: name "Grok Build 0.1", family grok, aliases ["grok-code-fast-1"], open false, description "Fast coding model served on /v1/responses; replaced grok-code-fast-1 (retired 2026-05-15, slug auto-redirects).", input [text] output [text]
- `openai/gpt-oss-120b`: name "GPT-OSS 120B", family gpt-oss, aliases ["gpt-oss-120b"], open_weights true, hf_repo "openai/gpt-oss-120b", description "117B-active MoE open-weight reasoning model; thinking cannot be disabled (low/medium/high only).", input [text] output [text]
- `openai/gpt-oss-20b`: name "GPT-OSS 20B", family gpt-oss, aliases ["gpt-oss-20b"], open true, hf_repo "openai/gpt-oss-20b", description "21B MoE open-weight reasoning model; thinking cannot be disabled.", input [text] output [text]
- `alibaba/qwen3-5`: name "Qwen3.5", family qwen3, aliases ["qwen3.5"], open true, hf_repo "", description "397B (A17B) flagship with vision and hybrid thinking.", input [text, image] output [text]
- `zai/glm-5-2`: name "GLM-5.2", family glm, aliases ["glm-5.2"], open true, hf_repo "", description "756B open-weight model, 976K context.", input [text] output [text]
- `minimax/minimax-m2-7`: name "MiniMax M2.7", family minimax-m, aliases ["MiniMax-M2.7", "minimax-m2.7"], open true, hf_repo "", description "229B open-weight model; replaced M2.5 on Ollama Cloud 2026-07-31.", input [text] output [text]

- [ ] Write the 10 files; `pnpm validate` → `OK: 34 models, 18 providers, 44 offerings`
- [ ] Commit: "Seed canonical models for moonshot, xai, openai, alibaba, zai, minimax"

### Task 2: moonshot provider + 6 offerings

**Files:** `data/providers/moonshot/provider.toml` + `offerings/{kimi-k3,kimi-k2-7-code,kimi-k2-7-code-highspeed,kimi-k2-6,kimi-k2-5}.toml` (chat endpoint) + `offerings/kimi-k2-7-code-anthropic.toml`

provider.toml: id moonshot, name "Moonshot Kimi", kind first_party, api_surfaces ["text","streaming","files","batch"]; urls docs https://platform.kimi.ai/docs/overview, console https://platform.kimi.ai/console/api-keys, pricing https://platform.kimi.ai/docs/models; auth api-key Bearer env ["MOONSHOT_API_KEY"], getting_credentials "Create keys at the Kimi Open Platform (intl) or platform.kimi.com (CN, Chinese phone required). Keys are region-bound: .ai and .cn are not interchangeable."; endpoints chat-completions (https://api.moonshot.ai, /v1/chat/completions, openai-chat) + anthropic (https://api.moonshot.ai, /anthropic, anthropic-messages). Quirks (each with docs URL):
1. "China base: https://api.moonshot.cn/v1 (console platform.kimi.com). No embeddings endpoint. Partial Mode (partial: true) and ms:// file references are Moonshot extensions. Context caching is automatic for prompts over 256 tokens. Rate limits tier by cumulative top-up." docs https://platform.kimi.ai/docs/overview
2. "Sampling params are fixed on k-series models (temperature 1.0, top_p 0.95; k2.6 uses 0.6 outside thinking mode) and error if set otherwise; only moonshot-v1 allows modifying temperature. tool_choice required is k3-only." docs https://platform.kimi.ai/docs/guide/use-thinking-models
3. "The /anthropic endpoint (for Claude Code et al.) uses OPEN PLATFORM keys — never Kimi Code keys. WebFetch is unsupported there; WebSearch 400s on kimi-k2.7-code with thinking off." docs https://platform.kimi.ai/docs/guide/claude-code-kimi

Offerings (chat endpoint; verified 2026-08-19; cost/limits from pricing pages):
- kimi-k3: cost 3.00/15.00 cache_read 0.30; limits context 1_048_576; reasoning style effort mandatory=true default on, effort param reasoning_effort values [low, high, max] default max, notes "Always-on reasoning; do NOT pass thinking on k3. Preserved Thinking always on. Claude Code /effort low/medium/high/xhigh/max maps to low/high/max.", returns reasoning_content, must_round_trip reasoning_content, incompatible_with [temperature, top_p, n, presence_penalty, frequency_penalty]; source https://platform.kimi.ai/docs/guide/use-reasoning-effort
- kimi-k2-7-code: cost 0.95/4.00 cache_read 0.19; limits context 262_144; style toggle mandatory=true default on (thinking.type accepts ONLY enabled — disabled errors; thinking.keep treated as all), toggle on "enabled" off "", returns reasoning_content, must_round_trip reasoning_content, incompatible_with sampling list; source https://platform.kimi.ai/docs/guide/use-thinking-models
- kimi-k2-7-code-highspeed: wire kimi-k2.7-code-highspeed, cost 1.90/8.00 cache_read 0.38, same shape as above, notes "~180-260 tok/s; exactly 2x pricing."
- kimi-k2-6: cost 0.95/4.00 cache_read 0.16; limits 262_144; style toggle default on, on enabled off disabled, notes "thinking.keep: null (default, drops reasoning history) or all (Preserved Thinking).", returns reasoning_content, must_round_trip reasoning_content, incompatible_with sampling; source use-thinking-models
- kimi-k2-5: status deprecated status_date 2026-08-31; cost 0.60/3.00 cache_read 0.10; limits 262_144; style toggle default on (note "Default thinking state not documented; verify."), on enabled off disabled, returns reasoning_content, must_round_trip "" (k2.5 has no keep param — round-trip rule not documented; use "" with note); source https://platform.kimi.ai/docs/models
- kimi-k2-7-code-anthropic: endpoint anthropic; style toggle mandatory=true default on; same wire id kimi-k2.7-code; source claude-code-kimi doc

- [ ] Write 7 files; `pnpm validate` → `OK: 34 models, 19 providers, 50 offerings`
- [ ] Commit: "Seed moonshot Kimi surface"

### Task 3: kimi-coding provider + 4 offerings

**Files:** `data/providers/kimi-coding/provider.toml` + `offerings/{kimi-for-coding,kimi-for-coding-highspeed,k3,k3-256k}.toml`

provider.toml: id kimi-coding, name "Kimi for Coding", kind subscription, api_surfaces ["text","streaming"]; urls docs https://www.kimi.com/code/docs/, console https://www.kimi.com/code/console; [plan] price_usd 19.0 period monthly, quota "Kimi Code has its own rolling 5-hour + weekly limits plus shared agent credits (60/150/360/720 by tier); concurrency-limited", notes "Included with Kimi membership — tiers Moderato $19, Allegretto $39, Allegro $99, Vivace $199 (annual discounts); K3 access from Moderato up. Coding keys are distinct from Open Platform keys and never interchangeable (top 401 cause).", docs https://www.kimi.ai/help/membership/membership-pricing; auth id plan-key type api_key transport header Authorization: Bearer env [] getting_credentials "Create keys in the Kimi Code Console (shown once). For Claude Code: ANTHROPIC_BASE_URL=https://api.kimi.com/coding/ and ANTHROPIC_API_KEY=<coding key>." docs https://www.kimi.com/code/docs/en/third-party-tools/claude-code.html; endpoints coding-openai (https://api.kimi.com, /coding/v1/chat/completions, openai-chat) + coding-anthropic (https://api.kimi.com, /coding, anthropic-messages). Quirks:
1. "Model ids on the coding endpoints: kimi-for-coding, kimi-for-coding-highspeed, k3 (1M ctx, ~2x quota), k3-256k. The [1m] suffix (kimi-k3[1m]) is a Claude Code env convention only — raw API uses k3/kimi-k3. Claude Code /effort maps to k3 low/high/max." docs claude-code doc URL above
2. "kimi-for-coding is the K2.7-code-class model; highspeed variant doubles speed and quota consumption." docs https://www.kimi.com/code/docs/kimi-code/faq.html

Offerings:
- kimi-for-coding (coding-openai, model moonshot/kimi-k2-7-code): style toggle mandatory=true default on, on enabled off "", returns reasoning_content, must_round_trip reasoning_content; source claude-code doc
- kimi-for-coding-highspeed: same, wire kimi-for-coding-highspeed
- k3 (coding-openai, model moonshot/kimi-k3): style effort mandatory=true default on, param reasoning_effort values [low, high, max] default max, returns reasoning_content, must_round_trip reasoning_content; source same
- k3-256k (coding-anthropic, model moonshot/kimi-k3): style always_on mandatory=true default on, notes "262144-context variant; control effort via Claude Code /effort (low/high/max) — raw wire param on this surface not documented; verify.", returns reasoning_content, must_round_trip reasoning_content; source same

- [ ] Write 5 files; `pnpm validate` → `OK: 34 models, 20 providers, 54 offerings`
- [ ] Commit: "Seed Kimi for Coding subscription surface"

### Task 4: xAI OAuth + grok-build-0.1

**Files:** modify `data/providers/xai/provider.toml` (add oauth auth + one quirk), create `data/providers/xai/offerings/grok-build-0-1-responses.toml`

Additions to provider.toml (append AFTER existing auth/endpoints/quirks — TOML array entries can be appended at file end):
```toml
[[auth]]
id = "oauth"
type = "oauth"
transport = "header"
header = "Authorization: Bearer"
flow = "browser OIDC or device code at auth.x.ai (endpoints not publicly documented)"
getting_credentials = "grok login (or grok login --device-auth) with a SuperGrok or X Premium subscription. Tokens persist in ~/.grok/auth.json with background refresh; requests use subscription quota (a weekly pool shared across Grok chat, Build, and API), not API billing."
docs = "https://docs.x.ai/build/overview"

[[quirks]]
text = "OAuth sessions call https://api.x.ai/v1 with Bearer tokens; an entitlement-aware catalog is available at https://cli-chat-proxy.grok.com/v1/models-v2. xAI decides which accounts receive OAuth tokens — some non-Heavy tiers report 403. SuperGrok is $30/mo, SuperGrok Plus $100/mo."
docs = "https://docs.x.ai/build/enterprise"
```

offering grok-build-0-1-responses.toml: model xai/grok-build-0-1, wire_id grok-build-0.1, endpoint v1-responses, status ga; cost input 1.00 output 2.00 cache_read 0.20 (source https://docs.x.ai/developers/pricing); limits context 256_000; reasoning style none default off, notes "No reasoning-effort mapping documented (unlike grok-4.3); verify. Pricing doubles for prompts over 200k."; returns hidden, must_round_trip ""; source https://x.ai/news/grok-build-0-1

- [ ] Edit + write; `pnpm validate` → `OK: 34 models, 20 providers, 55 offerings`
- [ ] Commit: "Add xAI OAuth auth method and grok-build-0.1"

### Task 5: ollama-cloud provider + 10 offerings

**Files:** `data/providers/ollama-cloud/provider.toml` + `offerings/{gpt-oss-120b,gpt-oss-20b,deepseek-v4-flash,deepseek-v4-pro,kimi-k2-6,kimi-k2-7-code,kimi-k3,qwen3-5,glm-5-2,minimax-m2-7}.toml`

provider.toml: id ollama-cloud, name "Ollama Cloud", kind first_party, api_surfaces ["text","streaming"]; urls docs https://docs.ollama.com/cloud, console https://ollama.com/settings/keys, pricing https://ollama.com/cloud; [plan] price_usd 20.0 period monthly quota "Free: 1 concurrent model; Pro $20: 3; Max $100: 10. Sessions reset every 5 hours plus weekly limits; usage weighted by model cost level; extra balance purchasable on Pro/Max." notes "Zero data retention; no training on prompts; US-primary hosting." docs https://ollama.com/cloud; auth api-key Bearer env ["OLLAMA_API_KEY"] getting_credentials "Create keys at ollama.com/settings/keys (they do not currently expire)." docs https://docs.ollama.com/api/authentication; endpoints v1-chat-completions (https://ollama.com, /v1/chat/completions, openai-chat). Quirks:
1. "Native API at https://ollama.com/api (chat/generate/tags) uses the think parameter (low/medium/high/max); gpt-oss models accept only low/medium/high and cannot disable thinking. An Anthropic-compatible API is also documented. https://ollama.com/api/v1 does NOT exist (404)." docs https://docs.ollama.com/capabilities/thinking
2. "The OpenAI-compatible /v1 accepts reasoning_effort (high/medium/low/max/none) and reasoning.effort. Reasoning returns in message.thinking on the native API — not reasoning_content. Cloud embeddings are unverified: /api/embed may not be authorized for cloud keys." docs https://docs.ollama.com/api/openai-compatibility
3. "Usage levels (Low, Medium, High, Extra High) weight billing — no per-Mtok pricing. Full catalog at ollama.com/search?c=cloud (also gemma4, nemotron-3 family, mistral-large-3 — the only non-thinking cloud model)." docs https://ollama.com/cloud

Offerings — all endpoint v1-chat-completions, NO cost sections (subscription billing), sources https://docs.ollama.com/cloud or model pages, verified 2026-08-19:
- gpt-oss-120b: wire gpt-oss:120b-cloud, limits 131_072, style effort mandatory=true default on, param reasoning_effort values [low, medium, high] default high (note "Default level not documented; verify."), returns hidden (note "Native API returns message.thinking; /v1 return shape varies — verify."), must_round_trip "".
- gpt-oss-20b: wire gpt-oss:20b-cloud, same shape.
- deepseek-v4-flash: wire deepseek-v4-flash:cloud, limits 1_048_576, style effort default on, values [none, low, medium, high, max] default high (note verify), returns hidden, round-trip "".
- deepseek-v4-pro: wire deepseek-v4-pro:cloud, limits 1_048_576, same.
- kimi-k2-6: wire kimi-k2.6:cloud, limits 262_144, same as deepseek shape.
- kimi-k2-7-code: wire kimi-k2.7-code:cloud, limits 262_144, notes add "interleaved thinking; preserve_thinking supported".
- kimi-k3: wire kimi-k3:cloud, limits 1_048_576, notes "Requires Pro/Max and consumes extra credits; reference per-Mtok pricing $3/$15 (in/output)."
- qwen3-5: wire qwen3.5:cloud, limits 262_144, same shape.
- glm-5-2: wire glm-5.2:cloud, no limits (context published as 976K — binary ambiguity; omit), same shape.
- minimax-m2-7: wire minimax-m2.7:cloud, no limits, same shape.

- [ ] Write 11 files; `pnpm validate` → `OK: 34 models, 21 providers, 65 offerings`
- [ ] Commit: "Seed Ollama Cloud surface"

### Task 6: sync adapters for moonshot + ollama-cloud

**Files:** modify `packages/sync/src/adapters.ts` (TARGETS += moonshot https://api.moonshot.ai/v1/models → body.data[].id; ollama-cloud https://ollama.com/v1/models → body.data[].id), `packages/sync/src/run.ts` (PROVIDER_ENV_KEYS += moonshot→MOONSHOT_API_KEY, ollama-cloud→OLLAMA_API_KEY), tests for both files (adapter mapper fixtures, env mapping, existing counts updated — the "maps both opencode targets" test and missingTargets assertions enumerate providers; update expectations to 12 targets).

- [ ] TDD: update tests first (they'll fail on count/mapping), implement, green; full `pnpm test` → 113+ passing
- [ ] `pnpm --filter @inference-providers/sync run report` (no env) → "no targets with credentials", exit 0
- [ ] Commit: "Add moonshot and ollama-cloud sync targets"

## Completion criteria

- `pnpm validate` → 34/21/65; full test suite green; site builds (34 model pages, 21 provider pages); curl examples render for new offerings (spot-grep kimi-k3 page for reasoning_effort "max" default example).
- Every new fact sourced + verified 2026-08-19.
