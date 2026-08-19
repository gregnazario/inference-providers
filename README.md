# ai-providers

An open, provenance-tracked registry of AI model providers: canonical models,
provider surfaces (auth, endpoints, protocols), and per-surface offerings with
structured reasoning/thinking parameter specs. The data-first fix for what
models.dev can't model.

The registry is live: two layers of provenance-tracked TOML — canonical
models (`data/models/`, lab-owned facts) and provider offerings
(`data/providers/`, per-surface serving facts) — validated by gating rules and
emitted as typed artifacts in `dist/`. Current counts: **24 models, 18
providers, 44 offerings**.

## Usage

```bash
pnpm validate   # validate data + provenance gates
pnpm emit       # regenerate dist/ artifacts
pnpm --filter @ai-providers/sync run report   # drift check (needs provider env keys)
```

### SDK example

```ts
import { loadCatalog, resolveModel, authHeaders, buildReasoningParam } from "@ai-providers/sdk"
const c = loadCatalog()
const { offering, provider } = resolveModel(c, "anthropic", "claude-sonnet-4-6")
const headers = authHeaders(provider, { credential: process.env.ANTHROPIC_API_KEY! })
const reasoning = buildReasoningParam(offering, { kind: "budget", budget: 4096 })
```

## Docs site

The generated site lives at
`https://gregnazario.github.io/inference-providers/` (deployed by
`.github/workflows/pages.yml` on every push to `main`).

Local development (`site/` loads the emitted catalog via the SDK, so build the
workspace packages and emit first):

```bash
pnpm --filter @ai-providers/schema run build
pnpm --filter @ai-providers/sdk run build
pnpm emit
pnpm --filter site run dev      # http://localhost:4321/inference-providers/
```

Production build (what the workflow deploys):

```bash
pnpm --filter site run build    # outputs to site/dist
```

One-time setup after pushing: repo **Settings → Pages → Source: GitHub
Actions** — the deploy workflow stays inert until Pages is enabled.

Design spec and rationale:
[`docs/superpowers/specs/2026-08-18-ai-providers-registry-design.md`](docs/superpowers/specs/2026-08-18-ai-providers-registry-design.md)
