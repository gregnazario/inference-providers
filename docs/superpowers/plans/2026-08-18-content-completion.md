# ai-providers Content-Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed the remaining 8 provider surfaces from the approved launch scope (xai, mistral, deepseek, alibaba-dashscope, qwen-coding-plan, opencode-zen, opencode-go, minimax-token-plan) plus their 8 new canonical models and 15 offerings.

**Architecture:** Pure data entry into the existing validated pipeline (packages/schema + packages/build from Phase 1, merged on `main`). No code changes. All facts from the 2026-08-18 research reports; every mutable fact carries `source.url` + `verified = "2026-08-18"`; unknowns are omitted (never invented).

**Tech Stack:** TOML data files under `data/`, verified via `pnpm validate`, emitted via `pnpm emit`.

## Global Constraints

- English only; plain commit messages, NO AI attribution trailers; work on branch `feat/content-completion` (never commit directly to `main`).
- TOML layout: root keys (incl. `api_surfaces`) BEFORE any `[table]`/`[[array]]` blocks; offering root keys before `[reasoning]`; reasoning base keys before sub-blocks.
- Unknown facts omitted (`""` dates, no cost section) — never `0`, never invented. Effort values from the controlled vocabulary: `none, minimal, low, medium, high, xhigh, max`.
- Every `[[quirks]]` needs both `text` and `docs` (URL). Every `[[auth]]` needs `transport`, `getting_credentials`, `docs`.
- Totals after this plan: 24 models, 18 providers, 44 offerings.

---

### Task 1: seed 8 new canonical models

**Files:**
- Create: `data/models/xai/{grok-4-5,grok-4-6}.toml`, `data/models/mistral/{mistral-small-latest,mistral-medium-3-5}.toml`, `data/models/deepseek/{deepseek-v4-flash,deepseek-v4-pro}.toml`, `data/models/alibaba/{qwen3-max,qwen3-7-plus}.toml`

**Interfaces:**
- Produces: canonical model ids `xai/grok-4-5`, `xai/grok-4-6`, `mistral/mistral-small-latest`, `mistral/mistral-medium-3-5`, `deepseek/deepseek-v4-flash`, `deepseek/deepseek-v4-pro`, `alibaba/qwen3-max`, `alibaba/qwen3-7-plus` — referenced by Tasks 2–5 offerings.

`data/models/xai/grok-4-5.toml`:
```toml
id = "xai/grok-4-5"
name = "Grok 4.5"
family = "grok"
lab = "xai"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Reasoning model; effort low/medium/high default high, cannot disable. xhigh silently treated as high."
aliases = ["grok-4.5"]
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/xai/grok-4-6.toml`:
```toml
id = "xai/grok-4-6"
name = "Grok 4.6"
family = "grok"
lab = "xai"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Reasoning model; adds xhigh over 4.5; returns summarized reasoning via streamed reasoning_content deltas."
aliases = ["grok-4.6"]
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/mistral/mistral-small-latest.toml`:
```toml
id = "mistral/mistral-small-latest"
name = "Mistral Small (latest)"
family = "mistral-small"
lab = "mistral"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Supports reasoning_effort high/none; with high, content becomes ThinkChunk + TextChunk blocks."
aliases = []
[modalities]
input = ["text"]
output = ["text"]
```

`data/models/mistral/mistral-medium-3-5.toml`:
```toml
id = "mistral/mistral-medium-3-5"
name = "Mistral Medium 3.5"
family = "mistral-medium"
lab = "mistral"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Supports reasoning_effort high/none; Magistral reasoning models are deprecated."
aliases = ["mistral-medium-3.5"]
[modalities]
input = ["text"]
output = ["text"]
```

`data/models/deepseek/deepseek-v4-flash.toml`:
```toml
id = "deepseek/deepseek-v4-flash"
name = "DeepSeek V4 Flash"
family = "deepseek-v4"
lab = "deepseek"
release_date = "2026-07-31"
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Hybrid thinking on by default (V4-Flash-0731); 1M context, 384K max output shared with CoT."
aliases = ["deepseek-v4-flash-0731"]
[modalities]
input = ["text"]
output = ["text"]
```

