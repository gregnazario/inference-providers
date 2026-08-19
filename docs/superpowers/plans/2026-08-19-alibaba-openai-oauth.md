# inference-providers — Alibaba Token Plan + DashScope Refinements + OpenAI ChatGPT OAuth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Add the alibaba-token-plan subscription surface; enrich alibaba-dashscope (Anthropic-compat payg endpoint, regions/workspace/trial domains, temporary keys, savings plans, QwenCloud/Bailian notes); refine qwen-coding-plan tier facts; add OpenAI's ChatGPT-plan OAuth (Codex backend surface) with sol/terra/luna offerings.

**Architecture:** Data entry only (no schema/sync changes — token-plan and codex backends have no documented public model-list endpoints). Facts from 2026-08-19 research; sources cited; unknowns omitted; verify-notes where defaults are undocumented.

## Global Constraints

English only; plain commits, NO trailers; branch `feat/alibaba-openai-oauth`. TOML layout rules as always. All new sources `verified = "2026-08-19"`. Totals after: 45 models, 30 providers, 98 offerings (91 + 3 token-plan + 1 dashscope-anthropic + 3 codex).

## Task 1: Alibaba surfaces

### 1a. NEW data/providers/alibaba-token-plan/
provider.toml: id alibaba-token-plan, name "Alibaba Token Plan", kind subscription, api_surfaces ["text","streaming"]; urls docs https://www.alibabacloud.com/help/en/model-studio/token-plan-overview, console https://modelstudio.console.alibabacloud.com/, pricing https://www.alibabacloud.com/help/en/model-studio/token-plan-personal-overview; [plan] price_usd 6.0 period monthly quota "Personal: Lite $6 (700 credits/5h, 2500/7d), Standard $20 (3000/10k), Pro $70 (12k/40k). Team: Standard $30/seat (25k credits), Pro $100/seat (100k), Max $200/seat (250k), shared packs $700/625k." notes "Sliding 5-hour + 7-day windows, no monthly reset. sk-sp- keys are NOT interchangeable with Coding Plan keys (shared prefix, different product). Interactive-tool use only (Claude Code, Cursor, Qwen Code, OpenClaw); scripts/backends banned on Personal." docs https://www.alibabacloud.com/help/en/model-studio/token-plan-personal-overview; auth id plan-key api_key Bearer env ["BAILIAN_TOKEN_PLAN_API_KEY"] key_prefix "sk-sp-" getting_credentials "Subscribe in Model Studio (Singapore region); plan keys only work on token-plan endpoints. Env var name not officially documented — verify." docs https://www.alibabacloud.com/help/en/model-studio/token-plan-team-quickstart; endpoints: compatible-mode (https://token-plan.ap-southeast-1.maas.aliyuncs.com, /compatible-mode/v1/chat/completions, openai-chat), anthropic (same base, /apps/anthropic, anthropic-messages). Quirks:
1. "China base: https://token-plan.cn-beijing.maas.aliyuncs.com (same paths). Model allowlist (exact strings): qwen3.8-max-preview (10x credit discount, night pricing 22:00-08:00 UTC+8), qwen3.7-max, qwen3.7-plus, qwen3.6-flash, glm-5.2, deepseek-v4-pro, wan2.7-image(-pro), happyhorse-1.1 video models; Team edition adds Kimi k2.7-code/k2.6/k2.5, GLM 5.1/5, MiniMax-M2.5, qwen3.6-plus/flash." docs personal-overview URL
2. "Team Edition: seat = one member + one auto-generated key; deduction order seat quota then shared packs then suspension; TPS/TPM limits at primary-account level; RAM policies AliyunTokenPlanFullAccess gate purchase." docs https://www.alibabacloud.com/help/en/model-studio/token-plan-overview

offerings/ (3, endpoint compatible-mode, reasoning = DashScope-family enable_thinking toggle default on w/ verify note — controls not documented for token-plan; returns reasoning_content, must_round_trip reasoning_content, no cost):
- glm-5-2.toml: model zai/glm-5-2, wire glm-5.2
- deepseek-v4-pro.toml: model deepseek/deepseek-v4-pro, wire deepseek-v4-pro
- kimi-k2-7-code.toml: model moonshot/kimi-k2-7-code, wire kimi-k2.7-code, notes "Team Edition only."

