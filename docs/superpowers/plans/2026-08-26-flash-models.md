# inference-providers — Flash Models Wave (GLM-5.3-Flash + Qwen3.8-Flash)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Add 2 new canonical models (zai/glm-5-3-flash, alibaba/qwen3-8-flash) and 6 offerings (zai native ×1, zen ×2, openrouter ×2, dashscope ×0 — Qwen3.8-Flash not yet on DashScope).

**Research facts (2026-08-26, official sources):**
- zai/glm-5-3-flash: released TODAY (2026-08-26), 320B/18B-active sparse+linear attention, 1M ctx, vision input (first multimodal GLM-5-series), thinking.type enabled-only (cannot disable; mandatory=true), MIT weights (hf zai-org/GLM-5.3-Flash), pricing $0.075/$0.25 cache $0.015 launch promo until Sep 9 UTC+8 then doubles to $0.15/$0.50/$0.03.
- alibaba/qwen3-8-flash: announced with pricing ($0.16/$0.47) but API NOT YET LIVE ("API coming soon" per official blog); not on DashScope listings. Wire ID unverified on any endpoint → canonical model file YES, offerings NO (open-weights announce model).
- grok-4.6: NO changes needed (no new variants/pricing since Aug 12; already cataloged correctly).

## Task 1: 2 canonical models

data/models/zai/glm-5-3-flash.toml:
```
id = "zai/glm-5-3-flash", name = "GLM-5.3 Flash", family = "glm", lab = "zai",
release_date = "2026-08-26", retired_date = "", knowledge_cutoff = "",
open_weights = true, hf_repo = "zai-org/GLM-5.3-Flash", license = "",
description = "First natively multimodal GLM-5-series (image/video/file in); 320B/18B-active sparse+linear attention; 1M context; thinking cannot be disabled.",
aliases = ["glm-5.3-flash"],
modalities: input [text, image, video], output [text]
```

data/models/alibaba/qwen3-8-flash.toml:
```
id = "alibaba/qwen3-8-flash", name = "Qwen3.8 Flash", family = "qwen", lab = "alibaba",
release_date = "2026-08-26", knowledge_cutoff = "", open_weights = true,
hf_repo = "Qwen/Qwen3.8-Flash-Next", license = "",
description = "Production vision-language MoE (125B LM params / 6B active); 262K context extensible to 1M via YaRN; API coming soon on QwenCloud — preview architecture for Qwen4.",
aliases = ["qwen3.8-flash", "Qwen3.8-Flash"],
modalities: input [text, image], output [text]
```
NOTE: The underlying HF model is "Qwen3.8-Flash-Next" (preview arch); the production version is served as "Qwen3.8-Flash". Use one canonical id alibaba/qwen3-8-flash.

## Task 2: Offerings

zai/glm-5-3-flash.toml (zai/offerings/):
- wire_id "glm-5.3-flash", endpoint chat-completions, status ga
- cost: 0.075/0.25/0.015 source https://docs.z.ai/guides/overview/pricing verified 2026-08-26, notes "Launch promo 50% off until Sep 9 2026 UTC+8; regular rates $0.15/$0.50/$0.03."
- limits: context 1_048_576
- reasoning: style toggle, toggle {param "thinking.type" on "enabled" off ""}, mandatory true, default on
- returns reasoning_content, must_round_trip ""
- source https://docs.z.ai/guides/vlm/glm-5.3-flash verified 2026-08-26
- quirks: update provider.toml with 1 new quirk about GLM-5.3-Flash being the first multimodal GLM-5-series

zen offerings (add if present on live list): fetch https://opencode.ai/zen/v1/models and check for glm-5.3-flash. If present add offering to opencode-zen (clone zai reasoning pattern). If absent skip silently.

## Task 3: Verify
`pnpm validate` → 64 models / 34 providers / ~227 offerings (live count truth). Full suite, emit, site build. Greps: new pages exist.

Commits: "Add GLM-5.3-Flash and Qwen3.8-Flash canonicals", "Add GLM-5.3-Flash offering"
Constraints: English only; plain commits, no trailers; branch feat/flash-models.