`data/models/deepseek/deepseek-v4-pro.toml`:
```toml
id = "deepseek/deepseek-v4-pro"
name = "DeepSeek V4 Pro"
family = "deepseek-v4"
lab = "deepseek"
release_date = "2026-08-13"
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Hybrid thinking on by default (V4-Pro-0813); 1M context, 384K max output shared with CoT."
aliases = ["deepseek-v4-pro-0813"]
[modalities]
input = ["text"]
output = ["text"]
```

`data/models/alibaba/qwen3-max.toml`:
```toml
id = "alibaba/qwen3-max"
name = "Qwen3 Max"
family = "qwen3"
lab = "alibaba"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Commercial Qwen flagship; thinking OFF by default, toggled via enable_thinking."
aliases = ["qwen3-max-2026-01-23"]
[modalities]
input = ["text"]
output = ["text"]
```

`data/models/alibaba/qwen3-7-plus.toml`:
```toml
id = "alibaba/qwen3-7-plus"
name = "Qwen3.7 Plus"
family = "qwen3"
lab = "alibaba"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Qwen3.7 series; thinking ON by default; preserve_thinking carries reasoning_content across turns."
aliases = ["qwen3.7-plus"]
[modalities]
input = ["text"]
output = ["text"]
```

Weights status for both mistral models was not captured in the 2026-08-18 research — use `open_weights = false` and `hf_repo = ""` in the files above (edit the mistral-small block accordingly before writing).

---

### Task 0: schema amendment — optional toggle under effort style

**Files:**
- Modify: `packages/schema/src/reasoning.ts`
- Test: `packages/schema/test/reasoning.test.ts`

**Interfaces:**
- Produces: the `effort` style variant of `ReasoningSchema` accepts an optional `toggle` block (mirroring how `budget` style already does). DeepSeek-style surfaces (thinking.type toggle + reasoning_effort enum co-existing) need this; without it the Task 3 facts cannot be encoded as data.

- [ ] **Step 1: Write the failing test** — append to `packages/schema/test/reasoning.test.ts`:

```ts
it("effort style allows optional toggle block (deepseek-style surfaces)", () => {
  const ok = {
    ...base, style: "effort",
    effort: { param: "reasoning_effort", values: ["low", "high", "max"], default: "high" },
    toggle: { param: "thinking.type", on: "enabled", off: "disabled" },
  }
  expect(ReasoningSchema.safeParse(ok).success).toBe(true)
  const noEffort = { ...base, style: "effort", toggle: { param: "thinking.type", on: "enabled", off: "disabled" } }
  expect(ReasoningSchema.safeParse(noEffort).success).toBe(false)
})
```

- [ ] **Step 2: Run to verify it fails** — `cd packages/schema && pnpm vitest run test/reasoning.test.ts`. Expected: FAIL (stray key "toggle" rejected by .strict()).
- [ ] **Step 3: Implement** — in `packages/schema/src/reasoning.ts`, change the effort variant from `budget: budgetBlock.optional()` ending to include `toggle: toggleBlock.optional()`:

```ts
z.object({ style: z.literal("effort"), ...base, effort: effortBlock, budget: budgetBlock.optional(), toggle: toggleBlock.optional() }).strict(),
```

- [ ] **Step 4: Run full schema suite** — `cd packages/schema && pnpm vitest run && pnpm build && pnpm typecheck` (build refreshes packages/schema/dist for the build package). Expected: all pass.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Allow optional toggle block under effort reasoning style"`

- [ ] **Step 1: Create the branch** — `git switch -c feat/content-completion` (from `main`)
- [ ] **Step 2: Write the 8 files** (with the mistral caveat applied: `open_weights = false`, `hf_repo = ""` for both mistral models)
- [ ] **Step 3: Verify** — `pnpm validate`. Expected: `OK: 24 models, 10 providers, 29 offerings`.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "Seed canonical models for xai, mistral, deepseek, alibaba"`

---

### Task 2: seed xai

**Files:**
- Create: `data/providers/xai/provider.toml`, `data/providers/xai/offerings/{grok-4-5,grok-4-6}-{chat,responses}.toml` (4 files)

`data/providers/xai/provider.toml`:
```toml
id = "xai"
name = "xAI"
kind = "first_party"
api_surfaces = ["text", "streaming"]

