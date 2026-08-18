# ai-providers — Design

Date: 2026-08-18
Status: awaiting user review

## 1. Problem

models.dev is the de-facto open catalog of AI models/providers, but its data model
cannot represent how providers actually differ:

- **`reasoning = true` is a boolean.** It cannot express that Anthropic uses
  `thinking: {type, budget_tokens}` (min 1024), OpenAI uses `reasoning_effort`
  (`none`/`minimal`/`low`/`medium`/`high`/`xhigh`/`max`, *different sets per
  model*), Gemini 2.5 uses `thinkingBudget` (0=off, −1=dynamic, per-model
  minimums) while Gemini 3 uses `thinkingLevel`, MiniMax uses
  `thinking: {type: "adaptive"|"disabled"}` with no `"enabled"`, and Grok /
  GLM-5.3 / Gemini Pro cannot disable thinking at all. A consumer cannot
  generate a correct request from this data.
- **Providers are 4 lines of TOML** (`name`, `env`, `npm`, `doc`). Nothing about
  auth header format, OAuth, SigV4, Azure Entra, base URLs, protocol dialects,
  or which API surfaces exist.
- **Model identity is flattened.** The same Claude model served via Anthropic,
  Bedrock (different IDs: `anthropic.claude-sonnet-4-6` + `us.` inference-profile
  prefixes), and Vertex is duplicated with hand-copied facts that drift.
- **No provenance or lifecycle.** No source URLs, no `last_verified`, no
  deprecation dates — hence stale prices and `$0.00` placeholders.
- **The 2025–2026 provider landscape doesn't fit**: coding-plan subscriptions
  (Z.ai Coding Plan, Qwen Coding Plan, MiniMax Token Plan, OpenCode Go) reuse
  OpenAI/Anthropic wire protocols at *different base URLs* with *different key
  types* and quota billing; Azure's `/openai/v1` route; OpenRouter's unified
  `reasoning` object with effort→budget translation.

## 2. Goals

1. A machine-readable registry (JSON + npm SDK) whose data is sufficient to
   construct correct inference requests — auth, endpoint, model ID, and
   reasoning parameters — for every cataloged provider surface.
2. Human-facing docs generated from the same data: per-provider guides (how to
   get credentials, OAuth vs API key, base URLs, available APIs, quirks) and
   per-model pages (facts + per-surface pricing + copy-paste request examples).
3. A maintenance model that scales: machine drift detection against live
   `GET /models` endpoints, hand-verified capability facts, and provenance
   (source URL + `verified` date) enforced by CI on every fact.
4. Explicit unknowns: a missing fact is `null`, never a placeholder. `cost = 0`
   only when the surface is verifiably free.

## 3. Non-goals (v1)

- Executable per-provider adapters / a client library that makes requests.
- Rate-limit and quota catalogs per tier (model the field, seed sparsely).
- Fine-tuning/image/audio/video API deep coverage (text + embeddings + the
  surfaces that matter for agent/coding tooling first).
- Community-PR infrastructure beyond GitHub (no bot automation beyond drift
  issues/PRs).

## 4. Architecture — Approach A: two-layer registry

Two normalized content layers, joined at build time into denormalized artifacts:

```
data/
  models/<lab>/<model>.toml          # canonical AI systems (lab-owned facts)
  providers/<provider>/provider.toml # auth, endpoints, api surfaces, urls
  providers/<provider>/offerings/    # one file per model served on that surface
packages/
  schema/   # zod schemas + TypeScript types (single source of truth for shape)
  build/    # validator, joiner, artifact emitter
  sync/     # scheduled drift detection against live provider APIs
  sdk/      # @ai-providers/sdk — typed read access + param helpers
site/       # Astro docs site, rendered from emitted catalog.json
```

**Why two layers:** the same model offered through N surfaces must not be
copy-pasted N times. Intrinsic facts (knowledge cutoff, modalities, weights)
live on the model; surface facts (wire ID, endpoint, auth, price, reasoning
parameter shape) live on the offering. Bedrock-Claude references
`anthropic/claude-sonnet-4-6` and adds only deltas.

### Provider kind taxonomy

`first_party` (anthropic, openai, google-gemini, xai, mistral, deepseek,
minimax, zai, alibaba) · `cloud_hosted` (aws-bedrock, google-vertex,
azure-foundry) · `aggregator` (openrouter, opencode-zen) · `subscription`
(zai-coding-plan, qwen-coding-plan, minimax-token-plan, opencode-go).

