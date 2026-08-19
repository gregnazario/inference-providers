# inference-providers

[![CI](https://github.com/gregnazario/inference-providers/actions/workflows/ci.yml/badge.svg)](https://github.com/gregnazario/inference-providers/actions/workflows/ci.yml)
[![Docs site](https://github.com/gregnazario/inference-providers/actions/workflows/pages.yml/badge.svg)](https://gregnazario.github.io/inference-providers/)

An open, provenance-tracked registry of AI model providers: canonical models,
provider surfaces (auth, endpoints, protocols), and per-surface offerings with
structured reasoning/thinking parameter specs. The data-first fix for what
models.dev can't model.

The registry is live: two layers of provenance-tracked TOML — canonical
models (`data/models/`, lab-owned facts) and provider offerings
(`data/providers/`, per-surface serving facts) — validated by gating rules and
emitted as typed artifacts in `dist/`. Current counts: **45 models, 30
providers, 98 offerings**.

## Usage

```bash
pnpm validate   # validate data + provenance gates
pnpm emit       # regenerate dist/ artifacts
pnpm --filter @inference-providers/sync run report   # drift check (needs provider env keys)
```

### SDK example

```ts
import { loadCatalog, resolveModel, authHeaders, buildReasoningParam } from "@inference-providers/sdk"
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
pnpm --filter @inference-providers/schema run build
pnpm --filter @inference-providers/sdk run build
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

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for the data
rules, the PR checklist, and the sync drift workflow. Every fact must carry
provenance; the full verification methodology for pricing, models, features,
auth, and API compatibility is documented on the
[Verify page](https://gregnazario.github.io/inference-providers/verify/)
([source](site/src/pages/verify.md)).

## License

This project is licensed under the [Apache License 2.0](LICENSE).