[urls]
docs = "https://docs.x.ai/overview"
console = "https://console.x.ai"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["XAI_API_KEY"]
getting_credentials = "Create a key at console.x.ai. OpenAI SDKs work by changing base_url only; also Anthropic-compatible."
docs = "https://docs.x.ai/overview"

[[endpoints]]
id = "v1-chat-completions"
base_url = "https://api.x.ai"
path = "/v1/chat/completions"
protocol = "openai-chat"

[[endpoints]]
id = "v1-responses"
base_url = "https://api.x.ai"
path = "/v1/responses"
protocol = "openai-responses"

[[quirks]]
text = "Responses is the preferred API per xAI docs. presence_penalty, frequency_penalty, and stop cannot be used with reasoning models — requests including them error. grok-4.20-multi-agent maps reasoning.effort to agent count (4 or 16), not depth."
docs = "https://docs.x.ai/docs/guides/reasoning"
```

`data/providers/xai/offerings/grok-4-5-chat.toml`:
```toml
model = "xai/grok-4-5"
wire_id = "grok-4.5"
endpoint = "v1-chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = true
default = "on"
notes = "xhigh is silently treated as high on 4.5."
returns = "reasoning_content"
must_round_trip = ""

[reasoning.effort]
param = "reasoning_effort"
values = ["low", "medium", "high"]
default = "high"

[reasoning.source]
url = "https://docs.x.ai/docs/guides/reasoning"
verified = "2026-08-18"
```

`data/providers/xai/offerings/grok-4-5-responses.toml`:
```toml
model = "xai/grok-4-5"
wire_id = "grok-4.5"
endpoint = "v1-responses"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = true
default = "on"
returns = "hidden"
must_round_trip = "encrypted_content"

[reasoning.effort]
param = "reasoning.effort"
values = ["low", "medium", "high"]
default = "high"

[reasoning.source]
url = "https://docs.x.ai/docs/guides/reasoning"
verified = "2026-08-18"
```

`data/providers/xai/offerings/grok-4-6-chat.toml`:
```toml
model = "xai/grok-4-6"
wire_id = "grok-4.6"
endpoint = "v1-chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = true
default = "on"
returns = "reasoning_content"
must_round_trip = ""

[reasoning.effort]
param = "reasoning_effort"
values = ["low", "medium", "high", "xhigh"]
default = "high"

[reasoning.source]
url = "https://docs.x.ai/docs/guides/reasoning"
verified = "2026-08-18"
```

`data/providers/xai/offerings/grok-4-6-responses.toml`:
```toml
model = "xai/grok-4-6"
wire_id = "grok-4.6"
endpoint = "v1-responses"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = true
default = "on"
returns = "reasoning_content"
must_round_trip = "encrypted_content"

[reasoning.effort]
param = "reasoning.effort"
values = ["low", "medium", "high", "xhigh"]
default = "high"

[reasoning.source]
url = "https://docs.x.ai/docs/guides/reasoning"
verified = "2026-08-18"
```

- [ ] **Step 1: Write the 5 files**
- [ ] **Step 2: Verify** — `pnpm validate`. Expected: `OK: 24 models, 11 providers, 33 offerings`.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Seed xai surface"`

---

### Task 3: seed mistral + deepseek

**Files:**
- Create: `data/providers/mistral/provider.toml`, `data/providers/mistral/offerings/{mistral-small-latest,mistral-medium-3-5}.toml`, `data/providers/deepseek/provider.toml`, `data/providers/deepseek/offerings/{deepseek-v4-flash,deepseek-v4-pro}-{chat,anthropic}.toml` (6 offering files)

`data/providers/mistral/provider.toml`:
```toml
id = "mistral"
name = "Mistral"
kind = "first_party"
api_surfaces = ["text", "streaming", "embeddings", "files", "batch"]

[urls]
docs = "https://docs.mistral.ai/api/endpoint/chat"
console = "https://console.mistral.ai"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["MISTRAL_API_KEY"]
getting_credentials = "Create a key at console.mistral.ai (La Plateforme)."
docs = "https://docs.mistral.ai/api/endpoint/chat"

[[endpoints]]
id = "v1-chat-completions"
base_url = "https://api.mistral.ai"
path = "/v1/chat/completions"
protocol = "openai-chat"

[[quirks]]
text = "With reasoning_effort high, message.content becomes a list of chunks: ThinkChunk (type thinking) followed by TextChunk; replay the full assistant message including ThinkChunk in multi-turn or quality degrades. No Responses API. Magistral reasoning models deprecated; reasoning_effort high/none supported on mistral-small-latest and mistral-medium-3-5."
docs = "https://docs.mistral.ai/capabilities/reasoning/"
```