A provider may expose **multiple endpoints**, each with a `protocol` —
`anthropic-messages`, `openai-chat`, `openai-responses`, `google-generate-content`,
`bedrock-converse` — because e.g. Z.ai Coding Plan serves all three of
`/api/anthropic`, `/api/coding/paas/v4`, and `/api/v1` (Responses), and OpenCode
Go routes *per model family* to different protocols.

## 5. Data model

### 5.1 Model (lab-owned, intrinsic)

```toml
# data/models/anthropic/claude-sonnet-4-6.toml
id = "anthropic/claude-sonnet-4-6"      # lab-qualified canonical ID
name = "Claude Sonnet 4.6"
family = "claude"
lab = "anthropic"
release_date = "2026-02-24"
retired_date = ""                        # or ISO date; "" = active
knowledge_cutoff = "2025-11-30"
open_weights = false
hf_repo = ""                             # for open-weights models
license = ""

[modalities]
input  = ["text", "image"]
output = ["text"]

aliases = []                             # e.g. snapshot IDs, -latest aliases
description = "..."
```

### 5.2 Provider (auth, endpoints, surfaces)

```toml
# data/providers/anthropic/provider.toml
id = "anthropic"
name = "Anthropic"
kind = "first_party"

[urls]
docs = "https://platform.claude.com/docs/en/api/overview"
console = "https://console.anthropic.com"
status = "https://status.anthropic.com"
pricing = "https://platform.claude.com/docs/en/docs/about-claude/models"

# --- auth: an ordered list; the first is the recommended default ---
[[auth]]
id = "api-key"                           # referenced by endpoints via auth = "api-key"
type = "api_key"                         # api_key | oauth | oauth_device | sigv4 |
                                         # entra_bearer | adc | workload_federation
transport = "header"                     # header | query | request_signing
header = "x-api-key"                     # e.g. "Authorization: Bearer" when applicable
env = ["ANTHROPIC_API_KEY"]
key_prefix = "sk-ant-api"
extra_headers = { anthropic-version = "2023-06-01" }   # required on every request
getting_credentials = "Create a key in Console → Settings → API Keys. Keys are org-scoped; optional expiry."
docs = "https://platform.claude.com/docs/en/manage-claude/authentication"

[[auth]]
id = "oauth"
type = "oauth"                           # Claude Code OAuth 2.0 + PKCE
flow = "authorization_code_pkce"
token_transport = "header"
header = "x-api-key"                     # OAuth tokens ride x-api-key, NOT Bearer
extra_headers = { anthropic-beta = "oauth-2025-04-20", anthropic-version = "2023-06-01" }
scopes = ["org:create_api_key", "user:profile", "user:inference"]
getting_credentials = "Run `claude` and choose Claude subscription sign-in; no key management needed."
docs = "https://code.claude.com/docs/en/authentication"

# --- endpoints: each is a surface with a wire protocol ---
[[endpoints]]
id = "v1-messages"
base_url = "https://api.anthropic.com"
path = "/v1/messages"
protocol = "anthropic-messages"
auth = "api-key"                         # auth[] id; defaults to the first entry

[[endpoints]]
id = "v1-messages-batches"
base_url = "https://api.anthropic.com"
path = "/v1/messages/batches"
protocol = "anthropic-messages"

# --- api surface inventory (what operations exist at all) ---
api_surfaces = [
  "text", "streaming", "embeddings", "files", "batch", "count_tokens",
  "prompt_caching", "fine_tuning", "realtime", "image_gen", "audio", "rerank",
]
# text and streaming are required; all others optional per provider.

[[quirks]]
text = "Thinking is incompatible with temperature/top_p/top_k, forced tool use, and prefill."
docs = "https://platform.claude.com/docs/en/docs/build-with-claude/extended-thinking"
```

Subscription providers additionally carry a `plan` block: price, quota
(e.g. OpenCode Go: $12/5h, $30/week, $60/month; Z.ai credits), included models
note, and restrictions (e.g. Qwen Coding Plan: "interactive coding-tool use only").

### 5.3 Offering (provider × model × endpoint) — the correctness core

