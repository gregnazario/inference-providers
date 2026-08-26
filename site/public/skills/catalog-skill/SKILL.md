---
name: catalog-query
description: Query the inference-providers registry for model facts, per-provider offerings, pricing, and wire-level reasoning parameter shapes.
---

# Catalog query skill

inference-providers is an Apache-2.0 open-data registry that answers:
"which providers serve this model, at what price, through which endpoint
protocol, and with what exact reasoning/thinking parameter semantics?"

## Fetch the data

One document holds everything:

```
curl -s https://gregnazario.github.io/inference-providers/artifacts/catalog.json
```

Shape:

```jsonc
{
  "generated_at": "…", "source_commit": "…",
  "models": [   // canonical lab-owned facts: id, name, lab, release_date,
                // knowledge_cutoff, open_weights, license, modalities,
                // description; offered_via[] lists surfaces serving it
    { "id": "zai-glm-5-3-flash", … }
  ],
  "providers": [ // surfaces: kind, urls, auth methods, endpoints, quirks,
                 // plus offerings[] joined per model
    { "id": "zai", "offerings": [ { "model": "zai-glm-5-3-flash",
      "wire_id": "glm-5.3-flash", "endpoint": "openai-chat", "status": "live",
      "cost": { "input": 0.075, "output": 0.25, "cache_read": 0.015,
                "free": false, "source": { "url": "…", "verified": "2026-08-26" } },
      "features": { "streaming": true, "tools": true, "vision": true, … },
      "limits": { "context": 1048576, "output": 65536, … },
      "reasoning": { "style": "toggle", "mandatory": false, … } } ] }
  ]
}
```

`cost` numbers are USD per million tokens. Any block without a verified
provenance `source` is omitted entirely — absent means unknown, never zero.

## Reasoning specs (why this registry exists)

Every offering's `reasoning` is one of six styles describing how to ask for
thinking on the wire:

| style | how to request |
|---|---|
| `none` | model never reasons |
| `effort` | OpenAI-style: `reasoning_effort: "<value>"`; values come from `effort.values` |
| `budget` | Anthropic-style: `thinking.type=enabled`, `thinking.budget_tokens: <n>` within `effort.budget_range` |
| `toggle` | boolean switch, e.g. `enable_thinking: true/false`; off-value shown in spec (`off_value`) — some are `""`, some `"none"` |
| `adaptive` | provider decides; optionally steer via documented field (e.g. Claude 5-series `output_config.effort`) |
| `always_on` | thinking cannot be disabled — do not send disable params |

Check `mandatory`: when true, sending an explicit *disable* value errors
(GLM always-on models, ollama gpt-oss). Check `must_round_trip`: some paths
return reasoning in `reasoning_content` you must echo back on follow-ups.
`returns` tells you where reasoning text lands in the response.

## Answering common questions

- **Price for model X**: find every provider whose `offerings[].model == X`;
  report each offering's cost. Compare via the site table ordering.
- **Cheapest surface for X**: min of `cost.input`/`cost.output` across live
  offerings (`status == "live"`).
- **Does X support vision/tools?** → `features` on the offering.
- **Which effort values does X accept?** → `reasoning.effort.values`
  (subset of none/minimal/low/medium/high/xhigh/max).
- **Context window / output cap** → per-surface `limits.context` /
  `limits.output` on each offering; a lab's model can have different caps
  per provider. Max across live offerings is the safe headline number.

## SDK instead of hand-mapping

npm package `@inference-providers/sdk`:

```ts
import { loadCatalog, resolveModel, buildReasoningParam, authHeaders }
  from "@inference-providers/sdk"
const c = loadCatalog("./catalog.json")
const hit = resolveModel(c, "glm-5.3-flash")          // by alias or wire_id
buildReasoningParam(hit.offering, "high")             // correct wire param,
                                                      // typed error if illegal
authHeaders(hit.provider)                             // exact auth headers
```

It never silently clamps: out-of-vocabulary efforts raise
`ReasoningParamError` so agents fail loudly instead of guessing.

## Provenance discipline

Cite staleness honestly: every cost/limits/reasoning fact carries
`source.verified` (ISO date). Data older than ~90 days is warned in CI;
treat anything past 180 days as suspect and say so in your answer.