`data/providers/mistral/offerings/mistral-small-latest.toml`:
```toml
model = "mistral/mistral-small-latest"
wire_id = "mistral-small-latest"
endpoint = "v1-chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = false
default = "off"
notes = "Default effort not documented; verify at docs.mistral.ai/capabilities/reasoning. With high, content is ThinkChunk + TextChunk blocks; replay ThinkChunk in multi-turn."
returns = "thinking_blocks"
must_round_trip = ""

[reasoning.effort]
param = "reasoning_effort"
values = ["none", "high"]
default = "none"

[reasoning.source]
url = "https://docs.mistral.ai/capabilities/reasoning/"
verified = "2026-08-18"
```

`data/providers/mistral/offerings/mistral-medium-3-5.toml`:
```toml
model = "mistral/mistral-medium-3-5"
wire_id = "mistral-medium-3.5"
endpoint = "v1-chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = false
default = "off"
notes = "Default effort not documented; verify at docs.mistral.ai/capabilities/reasoning. With high, content is ThinkChunk + TextChunk blocks; replay ThinkChunk in multi-turn."
returns = "thinking_blocks"
must_round_trip = ""

[reasoning.effort]
param = "reasoning_effort"
values = ["none", "high"]
default = "none"

[reasoning.source]
url = "https://docs.mistral.ai/capabilities/reasoning/"
verified = "2026-08-18"
```

`data/providers/deepseek/provider.toml`:
```toml
id = "deepseek"
name = "DeepSeek"
kind = "first_party"
api_surfaces = ["text", "streaming"]

[urls]
docs = "https://api-docs.deepseek.com/"
console = "https://platform.deepseek.com"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["DEEPSEEK_API_KEY"]
getting_credentials = "Create a key at platform.deepseek.com. Works in Claude Code, Copilot, OpenCode via the Anthropic-compatible endpoint."
docs = "https://api-docs.deepseek.com/"

[[endpoints]]
id = "chat-completions"
base_url = "https://api.deepseek.com"
path = "/chat/completions"
protocol = "openai-chat"

[[endpoints]]
id = "anthropic"
base_url = "https://api.deepseek.com"
path = "/anthropic"
protocol = "anthropic-messages"

[[quirks]]
text = "Root path /chat/completions works without /v1. Stateless OpenAI Responses API also supported. In tool-call flows, prior-turn reasoning_content must be passed back or you get a 400; without tools it is ignored. When thinking is on, temperature/top_p/presence_penalty/frequency_penalty are silently ignored. FIM only in non-thinking mode. The old deepseek-chat / deepseek-reasoner split is gone — same model names serve both modes via the thinking toggle."
docs = "https://api-docs.deepseek.com/guides/thinking_mode"
```

`data/providers/deepseek/offerings/deepseek-v4-flash-chat.toml`:
```toml
model = "deepseek/deepseek-v4-flash"
wire_id = "deepseek-v4-flash"
endpoint = "chat-completions"
status = "ga"
status_date = ""

[limits]
context = 1_000_000
output = 384_000
source = { url = "https://api-docs.deepseek.com/quick_start/pricing", verified = "2026-08-18" }

[reasoning]
style = "effort"
mandatory = false
default = "on"
notes = "Thinking enabled by default, default effort high. OpenAI-style reasoning_effort values map low->low, medium->high, high->high, xhigh->high, max->max; native values low/high/max."
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.effort]
param = "reasoning_effort"
values = ["low", "high", "max"]
default = "high"

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.source]
url = "https://api-docs.deepseek.com/guides/thinking_mode"
verified = "2026-08-18"
```

