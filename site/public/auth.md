# auth.md — agent & client authentication for inference-providers

inference-providers is a **public static data registry**. There is no
authentication of any kind required to consume it.

## Consuming the catalog

All machine-readable artifacts are served anonymously over HTTPS:

- `https://gregnazario.github.io/inference-providers/artifacts/catalog.json`
  — the full denormalized registry (models × offerings, pricing, limits,
  reasoning specs).
- `https://gregnazario.github.io/inference-providers/artifacts/models.json`
  and `…/providers.json` — the normalized layers.
- Per-entity files under `…/artifacts/models/<id>.json` and
  `…/artifacts/providers/<id>.json`.
- Agent discovery manifests: `/robots.txt`, `/sitemap.xml`,
  `/.well-known/api-catalog` (RFC 9727 linkset),
  `/.well-known/ai-catalog.json` (ARD), and
  `/.well-known/agent-skills/index.json`.

No registration, API keys, OAuth, rate-limit tokens, or user accounts are
needed. Machine crawlers are explicitly welcome (see robots.txt Content
Signals: ai-train=yes, search=yes, ai-input=yes). The data is Apache-2.0.

## Authenticating *upstream* (the providers we catalog)

The registry documents — but does not proxy — authentication to actual
inference APIs. Every provider record in `providers.json` carries an `auth`
array with exact header shapes for each supported method:

| method | shape |
|---|---|
| `api_key` | static bearer/custom header; template given per provider |
| `oauth` | flow type (device code or authorization code), token endpoint, scopes; e.g. xAI, OpenAI subscription plans, Alibaba Token Plan |
| `sigv4` | AWS SigV4 signing requirements (Bedrock surfaces) |
| `entra_bearer` | Microsoft Entra ID bearer tokens |
| `adc` | Google Application Default Credentials (Vertex surfaces) |

Subscription-plan (`[plan]`) blocks additionally document bundled quota and
how plan-based OAuth tokens authenticate chat traffic.

Use `@inference-providers/sdk`:

```ts
import { loadCatalog, authHeaders } from "@inference-providers/sdk"
const c = loadCatalog("./catalog.json")
const headers = authHeaders(c.providers.find(p => p.id === "zai"))
```

## Registering agents / contact

Nothing to register. If you operate a crawler that needs custom guidance,
or you are a provider whose listing needs correction, open an issue at
https://github.com/gregnazario/inference-providers/issues.