```toml
# data/providers/anthropic/offerings/claude-sonnet-4-6.toml
model = "anthropic/claude-sonnet-4-6"    # canonical ref (validated to exist)
wire_id = "claude-sonnet-4-6"
endpoint = "v1-messages"
status = "ga"                            # ga | preview | deprecated | retired
status_date = ""                         # when deprecated/retired

[cost]                                   # USD per 1M tokens; null = unknown
input = 3.0
output = 15.0
cache_read = 0.3
cache_write = 3.75
free = false                             # required if any cost is 0

[limits]
context = 200_000
output = 64_000

[features]                               # surface-level support; may override model default
streaming = true
tools = true
structured_output = true
prompt_caching = true
vision = true

# ---- reasoning: structured parameter spec for THIS surface ----
[reasoning]
style = "budget"                         # none | effort | budget | toggle | adaptive | always_on
mandatory = false                        # true = cannot disable (grok, glm-5.3, M2.x, gemini pro)
default = "on"                           # on | off | adaptive — effective default behavior
notes = "Manual budget thinking works but is deprecated on 4.6 in favor of adaptive thinking."

[reasoning.toggle]                       # thinking: {type}
param = "thinking.type"
on = "enabled"                           # value set to enable (anthropic/deepseek/zai: "enabled"; minimax: "adaptive")
off = "disabled"                         # "" if no valid off value

[reasoning.budget]                       # token-budget control
param = "thinking.budget_tokens"
min = 1024
max = 128_000
zero_means_off = false                   # gemini-style 0=off
special_values = { "-1" = "dynamic" }    # gemini: -1 = provider-dynamic budget
constraint = "must be < max_tokens"

returns = "thinking_blocks"              # thinking_blocks | reasoning_content | reasoning_summary |
                                         # thought_parts | hidden
must_round_trip = "signature"            # signature | thought_signature | encrypted_content |
                                         # reasoning_content | ""  — artifact you MUST send back or 400
incompatible_with = ["temperature", "top_p", "top_k", "forced_tool_use", "prefill"]

[reasoning.source]
url = "https://platform.claude.com/docs/en/docs/build-with-claude/extended-thinking"
verified = "2026-08-18"
```

Rules:

- `style` selects which sub-blocks are valid: `effort` → `[reasoning.effort]`;
  `budget` → `[reasoning.budget]` (+ optional `[reasoning.toggle]` when
  budget-off exists, e.g. Gemini); `toggle` → `[reasoning.toggle]`;
  `adaptive` → model decides, `[reasoning.effort]` optional as soft steering
  (MiniMax M3, Claude 5-era `adaptive` + `output_config.effort`);
  `always_on` → no controls; `none` → not a reasoning model. An `effort`
  block on a `budget`-style offering is a validation error.
- The same model can (and often does) have different reasoning specs per
  surface: e.g. `gpt-5.6` on openai `/v1/responses` supports `max` +
  `reasoning.mode/context`, on `/v1/chat/completions` it rejects `tools` unless
  `reasoning_effort = "none"` (Azure-documented error); on openrouter it's the
  unified `reasoning` object. Each offering file states *its* surface's truth.
- **Provenance**: mutable facts (`cost`, `reasoning`, `limits`, `status`) each
  carry `source.url` + `source.verified`. CI fails a PR whose changed facts
  lack or stale-date provenance (staleness threshold: 90 days → warning,
  180 days → fail).
- **Effort vocabulary** is a controlled set (`none, minimal, low, medium, high,
  xhigh, max`) — CI rejects unknown values unless the file adds a documented
  source (providers keep inventing values; the gate is the source, not the enum).

### 5.4 Artifacts (packages/build output)

- `catalog.json` — denormalized: providers with embedded offerings; models with
  reverse-refs to their offerings. The primary consumer artifact.
- `providers.json`, `models.json` — the normalized layers.
- `providers/<id>.json`, `models/<id>.json` — per-entity files.
- Every artifact embeds `generated_at` (UTC) + `source_commit` (git SHA).

### 5.5 SDK (`@ai-providers/sdk`)

Typed read access to artifacts + data-derived helpers (no per-provider code):

- `resolveModel(providerId, wireId) → { model, offering }`
- `buildReasoningParam(offering, { effort? | budget? | enabled? }) →`
  the exact wire fragment for that surface's protocol, or a typed error
  explaining why (e.g. `mandatory: cannot disable reasoning on grok-4.6`;
  `budget 512 < min 1024`) — driven purely by schema data + a small
  protocol-template map.