`data/providers/deepseek/offerings/deepseek-v4-flash-anthropic.toml`:
```toml
model = "deepseek/deepseek-v4-flash"
wire_id = "deepseek-v4-flash"
endpoint = "anthropic"
status = "ga"
status_date = ""

[reasoning]
style = "toggle"
mandatory = false
default = "on"
notes = "Anthropic-compatible surface (for Claude Code et al.): thinking {type} toggle; reasoning_content round-trip applies in tool flows."
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.source]
url = "https://api-docs.deepseek.com/"
verified = "2026-08-18"
```

`data/providers/deepseek/offerings/deepseek-v4-pro-chat.toml`:
```toml
model = "deepseek/deepseek-v4-pro"
wire_id = "deepseek-v4-pro"
endpoint = "chat-completions"
status = "ga"
status_date = ""

[limits]
context = 1_000_000
output = 384_000
source = { url = "https://api-docs.deepseek.com/quick_start/pricing", verified = "2026-08-18" }

[reasoning]
style = "effort"
mandatory = false
default = "on"
notes = "Thinking enabled by default, default effort high. OpenAI-style reasoning_effort values map low->low, medium->high, high->high, xhigh->high, max->max; native values low/high/max."
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.effort]
param = "reasoning_effort"
values = ["low", "high", "max"]
default = "high"

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.source]
url = "https://api-docs.deepseek.com/guides/thinking_mode"
verified = "2026-08-18"
```

`data/providers/deepseek/offerings/deepseek-v4-pro-anthropic.toml`:
```toml
model = "deepseek/deepseek-v4-pro"
wire_id = "deepseek-v4-pro"
endpoint = "anthropic"
status = "ga"
status_date = ""

[reasoning]
style = "toggle"
mandatory = false
default = "on"
notes = "Anthropic-compatible surface (for Claude Code et al.): thinking {type} toggle; reasoning_content round-trip applies in tool flows."
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.source]
url = "https://api-docs.deepseek.com/"
verified = "2026-08-18"
```

- [ ] **Step 1: Write the 8 files**
- [ ] **Step 2: Verify** — `pnpm validate`. Expected: `OK: 24 models, 13 providers, 39 offerings`.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Seed mistral and deepseek surfaces"`

---

### Task 4: seed alibaba-dashscope + qwen-coding-plan

**Files:**
- Create: `data/providers/alibaba-dashscope/provider.toml`, `data/providers/alibaba-dashscope/offerings/{qwen3-max,qwen3-7-plus}.toml`, `data/providers/qwen-coding-plan/provider.toml`, `data/providers/qwen-coding-plan/offerings/qwen3-7-plus.toml`

`data/providers/alibaba-dashscope/provider.toml`:
```toml
id = "alibaba-dashscope"
name = "Alibaba Model Studio (DashScope)"
kind = "first_party"
api_surfaces = ["text", "streaming", "embeddings", "batch"]

[urls]
docs = "https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope"
console = "https://modelstudio.console.alibabacloud.com"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["DASHSCOPE_API_KEY"]
key_prefix = "sk-"
getting_credentials = "Model Studio console → API Keys. Keys are region-bound: international dashscope-intl vs China dashscope endpoints."
docs = "https://www.alibabacloud.com/help/en/model-studio/first-api-call-to-qwen"

[[endpoints]]
id = "compatible-mode-chat"
base_url = "https://dashscope-intl.aliyuncs.com"
path = "/compatible-mode/v1/chat/completions"
protocol = "openai-chat"

[[quirks]]
text = "China base: https://dashscope.aliyuncs.com/compatible-mode/v1. Soft switches /think and /no_think appended to prompts work on open-source hybrid Qwen3 models and qwen-plus-2025-04-28+ (most recent instruction wins). Open-source hybrid models (qwen3-235b-a22b, qwen3-32b) support streaming only when enable_thinking=true — non-streaming calls error. Thinking-only variants (qwen3-next-80b-a3b-thinking, qwq-plus, kimi-k2-thinking) cannot disable. Regional OpenAI-compatible bases like https://{workspace}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1 also exist; native DashScope endpoint .../api/v1/services/aigc/text-generation/generation with X-DashScope-SSE: enable."
docs = "https://www.alibabacloud.com/help/en/model-studio/deep-thinking"
```