### 1b. MODIFY data/providers/alibaba-dashscope/provider.toml
- ADD endpoint: anthropic (https://dashscope-intl.aliyuncs.com, /apps/anthropic, anthropic-messages) — pay-as-you-go Anthropic-compatible path.
- ADD quirks:
  3. "Pay-as-you-go regions: China dashscope.aliyuncs.com, Singapore dashscope-intl, Virginia dashscope-us — each with /compatible-mode/v1 (OpenAI), /apps/anthropic (Anthropic), and native /api/v1. Workspace-dedicated domains https://{WorkspaceId}.{region}.maas.aliyuncs.com are recommended for production; rate-limited trial domains exist (trial.cn-beijing / trial.ap-southeast-1)." docs https://help.aliyun.com/en/model-studio/base-url
  4. "Temporary API keys: POST /api/v1/tokens (Bearer with permanent key) returns short-lived st- tokens (default 60s, max 1800s) inheriting the parent key's permissions — for browser/mobile use. Alibaba Cloud AccessKey/STS is NOT accepted on inference endpoints." docs https://www.alibabacloud.com/help/en/model-studio/application-obtain-temporary-authentication-token
  5. "Savings/resource plans are billing constructs on the same keys and endpoints: AI General-purpose Savings Plan (from $150/mo, discounts up to 32%/47%, no discount for DeepSeek/Kimi/GLM/MiniMax) and LLM Savings Plan prepaid credits (no discount). QwenCloud (qwencloud.com) is a separate-account console using these same endpoints and key formats; Bailian is the China brand of Model Studio." docs https://www.alibabacloud.com/help/en/model-studio/savings-plan-and-resource-package
- ADD offering qwen3-7-plus-anthropic.toml: model alibaba/qwen3-7-plus, wire qwen3.7-plus, endpoint anthropic, toggle enable_thinking true/false default on (verify note), returns reasoning_content, must_round_trip reasoning_content, source deep-thinking doc.
(Renumber quirks if needed — append is fine.)

### 1c. MODIFY data/providers/qwen-coding-plan/provider.toml [plan] block
quota → "Pro $50/mo: 6,000 requests / 5 rolling hours, 45,000/week, 90,000/month; slots restock daily 00:00 UTC+8" ; notes append "Lite discontinued: new subscriptions ended 2026-03-20, renewals ended 2026-04-13. No Max or Team tier exists on the Coding Plan (Token Plan Team is a separate product)."

## Task 2: OpenAI ChatGPT OAuth (Codex backend)

### MODIFY data/providers/openai/provider.toml
- ADD [[auth]] id "chatgpt-oauth": type oauth, transport header, header "Authorization: Bearer", flow "authorization_code_pkce or device code at auth.openai.com (public client; first-party clients only)", scopes ["openid", "profile", "email", "offline_access"], getting_credentials "codex login (or --device-auth). Tokens persist in ~/.codex/auth.json (or OS keyring); refresh tokens rotate and are effectively single-use. Billed against ChatGPT Plus/Pro/Business plans (5-hour + weekly windows), not API credits.", docs https://learn.chatgpt.com/docs/auth
- ADD [[endpoints]] id "codex-backend": base_url https://chatgpt.com, path /backend-api/codex/responses, protocol openai-responses, auth "chatgpt-oauth"
- ADD quirks:
  3. "ChatGPT-plan requests go to chatgpt.com/backend-api/codex (not api.openai.com) with Bearer tokens plus ChatGPT-Account-ID and originator headers; OpenAI allow-lists first-party originators server-side — third-party clients mimicking Codex work but are officially unsupported (ban reports exist). Enterprise access tokens (CODEX_ACCESS_TOKEN) are the supported programmatic path." docs https://learn.chatgpt.com/docs/auth
  4. "Subscription quotas: rolling 5-hour windows shared by local messages and cloud tasks plus weekly caps (Plus/Business: gpt-5.6-luna 50-280 local messages/5h; Pro 5x-20x that; flexible-pricing enterprises scale with credits — credits per 1M tokens: Sol 125/750 in/out, Terra 50/300, Luna 5/30). GPT-5.4/5.4-mini retire from ChatGPT-plan access 2026-08-31." docs https://chatgpt.com/codex/pricing/

- ADD offerings (endpoint codex-backend; cost omitted — subscription billing; source learn.chatgpt.com/docs/models):
  - gpt-5-6-sol-codex.toml: model openai/gpt-5-6, wire gpt-5.6-sol, effort param reasoning.effort values [none, low, medium, high, xhigh, max] default medium mandatory=false, returns reasoning_summary, must_round_trip encrypted_content, notes "Highest-effort Sol variant; subscription auth only."
  - gpt-5-6-terra-codex.toml: wire gpt-5.6-terra, same shape, notes "Balanced Terra variant."
  - gpt-5-6-luna-codex.toml: wire gpt-5.6-luna, same shape, notes "Fast Luna variant; highest Plus/Business 5h message counts (50-280)."

## Verification
- pnpm validate → 45 models, 30 providers, 98 offerings (after each sub-step)
- pnpm test green; site build; greps: providers/alibaba-token-plan page shows both endpoints + credits; dashscope page shows /apps/anthropic + savings-plan quirk; openai page shows chatgpt-oauth auth + codex endpoint; models/openai-gpt-5-6 page shows 8 offerings incl. sol/terra/luna.