- `authHeaders(provider, { apiKey | token }) →` header map.

## 6. Upkeep model (hybrid + provenance)

1. **Machine discovery** (`packages/sync`, scheduled GitHub Action, daily):
   calls `GET /v1/models`-style endpoints (openai, anthropic, google, xai,
   mistral, deepseek, openrouter, opencode zen/go, minimax, dashscope — where
   exposed) using org secrets; diffs live wire IDs against catalog offerings;
   opens a tracking issue (or auto-PR for pure additions with provenance
   `source: live-api`) for adds/removals/renames. Never writes capability
   facts.
2. **Human verification**: capability facts (reasoning shapes, auth quirks,
   constraints) are PR-ed by contributors with source citations; a CODEOWNERS
   review per provider directory.
3. **CI enforcement** (packages/build): zod schema validation; referential
   integrity (offering→model, offering→endpoint, model→lab); provenance +
   staleness gates; unknown-effort gate; `cost=0 ⇒ free=true` gate;
   snapshot tests on artifacts.

## 7. Site (site/, Astro + Starlight)

- `/providers/[id]`: getting-credentials walkthrough per auth method (incl.
  OAuth flows with the exact env vars coding tools expect, e.g.
  `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` for Anthropic-compat plan
  endpoints), base URLs + protocols, API-surface matrix, quirks, plan details.
- `/models/[id]`: intrinsic facts + offerings table (per-surface wire IDs,
  prices, status) + generated request examples per protocol (curl/Python/TS)
  including that surface's reasoning parameters and round-trip warnings.
- `/compare`, search (Pagefind), JSON download links.
- All pages render from `catalog.json`; zero hand-written per-provider HTML.

## 8. Seed content scope (launch)

Labs/models: Anthropic (Claude 3.7 → 4.6, plus the adaptive-only 5-era models
as live), OpenAI (GPT-5.x incl. 5.6, o-series, 4.1), Google (Gemini 2.5 + 3
era), xAI (grok 4.x), Mistral (small/medium 3.5), DeepSeek (v4), Alibaba Qwen
(3.x), MiniMax (M2.x/M3), Z.ai GLM (4.6–5.3), Moonshot Kimi (as offered by
plans/aggregators).

Provider surfaces (~18): anthropic, openai, google-gemini, google-vertex,
aws-bedrock, azure-foundry, xai, mistral, deepseek, openrouter, opencode-zen,
opencode-go, zai, zai-coding-plan, alibaba-dashscope, qwen-coding-plan,
minimax, minimax-token-plan.

## 9. Phasing

- **Phase 1 — data core** (this spec → implementation plan): `packages/schema`,
  `packages/build`, seed content for all §8 surfaces, artifact emission, CI.
- **Phase 2 — upkeep + SDK**: `packages/sync` drift detection, secrets wiring,
  `@ai-providers/sdk` incl. `buildReasoningParam`.
- **Phase 3 — site**: Astro site rendering catalog, example generation, search.

Each phase gets its own implementation-plan cycle.

## 10. Testing

- `packages/schema`: unit tests per schema (valid/invalid fixtures, every
  reasoning style, every auth type).
- `packages/build`: golden-artifact tests on fixture data; referential-integrity
  violation fixtures; provenance/staleness gates.
- `packages/sdk`: `buildReasoningParam` table-driven tests per protocol using
  real researched shapes (e.g. grok xhigh→high clamp note, anthropic min-1024).
- `site`: build test + spot-check generated examples against fixtures.
- No live API keys in unit tests; sync scripts run only in scheduled CI.

## 11. Key risks

- **Fact rot** (models.dev's fate): mitigated by provenance gates + daily
  drift detection; residual risk on capability facts — accepted, surfaced via
  staleness lint.
- **Vocabulary churn** (new effort values/protocols): schema treats them as
  data with sources, not code changes; enum gates allow documented additions.
- **Research accuracy**: seed facts come from verified official docs (research
  captured 2026-08-18, full source lists in the research notes); each fact
  still carries its specific doc URL for re-verification.
- **Two-layer contribution friction**: mitigated by example files, a
  CONTRIBUTING guide, and CI errors that point at the exact rule violated.