`data/providers/alibaba-dashscope/offerings/qwen3-max.toml`:
```toml
model = "alibaba/qwen3-max"
wire_id = "qwen3-max"
endpoint = "compatible-mode-chat"
status = "ga"
status_date = ""

[reasoning]
style = "toggle"
mandatory = false
default = "off"
notes = "Commercial Qwen models default thinking OFF (qwen3-max, qwen-plus since 2025-04-28, qwen-flash since 2025-07-28, qwen-turbo)."
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.toggle]
param = "enable_thinking"
on = "true"
off = "false"

[reasoning.source]
url = "https://www.alibabacloud.com/help/en/model-studio/deep-thinking"
verified = "2026-08-18"
```

`data/providers/alibaba-dashscope/offerings/qwen3-7-plus.toml`:
```toml
model = "alibaba/qwen3-7-plus"
wire_id = "qwen3.7-plus"
endpoint = "compatible-mode-chat"
status = "ga"
status_date = ""

[reasoning]
style = "toggle"
mandatory = false
default = "on"
notes = "Qwen3.7/3.6/3.5 series default thinking ON. preserve_thinking carries reasoning_content across turns."
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.toggle]
param = "enable_thinking"
on = "true"
off = "false"

[reasoning.source]
url = "https://www.alibabacloud.com/help/en/model-studio/deep-thinking"
verified = "2026-08-18"
```

`data/providers/qwen-coding-plan/provider.toml`:
```toml
id = "qwen-coding-plan"
name = "Qwen Coding Plan"
kind = "subscription"
api_surfaces = ["text", "streaming"]

[urls]
docs = "https://www.alibabacloud.com/help/en/model-studio/coding-plan"
console = "https://modelstudio.console.alibabacloud.com"

[plan]
price_usd = 50.0
period = "monthly"
quota = "Pro plan; Lite tier discontinued 2026-03"
notes = "Strict model allowlist: qwen3.7-plus, qwen3.6-plus, qwen3.5-plus, qwen3-max-2026-01-23, qwen3-coder-next, qwen3-coder-plus, glm-5, glm-4.7, kimi-k2.5, MiniMax-M2.5. Interactive coding-tool use only."
docs = "https://www.alibabacloud.com/help/en/model-studio/coding-plan"

[[auth]]
id = "plan-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["BAILIAN_CODING_PLAN_API_KEY"]
key_prefix = "sk-sp-"
getting_credentials = "Subscribe in Model Studio; plan keys (sk-sp-...) are separate from normal DASHSCOPE_API_KEY and only work on coding-plan endpoints. Configure tools via OPENAI_BASE_URL=https://coding-intl.dashscope.aliyuncs.com/v1 or the Anthropic-compatible /apps/anthropic route. The older Qwen OAuth free tier was discontinued 2026-04-15."
docs = "https://qwenlm.github.io/qwen-code-docs/en/users/configuration/auth/"

[[endpoints]]
id = "coding-chat"
base_url = "https://coding-intl.dashscope.aliyuncs.com"
path = "/v1/chat/completions"
protocol = "openai-chat"

[[endpoints]]
id = "coding-anthropic"
base_url = "https://coding-intl.dashscope.aliyuncs.com"
path = "/apps/anthropic"
protocol = "anthropic-messages"

[[quirks]]
text = "China base: https://coding.dashscope.aliyuncs.com/v1. Third-party models on the allowlist (glm-5, glm-4.7, kimi-k2.5, MiniMax-M2.5) are served through the same endpoints; their reasoning parameters follow the upstream models' conventions — offerings seeded only where wire behavior is verified."
docs = "https://www.alibabacloud.com/help/en/model-studio/coding-plan"
```

`data/providers/qwen-coding-plan/offerings/qwen3-7-plus.toml`:
```toml
model = "alibaba/qwen3-7-plus"
wire_id = "qwen3.7-plus"
endpoint = "coding-chat"
status = "ga"
status_date = ""

[reasoning]
style = "toggle"
mandatory = false
default = "on"
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.toggle]
param = "enable_thinking"
on = "true"
off = "false"

[reasoning.source]
url = "https://www.alibabacloud.com/help/en/model-studio/deep-thinking"
verified = "2026-08-18"
```

- [ ] **Step 1: Write the 5 files**
- [ ] **Step 2: Verify** — `pnpm validate`. Expected: `OK: 24 models, 15 providers, 42 offerings`.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Seed alibaba-dashscope and qwen-coding-plan surfaces"`

---

### Task 5: seed opencode-zen + opencode-go + minimax-token-plan

**Files:**
- Create: `data/providers/opencode-zen/provider.toml`, `data/providers/opencode-go/provider.toml`, `data/providers/minimax-token-plan/provider.toml`, `data/providers/minimax-token-plan/offerings/{minimax-m2-5,minimax-m3}.toml`

Design note: opencode-zen and opencode-go get NO offering files this cycle — their provider facts (endpoints, auth, plan, routing) are verified, but exact wire ids per model are not enumerated in the research; Phase 2's sync against `GET /zen/v1/models` and `/zen/go/v1/models` will populate them. The zero-offering state is valid (no gate requires offerings) and the quirk documents why.

`data/providers/opencode-zen/provider.toml`:
```toml
id = "opencode-zen"
name = "OpenCode Zen"
kind = "aggregator"
api_surfaces = ["text", "streaming"]

[urls]
docs = "https://opencode.ai/docs/zen/"
console = "https://opencode.ai/auth"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["OPENCODE_API_KEY"]
getting_credentials = "Create a key at opencode.ai/auth (in the TUI: /connect). ~90+ curated models billed at cost, pay-as-you-go."
docs = "https://opencode.ai/docs/providers/"

[[endpoints]]
id = "chat-completions"
base_url = "https://opencode.ai"
path = "/zen/v1/chat/completions"
protocol = "openai-chat"

[[endpoints]]
id = "responses"
base_url = "https://opencode.ai"
path = "/zen/v1/responses"
protocol = "openai-responses"

[[endpoints]]
id = "messages"
base_url = "https://opencode.ai"
path = "/zen/v1/messages"
protocol = "anthropic-messages"

[[endpoints]]
id = "gemini-style"
base_url = "https://opencode.ai"
path = "/zen/v1/models/{model-id}"
protocol = "google-generate-content"

[[quirks]]
text = "Four protocol surfaces; models are assigned per surface (Responses for GPT/Grok, Anthropic Messages for Claude/Qwen, chat-completions for DeepSeek/MiniMax/GLM/Kimi, Gemini-style for Google models). No documented reasoning normalization — controls follow each upstream provider's wire format per surface; community-verified: thinking {type: enabled} and reasoning_effort (low/high/max) pass through for DeepSeek V4 on the chat surface. Offerings pending wire-id verification via GET /zen/v1/models (Phase 2 sync)."
docs = "https://opencode.ai/docs/zen/"
```

`data/providers/opencode-go/provider.toml`:
```toml
id = "opencode-go"
name = "OpenCode Go"
kind = "subscription"
api_surfaces = ["text", "streaming"]

[urls]
docs = "https://opencode.ai/docs/go/"
console = "https://opencode.ai/go"

[plan]
price_usd = 10.0
period = "monthly"
quota = "$12 per 5 hours, $30/week, $60/month"
notes = "$5 first month then $10/mo, on top of the Zen console (same API key mechanism); open coding models only — Grok 4.5, GPT 5.6 Luna, GLM-5.x, Kimi K3/K2.x, MiniMax M3/M2.7, Qwen3.x, DeepSeek V4, MiMo, Hy3; optional Zen-balance fallback. Routes per protocol: /responses for Grok/GPT, /chat/completions for GLM/Kimi/DeepSeek, /messages (Anthropic) for MiniMax/Qwen."
docs = "https://opencode.ai/docs/go/"

[[auth]]
id = "plan-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["OPENCODE_API_KEY"]
getting_credentials = "Subscribe at opencode.ai/go; uses the OpenCode Zen API key. Provider IDs are opencode-go/<model>."
docs = "https://opencode.ai/docs/go/"

[[endpoints]]
id = "go-responses"
base_url = "https://opencode.ai"
path = "/zen/go/v1/responses"
protocol = "openai-responses"

[[endpoints]]
id = "go-chat-completions"
base_url = "https://opencode.ai"
path = "/zen/go/v1/chat/completions"
protocol = "openai-chat"

[[endpoints]]
id = "go-messages"
base_url = "https://opencode.ai"
path = "/zen/go/v1/messages"
protocol = "anthropic-messages"

[[quirks]]
text = "Per-model-family protocol routing: /responses for Grok/GPT, /chat/completions for GLM/Kimi/DeepSeek, /messages for MiniMax/Qwen. Model list at GET /zen/go/v1/models; offerings pending wire-id verification (Phase 2 sync)."
docs = "https://opencode.ai/docs/go/"
```

`data/providers/minimax-token-plan/provider.toml`:
```toml
id = "minimax-token-plan"
name = "MiniMax Token Plan"
kind = "subscription"
api_surfaces = ["text", "streaming"]

[urls]
docs = "https://platform.minimax.io/docs/token-plan/intro"
console = "https://platform.minimax.io/subscribe/token-plan"

[plan]
price_usd = 20.0
period = "monthly"
quota = "Plus ~1.7B tokens/mo (3-4 concurrent agents); Max ~5.1B; higher tiers to ~$120"
notes = "Subscription Key is a separate credential type from pay-as-you-go API keys, issued under Billing > Token Plan. Sources conflict on Plus pricing ($20 vs $40) — verify at the subscribe page. For Claude Code: ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic + ANTHROPIC_AUTH_TOKEN=<Subscription Key>."
docs = "https://platform.minimax.io/docs/token-plan/claude-code"

[[auth]]
id = "subscription-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["MINIMAX_SUBSCRIPTION_KEY"]
getting_credentials = "Subscribe at platform.minimax.io/subscribe/token-plan; the Subscription Key is issued separately from standard API keys under Billing > Token Plan."
docs = "https://platform.minimax.io/docs/token-plan/intro"

[[endpoints]]
id = "anthropic"
base_url = "https://api.minimax.io"
path = "/anthropic"
protocol = "anthropic-messages"

[[quirks]]
text = "Anthropic-compatible endpoint for coding tools (Claude Code). China base: https://api.minimaxi.com/anthropic."
docs = "https://platform.minimax.io/docs/token-plan/claude-code"
```

`data/providers/minimax-token-plan/offerings/minimax-m2-5.toml`:
```toml
model = "minimax/minimax-m2-5"
wire_id = "MiniMax-M2.5"
endpoint = "anthropic"
status = "ga"
status_date = ""

[reasoning]
style = "always_on"
mandatory = true
default = "on"
notes = "M2.x thinking cannot be turned off on any surface; thinking {type: disabled} has no effect."
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.source]
url = "https://platform.minimaxi.com/docs/api-reference/text-chat-openai"
verified = "2026-08-18"
```

`data/providers/minimax-token-plan/offerings/minimax-m3.toml`:
```toml
model = "minimax/minimax-m3"
wire_id = "MiniMax-M3"
endpoint = "anthropic"
status = "ga"
status_date = ""

[reasoning]
style = "toggle"
mandatory = false
default = "adaptive"
notes = "thinking.type is adaptive|disabled (no enabled). Verified on the OpenAI-compatible chat surface; exact wire shape on the /anthropic surface — verify."
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.toggle]
param = "thinking.type"
on = "adaptive"
off = "disabled"

[reasoning.source]
url = "https://platform.minimaxi.com/docs/api-reference/text-chat-openai"
verified = "2026-08-18"
```

- [ ] **Step 1: Write the 5 files**
- [ ] **Step 2: Verify** — `pnpm validate`. Expected: `OK: 24 models, 18 providers, 44 offerings`.
- [ ] **Step 3: Emit + spot-check** — `pnpm emit`; confirm dist/catalog.json reports 18 providers; dist/models/xai-grok-4-6.json exists with two offerings.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "Seed opencode-zen, opencode-go, and minimax-token-plan surfaces"`

---

## Completion criteria

- `pnpm validate` passes with 24 models, 18 providers, 44 offerings, zero errors; full test suite green.
- `pnpm emit` regenerates artifacts including the new providers.
- Every seeded reasoning/cost/limits fact carries a source URL verified 2026-08-18; unknowns omitted.

## Follow-up (not this plan)

- Phase 2 sync populates opencode-zen / opencode-go offerings from live model-list endpoints.
- Phase 2: @ai-providers/sdk (buildReasoningParam, authHeaders). Phase 3: Astro site.
