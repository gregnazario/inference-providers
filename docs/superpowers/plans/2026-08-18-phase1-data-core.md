# ai-providers Phase 1 — Data Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the validated two-layer data core (schema + build pipeline + seed content for 10 pilot provider surfaces) that emits `catalog.json`/`models.json`/`providers.json` artifacts.

**Architecture:** Content lives as TOML in `data/` (canonical models, providers with auth/endpoints, offerings with structured reasoning specs). `packages/schema` defines zod schemas as the single source of truth for shape; `packages/build` parses, validates (integrity + provenance gates), joins, and emits JSON artifacts. Per approved spec `docs/superpowers/specs/2026-08-18-ai-providers-registry-design.md`.

**Tech Stack:** TypeScript 5 (ESM, strict), pnpm workspaces, Node >=22, zod v4, smol-toml, vitest, tsx.

## Global Constraints

- All docs, comments, commit messages, and data prose in English only.
- Git commits: plain messages, no AI attribution trailers of any kind, never commit directly to `main` (work on `feat/phase1-data-core`).
- Unknown facts are omitted (parsed as null) — never `0`, never invented. `cost.* = 0` only with `free = true` and a source.
- Mutable fact sections (`cost`, `limits`, `reasoning`) require `source.url` + `source.verified` (YYYY-MM-DD).
- Effort values restricted to the vocabulary: `none, minimal, low, medium, high, xhigh, max`.
- No live API keys anywhere in the repo or tests; unit tests use fixtures only.
- TOML has no null: optional values are omitted keys (objects) or `""` (strings) per field rules below.

## File Structure

```
pnpm-workspace.yaml
package.json                      # root scripts: test, validate, emit
.github/workflows/ci.yml
packages/schema/
  package.json  tsconfig.json
  src/common.ts                   # Source, Cost, Limits, enums/vocab
  src/model.ts                    # ModelSchema
  src/provider.ts                 # Auth, Endpoint, ProviderSchema
  src/reasoning.ts                # reasoning discriminated union
  src/offering.ts                 # OfferingSchema
  src/index.ts
  test/common.test.ts model.test.ts provider.test.ts reasoning.test.ts offering.test.ts
packages/build/
  package.json  tsconfig.json
  src/parse.ts                    # data/ → typed records + origin paths
  src/validate.ts                 # zod + referential integrity + gates
  src/join.ts                     # catalog assembly
  src/emit.ts                     # artifact writer (generated_at, source_commit)
  src/cli.ts                      # validate/emit entrypoints
  test/parse.test.ts validate.test.ts join.test.ts emit.test.ts
  test/fixtures/{models,providers}/...   # tiny fixture tree
data/
  models/{anthropic,openai,google,zai,minimax}/*.toml
  providers/{anthropic,openai,google-gemini,google-vertex,aws-bedrock,azure-foundry,openrouter,zai,zai-coding-plan,minimax}/...
CONTRIBUTING.md
```

---

### Task 1: Repo scaffold

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `.gitignore`, `tsconfig.base.json`, `packages/schema/package.json`, `packages/schema/tsconfig.json`, `packages/build/package.json`, `packages/build/tsconfig.json`

**Interfaces:**
- Produces: workspace `pnpm test` / `pnpm validate` / `pnpm emit` script targets; shared tsconfig at `../tsconfig.base.json` with `strict: true`, `module: NodeNext`, `target: ES2023`.

- [ ] **Step 1: Create the feature branch**

```bash
git switch -c feat/phase1-data-core
```

- [ ] **Step 2: Write workspace files**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
```

`package.json`:
```json
{
  "name": "ai-providers",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "validate": "pnpm --filter @ai-providers/build run validate",
    "emit": "pnpm --filter @ai-providers/build run emit"
  }
}
```

`.gitignore`:
```
node_modules/
dist/
*.tsbuildinfo
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true
  }
}
```

`packages/schema/package.json`:
```json
{
  "name": "@ai-providers/schema",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "test": "vitest run", "typecheck": "tsc --noEmit", "build": "tsc -p tsconfig.json" },
  "dependencies": { "zod": "^4.0.0" },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^3.0.0" }
}
```

`packages/schema/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

`packages/build/package.json`:
```json
{
  "name": "@ai-providers/build",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.json",
    "validate": "tsx src/cli.ts validate",
    "emit": "tsx src/cli.ts emit"
  },
  "dependencies": {
    "@ai-providers/schema": "workspace:*",
    "smol-toml": "^1.3.0",
    "zod": "^4.0.0"
  },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^3.0.0", "tsx": "^4.19.0" }
}
```

`packages/build/tsconfig.json`: identical shape to schema's.

- [ ] **Step 3: Install and verify**

Run: `pnpm install`
Expected: lockfile created, workspace packages linked.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Scaffold pnpm workspace with schema and build packages"
```

---

### Task 2: schema — common types and vocabularies

**Files:**
- Create: `packages/schema/src/common.ts`, `packages/schema/src/index.ts`
- Test: `packages/schema/test/common.test.ts`

**Interfaces:**
- Produces: `SourceSchema`, `CostSchema`, `LimitsSchema`, `EFFORT_VOCAB`, `ProviderKind`, `AuthType`, `Protocol`, `Surface`, `Status`, `ReasoningStyle`, `Returns`, `RoundTrip` (exported from `@ai-providers/schema`).

- [ ] **Step 1: Write failing tests**

`packages/schema/test/common.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { CostSchema, SourceSchema, EFFORT_VOCAB } from "../src/common.js"

describe("SourceSchema", () => {
  it("accepts url + ISO date", () => {
    expect(SourceSchema.safeParse({ url: "https://x.ai/docs", verified: "2026-08-18" }).success).toBe(true)
  })
  it("rejects non-ISO date", () => {
    expect(SourceSchema.safeParse({ url: "https://x.ai", verified: "Aug 18" }).success).toBe(false)
  })
  it("rejects non-url", () => {
    expect(SourceSchema.safeParse({ url: "not-a-url", verified: "2026-08-18" }).success).toBe(false)
  })
})

describe("CostSchema", () => {
  it("accepts omitted fields as unknown and requires source", () => {
    const r = CostSchema.safeParse({ input: 3, source: { url: "https://a.com", verified: "2026-08-18" } })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.output).toBeNull()
  })
  it("rejects zero output without free=true", () => {
    expect(CostSchema.safeParse({ output: 0, free: false, source: { url: "https://a.com", verified: "2026-08-18" } }).success).toBe(false)
  })
  it("accepts zero output with free=true", () => {
    expect(CostSchema.safeParse({ output: 0, free: true, source: { url: "https://a.com", verified: "2026-08-18" } }).success).toBe(true)
  })
})

describe("EFFORT_VOCAB", () => {
  it("contains the controlled set", () => {
    expect(EFFORT_VOCAB).toEqual(["none", "minimal", "low", "medium", "high", "xhigh", "max"])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/schema && pnpm vitest run test/common.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`packages/schema/src/common.ts`:
```ts
import { z } from "zod"

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")

export const SourceSchema = z.object({
  url: z.string().url(),
  verified: IsoDate,
})

/** nullish → normalized to null: omitted TOML key means unknown. */
const price = z.number().nonnegative().nullish().transform((v) => v ?? null)

export const CostSchema = z
  .object({
    input: price,
    output: price,
    cache_read: price,
    cache_write: price,
    free: z.boolean().default(false),
    source: SourceSchema,
  })
  .refine((c) => (c.output === 0 || c.input === 0 || c.cache_read === 0 || c.cache_write === 0) ? c.free : true, {
    message: "a zero price requires free = true",
  })

export const LimitsSchema = z.object({
  context: z.number().int().positive(),
  output: z.number().int().positive().nullish().transform((v) => v ?? null),
  source: SourceSchema,
})

export const EFFORT_VOCAB = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const
export const EffortValue = z.enum(EFFORT_VOCAB)

export const ProviderKind = z.enum(["first_party", "cloud_hosted", "aggregator", "subscription"])
export const AuthType = z.enum([
  "api_key", "oauth", "oauth_device", "sigv4", "entra_bearer", "adc", "workload_federation",
])
export const Protocol = z.enum([
  "anthropic-messages", "openai-chat", "openai-responses", "google-generate-content", "bedrock-converse",
])
export const Surface = z.enum([
  "text", "streaming", "embeddings", "files", "batch", "count_tokens", "prompt_caching",
  "fine_tuning", "realtime", "image_gen", "audio", "rerank",
])
export const Status = z.enum(["ga", "preview", "deprecated", "retired"])
export const ReasoningStyle = z.enum(["none", "effort", "budget", "toggle", "adaptive", "always_on"])
export const Returns = z.enum(["thinking_blocks", "reasoning_content", "reasoning_summary", "thought_parts", "hidden"])
export const RoundTrip = z.enum(["signature", "thought_signature", "encrypted_content", "reasoning_content"])
export type Source = z.infer<typeof SourceSchema>
export type Cost = z.infer<typeof CostSchema>
export type Limits = z.infer<typeof LimitsSchema>
```

`packages/schema/src/index.ts` (append as tasks add modules):
```ts
export * from "./common.js"
```

- [ ] **Step 4: Run tests, verify pass** — `cd packages/schema && pnpm vitest run test/common.test.ts`

- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add schema common types, cost/limits with provenance"`

---

### Task 3: schema — Model

**Files:**
- Create: `packages/schema/src/model.ts`
- Test: `packages/schema/test/model.test.ts`

**Interfaces:**
- Produces: `ModelSchema` — fields: `id` (regex `^[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9.-]*$`), `name`, `family`, `lab`, `release_date` (ISO or `""`), `retired_date` (ISO or `""`), `knowledge_cutoff` (ISO or `""`), `open_weights` bool, `hf_repo` (string, `""` ok), `license` (string, `""` ok), `modalities { input[], output[] }` (values from `["text","image","audio","video"]`), `aliases` string array default `[]`, `description` string.

- [ ] **Step 1: Failing tests**

`packages/schema/test/model.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { ModelSchema } from "../src/model.js"

const valid = {
  id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", family: "claude", lab: "anthropic",
  release_date: "2025-09-29", retired_date: "", knowledge_cutoff: "2025-07-31",
  open_weights: false, hf_repo: "", license: "",
  modalities: { input: ["text", "image"], output: ["text"] },
  description: "Flagship Claude model.",
}

describe("ModelSchema", () => {
  it("accepts a valid model", () => expect(ModelSchema.safeParse(valid).success).toBe(true))
  it("accepts unknown dates as empty strings", () => {
    expect(ModelSchema.safeParse({ ...valid, release_date: "", knowledge_cutoff: "" }).success).toBe(true)
  })
  it("rejects non-qualified id", () => {
    expect(ModelSchema.safeParse({ ...valid, id: "claude-sonnet-4-6" }).success).toBe(false)
  })
  it("rejects bad modality value", () => {
    expect(ModelSchema.safeParse({ ...valid, modalities: { input: ["vibes"], output: ["text"] } }).success).toBe(false)
  })
  it("defaults aliases to []", () => {
    const r = ModelSchema.parse(valid)
    expect(r.aliases).toEqual([])
  })
})
```

- [ ] **Step 2: Verify fail** — `cd packages/schema && pnpm vitest run test/model.test.ts`

- [ ] **Step 3: Implement**

`packages/schema/src/model.ts`:
```ts
import { z } from "zod"

const dateOrUnknown = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "ISO date or empty string for unknown")

export const ModelSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9.-]*$/, "must be lab/model-slug"),
  name: z.string().min(1),
  family: z.string().min(1),
  lab: z.string().min(1),
  release_date: dateOrUnknown,
  retired_date: dateOrUnknown,
  knowledge_cutoff: dateOrUnknown,
  open_weights: z.boolean(),
  hf_repo: z.string(),
  license: z.string(),
  modalities: z.object({
    input: z.array(z.enum(["text", "image", "audio", "video"])).min(1),
    output: z.array(z.enum(["text", "image", "audio", "video"])).min(1),
  }),
  aliases: z.array(z.string()).default([]),
  description: z.string(),
})

export type Model = z.infer<typeof ModelSchema>
```

Add `export * from "./model.js"` to `src/index.ts`.

- [ ] **Step 4: Verify pass**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add Model schema"`

---

### Task 4: schema — Provider (auth, endpoints, quirks, plan)

**Files:**
- Create: `packages/schema/src/provider.ts`
- Test: `packages/schema/test/provider.test.ts`

**Interfaces:**
- Produces: `AuthSchema` (`id`, `type`, `transport` in `header|query|request_signing`, `header`, `env` array, `key_prefix`, `extra_headers` record default `{}`, `getting_credentials`, `docs`, plus optional `flow`, `scopes`, `token_transport` for oauth), `EndpointSchema` (`id`, `base_url`, `path`, `protocol`, optional `auth`), `ProviderSchema` (`id`, `name`, `kind`, `urls {docs, console?, status?, pricing?}`, `auth[]` min 1, `endpoints[]` min 1, `api_surfaces` (must include `text` and `streaming`), `quirks[] {text, docs}` default `[]`, optional `plan {price_usd number|null, period string, quota string, notes, docs}`).

- [ ] **Step 1: Failing tests**

`packages/schema/test/provider.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { ProviderSchema } from "../src/provider.js"

const valid = {
  id: "anthropic", name: "Anthropic", kind: "first_party",
  urls: { docs: "https://platform.claude.com/docs" },
  auth: [{
    id: "api-key", type: "api_key", transport: "header", header: "x-api-key",
    env: ["ANTHROPIC_API_KEY"], key_prefix: "sk-ant-api",
    extra_headers: { "anthropic-version": "2023-06-01" },
    getting_credentials: "Console → Settings → API Keys.",
    docs: "https://platform.claude.com/docs/en/manage-claude/authentication",
  }],
  endpoints: [{
    id: "v1-messages", base_url: "https://api.anthropic.com", path: "/v1/messages",
    protocol: "anthropic-messages",
  }],
  api_surfaces: ["text", "streaming", "batch", "count_tokens", "prompt_caching"],
}

describe("ProviderSchema", () => {
  it("accepts a valid provider", () => expect(ProviderSchema.safeParse(valid).success).toBe(true))
  it("requires text and streaming surfaces", () => {
    const bad = { ...valid, api_surfaces: ["text", "batch"] }
    expect(ProviderSchema.safeParse(bad).success).toBe(false)
  })
  it("rejects endpoint auth ref that does not exist", () => {
    const bad = { ...valid, endpoints: [{ ...valid.endpoints[0]!, auth: "nope" }] }
    expect(ProviderSchema.safeParse(bad).success).toBe(false)
  })
  it("rejects duplicate auth ids", () => {
    const bad = { ...valid, auth: [valid.auth[0]!, valid.auth[0]!] }
    expect(ProviderSchema.safeParse(bad).success).toBe(false)
  })
  it("accepts templated base URLs (cloud providers)", () => {
    const ok = {
      ...valid,
      endpoints: [{ ...valid.endpoints[0]!, base_url: "https://bedrock-runtime.{region}.amazonaws.com" }],
    }
    expect(ProviderSchema.safeParse(ok).success).toBe(true)
  })
  it("defaults quirks to []", () => {
    expect(ProviderSchema.parse(valid).quirks).toEqual([])
  })
})
```

- [ ] **Step 2: Verify fail**

- [ ] **Step 3: Implement**

`packages/schema/src/provider.ts`:
```ts
import { z } from "zod"
import { AuthType, Protocol, ProviderKind, Surface } from "./common.js"

export const AuthSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: AuthType,
  transport: z.enum(["header", "query", "request_signing"]),
  header: z.string().optional(),
  env: z.array(z.string()).default([]),
  key_prefix: z.string().optional(),
  extra_headers: z.record(z.string(), z.string()).default({}),
  getting_credentials: z.string(),
  docs: z.string().url(),
  flow: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  token_transport: z.string().optional(),
})

export const EndpointSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  base_url: z.string().regex(/^https:\/\/[^\s]+$/, "https URL; {param} template slots allowed"),
  path: z.string().startsWith("/"),
  protocol: Protocol,
  auth: z.string().optional(),
})

export const PlanSchema = z.object({
  price_usd: z.number().nonnegative().nullish().transform((v) => v ?? null),
  period: z.string(),
  quota: z.string(),
  notes: z.string(),
  docs: z.string().url(),
})

export const ProviderSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    kind: ProviderKind,
    urls: z.object({
      docs: z.string().url(),
      console: z.string().url().optional(),
      status: z.string().url().optional(),
      pricing: z.string().url().optional(),
    }),
    auth: z.array(AuthSchema).min(1),
    endpoints: z.array(EndpointSchema).min(1),
    api_surfaces: z.array(Surface),
    quirks: z.array(z.object({ text: z.string(), docs: z.string().url() })).default([]),
    plan: PlanSchema.optional(),
  })
  .superRefine((p, ctx) => {
    if (!p.api_surfaces.includes("text") || !p.api_surfaces.includes("streaming")) {
      ctx.addIssue({ code: "custom", message: "api_surfaces must include text and streaming" })
    }
    const ids = p.auth.map((a) => a.id)
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "auth ids must be unique" })
    }
    for (const e of p.endpoints) {
      if (e.auth && !ids.includes(e.auth)) {
        ctx.addIssue({ code: "custom", message: `endpoint ${e.id} references unknown auth "${e.auth}"` })
      }
    }
  })

export type Provider = z.infer<typeof ProviderSchema>
```

Add `export * from "./provider.js"` to `src/index.ts`.

- [ ] **Step 4: Verify pass**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add Provider schema with auth, endpoints, surfaces"`

---

### Task 5: schema — reasoning discriminated union + Offering

**Files:**
- Create: `packages/schema/src/reasoning.ts`, `packages/schema/src/offering.ts`
- Test: `packages/schema/test/reasoning.test.ts`, `packages/schema/test/offering.test.ts`

**Interfaces:**
- Produces: `ReasoningSchema` (discriminated on `style`):
  - base fields: `style`, `mandatory` bool, `default` in `on|off|adaptive`, `notes` optional, `returns`, `must_round_trip` (value or `""`), `incompatible_with` string array default `[]`, `source`
  - `effort` style: requires `effort {param, values[] ⊆ EFFORT_VOCAB, default ∈ values, notes?}`; optional `budget` (for routers translating effort→budget)
  - `budget` style: requires `budget {param, min?, max?, zero_means_off bool, special_values record default {}, constraint?}`; optional `toggle`; `effort` forbidden
  - `toggle` style: requires `toggle {param, on, off}` (`off` may be `""` when mandatory)
  - `adaptive`: optional `effort` (soft steering)
  - `always_on`/`none`: no sub-blocks
  - Produces `OfferingSchema`: `model` (lab/model ref), `wire_id`, `endpoint` (id), `status`, `status_date` (ISO or `""`), optional `cost`, optional `limits`, optional `features {streaming, tools, structured_output, prompt_caching, vision}` (all default true), required `reasoning`.

- [ ] **Step 1: Failing tests**

`packages/schema/test/reasoning.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { ReasoningSchema } from "../src/reasoning.js"

const src = { url: "https://docs.example.com", verified: "2026-08-18" }
const base = { mandatory: false, default: "on", returns: "hidden", must_round_trip: "", source: src }

describe("ReasoningSchema", () => {
  it("effort style requires effort block with vocab values", () => {
    const ok = { ...base, style: "effort", effort: { param: "reasoning_effort", values: ["low", "medium", "high"], default: "medium" } }
    expect(ReasoningSchema.safeParse(ok).success).toBe(true)
    const badValue = { ...base, style: "effort", effort: { param: "reasoning_effort", values: ["turbo"], default: "turbo" } }
    expect(ReasoningSchema.safeParse(badValue).success).toBe(false)
  })
  it("effort default must be in values", () => {
    const bad = { ...base, style: "effort", effort: { param: "reasoning_effort", values: ["low", "high"], default: "medium" } }
    expect(ReasoningSchema.safeParse(bad).success).toBe(false)
  })
  it("budget style requires budget, rejects effort block", () => {
    const ok = { ...base, style: "budget", budget: { param: "thinking.budget_tokens", min: 1024, max: 128000, zero_means_off: false } }
    expect(ReasoningSchema.safeParse(ok).success).toBe(true)
    const bad = { ...ok, effort: { param: "x", values: ["low", "high"], default: "low" } }
    expect(ReasoningSchema.safeParse(bad).success).toBe(false)
  })
  it("budget min must be < max", () => {
    const bad = { ...base, style: "budget", budget: { param: "b", min: 5000, max: 4000, zero_means_off: false } }
    expect(ReasoningSchema.safeParse(bad).success).toBe(false)
  })
  it("toggle style requires toggle block; mandatory allows empty off", () => {
    const ok = { ...base, style: "toggle", mandatory: true, default: "on", toggle: { param: "thinking.type", on: "enabled", off: "" } }
    expect(ReasoningSchema.safeParse(ok).success).toBe(true)
    expect(ReasoningSchema.safeParse({ ...base, style: "toggle" }).success).toBe(false)
  })
  it("adaptive style allows optional effort steering", () => {
    const ok = { ...base, style: "adaptive", default: "adaptive", effort: { param: "output_config.effort", values: ["low", "medium", "high"], default: "high" } }
    expect(ReasoningSchema.safeParse(ok).success).toBe(true)
  })
  it("always_on rejects toggle/budget/effort blocks", () => {
    const ok = { ...base, style: "always_on", mandatory: true, default: "on", returns: "hidden" }
    expect(ReasoningSchema.safeParse(ok).success).toBe(true)
    const bad = { ...ok, toggle: { param: "t", on: "enabled", off: "disabled" } }
    expect(ReasoningSchema.safeParse(bad).success).toBe(false)
  })
  it("none style is valid for non-reasoning models", () => {
    expect(ReasoningSchema.safeParse({ ...base, style: "none", default: "off" }).success).toBe(true)
  })
})
```

`packages/schema/test/offering.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { OfferingSchema } from "../src/offering.js"

const src = { url: "https://docs.example.com", verified: "2026-08-18" }
const valid = {
  model: "anthropic/claude-sonnet-4-6", wire_id: "claude-sonnet-4-6", endpoint: "v1-messages",
  status: "ga", status_date: "",
  cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75, free: false, source: src },
  limits: { context: 200000, output: 64000, source: src },
  reasoning: {
    style: "budget", mandatory: false, default: "on", returns: "thinking_blocks",
    must_round_trip: "signature", incompatible_with: ["temperature", "top_p", "top_k"],
    budget: { param: "thinking.budget_tokens", min: 1024, max: 128000, zero_means_off: false },
    toggle: { param: "thinking.type", on: "enabled", off: "disabled" },
    source: src,
  },
}

describe("OfferingSchema", () => {
  it("accepts a full offering", () => expect(OfferingSchema.safeParse(valid).success).toBe(true))
  it("accepts cost/limits omitted entirely (unknown)", () => {
    const { cost, limits, ...rest } = valid
    expect(OfferingSchema.safeParse(rest).success).toBe(true)
  })
  it("defaults features to all-true", () => {
    expect(OfferingSchema.parse(valid).features).toEqual({
      streaming: true, tools: true, structured_output: true, prompt_caching: true, vision: true,
    })
  })
  it("rejects bad model ref", () => {
    expect(OfferingSchema.safeParse({ ...valid, model: "nope" }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Verify fail**

- [ ] **Step 3: Implement**

`packages/schema/src/reasoning.ts`:
```ts
import { z } from "zod"
import { EffortValue, Returns, RoundTrip, SourceSchema } from "./common.js"

const effortBlock = z.object({
  param: z.string().min(1),
  values: z.array(EffortValue).min(1),
  default: EffortValue,
  notes: z.string().optional(),
})

const budgetBlock = z
  .object({
    param: z.string().min(1),
    min: z.number().int().positive().optional(),
    max: z.number().int().positive().optional(),
    zero_means_off: z.boolean(),
    special_values: z.record(z.string(), z.string()).default({}),
    constraint: z.string().optional(),
  })
  .refine((b) => b.min === undefined || b.max === undefined || b.min < b.max, {
    message: "budget min must be < max",
  })

const toggleBlock = z.object({
  param: z.string().min(1),
  on: z.string().min(1),
  off: z.string(),
})

const base = {
  mandatory: z.boolean(),
  default: z.enum(["on", "off", "adaptive"]),
  notes: z.string().optional(),
  returns: Returns,
  must_round_trip: z.enum(["signature", "thought_signature", "encrypted_content", "reasoning_content", ""]),
  incompatible_with: z.array(z.string()).default([]),
  source: SourceSchema,
}

export const ReasoningSchema = z.discriminatedUnion("style", [
  z.object({ style: z.literal("none"), ...base }).strict(),
  z.object({ style: z.literal("effort"), ...base, effort: effortBlock, budget: budgetBlock.optional() }).strict(),
  z.object({ style: z.literal("budget"), ...base, budget: budgetBlock, toggle: toggleBlock.optional() })
    .strict()
    .refine((r) => !("effort" in r), { message: "effort block not allowed on budget style" }),
  z.object({ style: z.literal("toggle"), ...base, toggle: toggleBlock }).strict(),
  z.object({ style: z.literal("adaptive"), ...base, effort: effortBlock.optional() }).strict(),
  z.object({ style: z.literal("always_on"), ...base }).strict()
    .refine((r) => !("effort" in r) && !("budget" in r) && !("toggle" in r), {
      message: "always_on takes no control blocks",
    }),
]).superRefine((r, ctx) => {
  if (r.style === "effort" && !r.effort.values.includes(r.effort.default)) {
    ctx.addIssue({ code: "custom", message: "effort default must be one of values" })
  }
  if (r.style === "adaptive" && r.effort && !r.effort.values.includes(r.effort.default)) {
    ctx.addIssue({ code: "custom", message: "effort default must be one of values" })
  }
})

export type Reasoning = z.infer<typeof ReasoningSchema>
```

Note: `.strict()` on objects rejects stray keys — this is what forbids `effort` under `budget` style, `toggle` under `always_on`, etc. If `.superRefine` on a discriminated union is rejected by the installed zod version, wrap: `ReasoningSchema = z.union([...]).superRefine(...)` — same behavior, keep the tests green.

`packages/schema/src/offering.ts`:
```ts
import { z } from "zod"
import { CostSchema, LimitsSchema, Status } from "./common.js"
import { ReasoningSchema } from "./reasoning.js"

export const FeaturesSchema = z.object({
  streaming: z.boolean().default(true),
  tools: z.boolean().default(true),
  structured_output: z.boolean().default(true),
  prompt_caching: z.boolean().default(true),
  vision: z.boolean().default(true),
})

export const OfferingSchema = z.object({
  model: z.string().regex(/^[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9.-]*$/, "must be lab/model-slug"),
  wire_id: z.string().min(1),
  endpoint: z.string().min(1),
  status: Status,
  status_date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  cost: CostSchema.optional(),
  limits: LimitsSchema.optional(),
  features: FeaturesSchema.default({}),
  reasoning: ReasoningSchema,
})

export type Offering = z.infer<typeof OfferingSchema>
```

Add exports to `src/index.ts`, then `pnpm --filter @ai-providers/schema build && pnpm vitest run` in schema package.

- [ ] **Step 4: Verify pass** (all schema tests)
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add reasoning discriminated union and Offering schema"`

---

### Task 6: build — parse

**Files:**
- Create: `packages/build/src/parse.ts`
- Test: `packages/build/test/parse.test.ts`, fixture tree `packages/build/test/fixtures/` (copy structure: `fixtures/models/acme/test-model.toml`, `fixtures/providers/acme/provider.toml`, `fixtures/providers/acme/offerings/test-model.toml`)

**Interfaces:**
- Produces: `loadRaw(dataDir: string): { modelFiles: RawDoc[], providerFiles: RawDoc[], offeringFiles: RawOfferingDoc[] }` where `RawDoc = { path: string; data: unknown }` and `RawOfferingDoc = RawDoc & { providerId: string }`. Raw (unvalidated) TOML — validation is Task 7's job. Files: model filename (minus `.toml`) must equal the `id`'s model segment; provider dir name must equal provider `id`.

Fixture `fixtures/models/acme/test-model.toml`:
```toml
id = "acme/test-model"
name = "Test Model"
family = "test"
lab = "acme"
release_date = "2026-01-01"
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Fixture model."

[modalities]
input = ["text"]
output = ["text"]
```

Fixture `fixtures/providers/acme/provider.toml`:
```toml
id = "acme"
name = "Acme"
kind = "first_party"
api_surfaces = ["text", "streaming"]

[urls]
docs = "https://acme.example.com/docs"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
getting_credentials = "Get a key at acme.example.com."
docs = "https://acme.example.com/docs/auth"

[[endpoints]]
id = "chat"
base_url = "https://api.acme.example.com"
path = "/v1/chat/completions"
protocol = "openai-chat"
```

Fixture `fixtures/providers/acme/offerings/test-model.toml`:
```toml
model = "acme/test-model"
wire_id = "test-model"
endpoint = "chat"
status = "ga"
status_date = ""

[reasoning]
style = "none"
mandatory = false
default = "off"
returns = "hidden"
must_round_trip = ""

[reasoning.source]
url = "https://acme.example.com/docs"
verified = "2026-08-18"
```

- [ ] **Step 1: Failing tests**

`packages/build/test/parse.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { loadRaw } from "../src/parse.js"
import { join } from "node:path"

const fixtures = join(import.meta.dirname, "fixtures")

describe("loadRaw", () => {
  it("finds the model, provider, and offering files with origins", () => {
    const raw = loadRaw(fixtures)
    expect(raw.modelFiles).toHaveLength(1)
    expect(raw.providerFiles).toHaveLength(1)
    expect(raw.offeringFiles).toHaveLength(1)
    expect(raw.offeringFiles[0]!.providerId).toBe("acme")
    expect((raw.modelFiles[0]!.data as Record<string, unknown>).id).toBe("acme/test-model")
  })
  it("puts offerings of unknown providers into providerFiles-less results without throwing", () => {
    // loadRaw is structural only; integrity checks happen in validate.
    const raw = loadRaw(fixtures)
    expect(raw.offeringFiles[0]!.path).toContain("acme/offerings/test-model.toml")
  })
})
```

- [ ] **Step 2: Verify fail**

- [ ] **Step 3: Implement**

`packages/build/src/parse.ts`:
```ts
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { parse as parseToml } from "smol-toml"

export type RawDoc = { path: string; data: unknown }
export type RawOfferingDoc = RawDoc & { providerId: string }

const readToml = (path: string): unknown => parseToml(readFileSync(path, "utf8"))

const listToml = (dir: string): string[] => {
  try { return readdirSync(dir).filter((f) => f.endsWith(".toml")).sort() } catch { return [] }
}

export function loadRaw(dataDir: string) {
  const modelFiles: RawDoc[] = []
  const labDirs = listToml(join(dataDir, "models")).concat()
  const modelsDir = join(dataDir, "models")
  for (const lab of readdirSync(modelsDir).filter((d) => statSync(join(modelsDir, d)).isDirectory()).sort()) {
    for (const f of listToml(join(modelsDir, lab))) {
      modelFiles.push({ path: join("models", lab, f), data: readToml(join(modelsDir, lab, f)) })
    }
  }
  void labDirs

  const providerFiles: RawDoc[] = []
  const offeringFiles: RawOfferingDoc[] = []
  const providersDir = join(dataDir, "providers")
  for (const p of readdirSync(providersDir).filter((d) => statSync(join(providersDir, d)).isDirectory()).sort()) {
    const providerToml = join(providersDir, p, "provider.toml")
    providerFiles.push({ path: join("providers", p, "provider.toml"), data: readToml(providerToml) })
    for (const f of listToml(join(providersDir, p, "offerings"))) {
      offeringFiles.push({
        path: join("providers", p, "offerings", f),
        providerId: p,
        data: readToml(join(providersDir, p, "offerings", f)),
      })
    }
  }
  return { modelFiles, providerFiles, offeringFiles }
}
```

(Delete the unused `labDirs` lines before committing — shown only because the test file references structural behavior; final implementation keeps only what's used.)

- [ ] **Step 4: Verify pass**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add raw TOML loader for data directory"`

---

### Task 7: build — validate (integrity + provenance gates)

**Files:**
- Create: `packages/build/src/validate.ts`
- Test: `packages/build/test/validate.test.ts`

**Interfaces:**
- Consumes: `loadRaw` (Task 6), all schemas (Tasks 2–5).
- Produces: `validateData(raw: ReturnType<typeof loadRaw>, opts?: { today?: string }): { models: Model[]; providers: Provider[]; offerings: { providerId: string; data: Offering }[] }` — throws `ValidationError` (with `.issues: string[]`) listing every violation. Gates:
  1. zod-parse every doc; errors carry the file path.
  2. Model IDs unique; model file name matches id's model segment; lab dir matches id's lab segment.
  3. Provider ids unique.
  4. Every offering's `model` exists; `endpoint` exists in that provider's endpoints; `wire_id` unique within provider.
  5. Provenance staleness: `source.verified` older than 180 days before `today` (default: real today) → error; older than 90 days → collected in `.warnings`.

- [ ] **Step 1: Failing tests**

`packages/build/test/validate.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { validateData } from "../src/validate.js"
import { loadRaw } from "../src/parse.js"
import { join } from "node:path"
import { cpSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"

const fixtures = join(import.meta.dirname, "fixtures")

function withFixture(mutate: (dir: string) => void, fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "aip-"))
  cpSync(fixtures, dir, { recursive: true })
  mutate(dir)
  try { fn(dir) } finally { rmSync(dir, { recursive: true, force: true }) }
}

describe("validateData", () => {
  it("passes on the clean fixture", () => {
    const r = validateData(loadRaw(fixtures))
    expect(r.models).toHaveLength(1)
    expect(r.offerings).toHaveLength(1)
  })

  it("rejects offering referencing unknown model", () => {
    withFixture(
      (d) => {
        const p = join(d, "providers/acme/offerings/test-model.toml")
        const txt = require("node:fs").readFileSync(p, "utf8").replace('model = "acme/test-model"', 'model = "acme/ghost"')
        require("node:fs").writeFileSync(p, txt)
      },
      (d) => {
        expect(() => validateData(loadRaw(d))).toThrow(/unknown model "acme\/ghost"/)
      },
    )
  })

  it("rejects offering referencing unknown endpoint", () => {
    withFixture(
      (d) => {
        const p = join(d, "providers/acme/offerings/test-model.toml")
        const txt = require("node:fs").readFileSync(p, "utf8").replace('endpoint = "chat"', 'endpoint = "ghost"')
        require("node:fs").writeFileSync(p, txt)
      },
      (d) => expect(() => validateData(loadRaw(d))).toThrow(/unknown endpoint "ghost"/),
    )
  })

  it("fails provenance older than 180 days, warns after 90", () => {
    const old = "2025-08-01"   // >180d before 2026-08-18
    const mid = "2026-05-01"   // >90d, <180d
    withFixture(
      (d) => {
        const p = join(d, "providers/acme/offerings/test-model.toml")
        const txt = require("node:fs").readFileSync(p, "utf8").replace('verified = "2026-08-18"', `verified = "${old}"`)
        require("node:fs").writeFileSync(p, txt)
      },
      (d) => {
        expect(() => validateData(loadRaw(d), { today: "2026-08-18" })).toThrow(/stale provenance/)
        const r2 = (() => {
          const dir2 = mkdtempSync(join(tmpdir(), "aip-"))
          cpSync(fixtures, dir2, { recursive: true })
          const p2 = join(dir2, "providers/acme/offerings/test-model.toml")
          const t2 = require("node:fs").readFileSync(p2, "utf8").replace('verified = "2026-08-18"', `verified = "${mid}"`)
          require("node:fs").writeFileSync(p2, t2)
          try { return validateData(loadRaw(dir2), { today: "2026-08-18" }) } finally { rmSync(dir2, { recursive: true, force: true }) }
        })()
        expect(r2.warnings.some((w: string) => w.includes("90 days"))).toBe(true)
      },
    )
  })

  it("rejects duplicate wire_id within a provider", () => {
    withFixture(
      (d) => {
        const dir = join(d, "providers/acme/offerings")
        require("node:fs").copyFileSync(join(dir, "test-model.toml"), join(dir, "test-model-copy.toml"))
      },
      (d) => expect(() => validateData(loadRaw(d))).toThrow(/duplicate wire_id/),
    )
  })
})
```

Note: the return value also carries `warnings: string[]` (add `warnings` to the return type in the interface above when implementing).

- [ ] **Step 2: Verify fail**

- [ ] **Step 3: Implement**

`packages/build/src/validate.ts`:
```ts
import { basename } from "node:path"
import {
  ModelSchema, OfferingSchema, ProviderSchema,
  type Model, type Offering, type Provider,
} from "@ai-providers/schema"
import type { loadRaw } from "./parse.js"

export class ValidationError extends Error {
  constructor(public issues: string[]) {
    super(`validation failed:\n${issues.map((i) => `  - ${i}`).join("\n")}`)
  }
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

export function validateData(
  raw: ReturnType<typeof loadRaw>,
  opts: { today?: string } = {},
): { models: Model[]; providers: Provider[]; offerings: { providerId: string; data: Offering }[]; warnings: string[] } {
  const today = opts.today ?? new Date().toISOString().slice(0, 10)
  const issues: string[] = []
  const warnings: string[] = []

  const models = new Map<string, Model>()
  for (const f of raw.modelFiles) {
    const r = ModelSchema.safeParse(f.data)
    if (!r.success) { issues.push(`${f.path}: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`); continue }
    const m = r.data
    const [lab, slug] = m.id.split("/")
    if (slug !== basename(f.path, ".toml")) issues.push(`${f.path}: file name must match model id "${m.id}"`)
    if (!f.path.includes(`/${lab}/`)) issues.push(`${f.path}: must live under models/${lab}/`)
    if (models.has(m.id)) issues.push(`${f.path}: duplicate model id "${m.id}"`)
    models.set(m.id, m)
  }

  const providers = new Map<string, Provider>()
  for (const f of raw.providerFiles) {
    const r = ProviderSchema.safeParse(f.data)
    if (!r.success) { issues.push(`${f.path}: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`); continue }
    const p = r.data
    if (providers.has(p.id)) issues.push(`${f.path}: duplicate provider id "${p.id}"`)
    providers.set(p.id, p)
  }

  const offerings: { providerId: string; data: Offering }[] = []
  const wireIds = new Map<string, Set<string>>()
  for (const f of raw.offeringFiles) {
    const r = OfferingSchema.safeParse(f.data)
    if (!r.success) { issues.push(`${f.path}: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`); continue }
    const o = r.data
    if (!models.has(o.model)) issues.push(`${f.path}: unknown model "${o.model}"`)
    const provider = providers.get(f.providerId)
    if (!provider) { issues.push(`${f.path}: offering in unknown provider dir "${f.providerId}"`) }
    else if (!provider.endpoints.some((e) => e.id === o.endpoint)) {
      issues.push(`${f.path}: unknown endpoint "${o.endpoint}" on provider "${f.providerId}"`)
    }
    const seen = wireIds.get(f.providerId) ?? new Set<string>()
    if (seen.has(o.wire_id)) issues.push(`${f.path}: duplicate wire_id "${o.wire_id}" on provider "${f.providerId}"`)
    seen.add(o.wire_id)
    wireIds.set(f.providerId, seen)

    const checkSource = (label: string, url: string, verified: string) => {
      const age = daysBetween(verified, today)
      if (age > 180) issues.push(`${f.path}: stale provenance for ${label} (${verified}, ${age} days old) — re-verify`)
      else if (age > 90) warnings.push(`${f.path}: ${label} provenance unverified for ${age} days (>90)`)
      void url
    }
    checkSource("cost", o.cost?.source.url ?? "", o.cost?.source.verified ?? today)
    checkSource("limits", o.limits?.source.url ?? "", o.limits?.source.verified ?? today)
    checkSource("reasoning", o.reasoning.source.url, o.reasoning.source.verified)

    offerings.push({ providerId: f.providerId, data: o })
  }

  if (issues.length > 0) throw new ValidationError(issues)
  return { models: [...models.values()], providers: [...providers.values()], offerings, warnings }
}
```

ESM note: replace the test's `require("node:fs")` with `import { readFileSync, writeFileSync, copyFileSync } from "node:fs"` at the top of the test file (the plan shows `require` for brevity only — write the ESM import in the real test).

- [ ] **Step 4: Verify pass**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add validator with integrity and provenance gates"`

---

### Task 8: build — join and emit

**Files:**
- Create: `packages/build/src/join.ts`, `packages/build/src/emit.ts`
- Test: `packages/build/test/join.test.ts`, `packages/build/test/emit.test.ts`

**Interfaces:**
- Consumes: `validateData` output type (Task 7).
- Produces: `buildCatalog(v): Catalog` where `Catalog = { providers: (Provider & { offerings: Offering[] })[]; models: (Model & { offered_via: { provider: string; wire_id: string }[] })[] }`; `emitArtifacts(catalog: Catalog, outDir: string): void` writing `catalog.json`, `providers.json`, `models.json`, `models/<id>.json`, `providers/<id>.json`, each top-level file embedding `{ generated_at: string; source_commit: string }`.

- [ ] **Step 1: Failing tests**

`packages/build/test/join.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { buildCatalog } from "../src/join.js"
import { validateData } from "../src/validate.js"
import { loadRaw } from "../src/parse.js"
import { join } from "node:path"

const fixtures = join(import.meta.dirname, "fixtures")

describe("buildCatalog", () => {
  it("embeds offerings in providers and reverse-refs in models", () => {
    const c = buildCatalog(validateData(loadRaw(fixtures)))
    expect(c.providers[0]!.id).toBe("acme")
    expect(c.providers[0]!.offerings[0]!.wire_id).toBe("test-model")
    expect(c.models[0]!.offered_via).toEqual([{ provider: "acme", wire_id: "test-model" }])
  })
})
```

`packages/build/test/emit.test.ts`:
```ts
import { describe, expect, it } from "vitest"
import { emitArtifacts } from "../src/emit.js"
import { buildCatalog } from "../src/join.js"
import { validateData } from "../src/validate.js"
import { loadRaw } from "../src/parse.js"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const fixtures = join(import.meta.dirname, "fixtures")

describe("emitArtifacts", () => {
  it("writes all artifacts with metadata", () => {
    const dir = mkdtempSync(join(tmpdir(), "emit-"))
    const c = buildCatalog(validateData(loadRaw(fixtures)))
    emitArtifacts(c, dir, { source_commit: "abc1234", generated_at: "2026-08-18T00:00:00Z" })
    for (const f of ["catalog.json", "providers.json", "models.json", "models/acme-test-model.json", "providers/acme.json"]) {
      expect(existsSync(join(dir, f)), f).toBe(true)
    }
    const catalog = JSON.parse(readFileSync(join(dir, "catalog.json"), "utf8"))
    expect(catalog.generated_at).toBe("2026-08-18T00:00:00Z")
    expect(catalog.source_commit).toBe("abc1234")
    expect(catalog.providers[0].id).toBe("acme")
    rmSync(dir, { recursive: true, force: true })
  })
})
```

- [ ] **Step 2: Verify fail**

- [ ] **Step 3: Implement**

`packages/build/src/join.ts`:
```ts
import type { Model, Offering, Provider } from "@ai-providers/schema"

export type Catalog = {
  providers: (Provider & { offerings: Offering[] })[]
  models: (Model & { offered_via: { provider: string; wire_id: string }[] })[]
}

export function buildCatalog(v: {
  models: Model[]; providers: Provider[]; offerings: { providerId: string; data: Offering }[]
}): Catalog {
  const offeringsByProvider = new Map<string, Offering[]>()
  for (const { providerId, data } of v.offerings) {
    const list = offeringsByProvider.get(providerId) ?? []
    list.push(data)
    offeringsByProvider.set(providerId, list)
  }
  const providers = v.providers
    .map((p) => ({ ...p, offerings: offeringsByProvider.get(p.id) ?? [] }))
    .map((p) => ({ ...p, offerings: p.offerings.sort((a, b) => a.model.localeCompare(b.model)) }))
  const models = v.models.map((m) => ({
    ...m,
    offered_via: v.offerings
      .filter((o) => o.data.model === m.id)
      .map((o) => ({ provider: o.providerId, wire_id: o.data.wire_id })),
  }))
  return { providers, models }
}
```

`packages/build/src/emit.ts`:
```ts
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Catalog } from "./join.js"

export function emitArtifacts(
  catalog: Catalog,
  outDir: string,
  meta: { source_commit: string; generated_at: string },
): void {
  mkdirSync(join(outDir, "providers"), { recursive: true })
  mkdirSync(join(outDir, "models"), { recursive: true })
  const providers = catalog.providers.map(({ offerings, ...p }) => p)
  const models = catalog.models.map(({ offered_via, ...m }) => m)
  writeFileSync(join(outDir, "catalog.json"), JSON.stringify({ ...meta, providers: catalog.providers }, null, 2))
  writeFileSync(join(outDir, "providers.json"), JSON.stringify({ ...meta, providers }, null, 2))
  writeFileSync(join(outDir, "models.json"), JSON.stringify({ ...meta, models }, null, 2))
  for (const p of catalog.providers) {
    writeFileSync(join(outDir, "providers", `${p.id}.json`), JSON.stringify({ ...meta, ...p }, null, 2))
  }
  for (const m of catalog.models) {
    writeFileSync(join(outDir, "models", `${m.id.replace("/", "-")}.json`), JSON.stringify({ ...meta, ...m }, null, 2))
  }
}
```

- [ ] **Step 4: Verify pass**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add catalog joiner and artifact emitter"`

---

### Task 9: build — CLI wiring

**Files:**
- Create: `packages/build/src/cli.ts`

**Interfaces:**
- Produces: `pnpm validate` → validates repo-root `data/` (prints warnings, exits 1 on error); `pnpm emit` → validates then writes `dist/` with real git SHA + UTC timestamp.

- [ ] **Step 1: Implement**

`packages/build/src/cli.ts`:
```ts
import { execSync } from "node:child_process"
import { loadRaw } from "./parse.js"
import { validateData } from "./validate.js"
import { buildCatalog } from "./join.js"
import { emitArtifacts } from "./emit.js"
import { join } from "node:path"

const dataDir = join(import.meta.dirname, "../../../data")
const command = process.argv[2] ?? "validate"

const raw = loadRaw(dataDir)
const validated = validateData(raw)
for (const w of validated.warnings) console.warn(`WARN: ${w}`)

if (command === "validate") {
  console.log(`OK: ${validated.models.length} models, ${validated.providers.length} providers, ${validated.offerings.length} offerings`)
} else if (command === "emit") {
  const sha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim()
  emitArtifacts(buildCatalog(validated), join(dataDir, "../dist"), {
    source_commit: sha,
    generated_at: new Date().toISOString(),
  })
  console.log(`Emitted artifacts to dist/ (commit ${sha})`)
} else {
  console.error(`unknown command "${command}" — use validate | emit`)
  process.exit(2)
}
```

- [ ] **Step 2: Smoke-test against the fixture-shaped real data (empty so far)**

`data/` doesn't exist yet. The seed tasks create it; until Task 10 the CLI legitimately fails on missing `data/`. Verify only that the CLI starts:

Run: `cd packages/build && pnpm exec tsx src/cli.ts validate 2>&1 | head -3`
Expected: ENOENT error mentioning `data/models` (proves wiring; acceptable until Task 10).

- [ ] **Step 3: Commit** — `git add -A && git commit -m "Add validate/emit CLI"`

---

### Task 10: seed — canonical models

**Files:**
- Create: 16 files under `data/models/`. File names must equal the model segment of `id`.

All reasoning-related offering facts land in Task 11+; this task is models only. Dates/prices use only research-verified values; unknown = `""` / omitted.

`data/models/anthropic/claude-3-7-sonnet.toml`:
```toml
id = "anthropic/claude-3-7-sonnet"
name = "Claude 3.7 Sonnet"
family = "claude"
lab = "anthropic"
release_date = "2025-02-19"
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "First Claude model with toggleable extended thinking; returns full thinking."
aliases = ["claude-3-7-sonnet-20250219"]
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/anthropic/claude-sonnet-4-5.toml`:
```toml
id = "anthropic/claude-sonnet-4-5"
name = "Claude Sonnet 4.5"
family = "claude"
lab = "anthropic"
release_date = "2025-09-29"
retired_date = ""
knowledge_cutoff = "2025-07-31"
open_weights = false
hf_repo = ""
license = ""
description = "Thinking-on Sonnet; budget_tokens caps thinking, output is summarized."
aliases = ["claude-sonnet-4-5-20250929"]
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/anthropic/claude-sonnet-4-6.toml`:
```toml
id = "anthropic/claude-sonnet-4-6"
name = "Claude Sonnet 4.6"
family = "claude"
lab = "anthropic"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Manual budget thinking deprecated in favor of adaptive thinking."
aliases = []
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/anthropic/claude-opus-4-6.toml`:
```toml
id = "anthropic/claude-opus-4-6"
name = "Claude Opus 4.6"
family = "claude"
lab = "anthropic"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Opus with adaptive thinking; no manual interleaved thinking mode."
aliases = []
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/anthropic/claude-haiku-4-5.toml`:
```toml
id = "anthropic/claude-haiku-4-5"
name = "Claude Haiku 4.5"
family = "claude"
lab = "anthropic"
release_date = "2025-10-01"
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Fast Claude; supports extended thinking but not interleaved thinking."
aliases = ["claude-haiku-4-5-20251001"]
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/openai/gpt-5.toml`:
```toml
id = "openai/gpt-5"
name = "GPT-5"
family = "gpt"
lab = "openai"
release_date = "2025-08-07"
retired_date = ""
knowledge_cutoff = "2024-09-30"
open_weights = false
hf_repo = ""
license = ""
description = "Reasoning model; default effort medium, no 'none'."
aliases = []
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/openai/gpt-5-1.toml`:
```toml
id = "openai/gpt-5-1"
name = "GPT-5.1"
family = "gpt"
lab = "openai"
release_date = "2025-11-13"
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Defaults to effort 'none'; supports none/low/medium/high."
aliases = []
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/openai/gpt-5-6.toml`:
```toml
id = "openai/gpt-5-6"
name = "GPT-5.6"
family = "gpt"
lab = "openai"
release_date = "2026-06-25"
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Adds xhigh everywhere and max on Responses; Chat Completions rejects tools unless effort is none."
aliases = []
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/openai/o3.toml`:
```toml
id = "openai/o3"
name = "o3"
family = "o"
lab = "openai"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "o-series reasoning model; effort low/medium/high."
aliases = []
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/google/gemini-2-5-pro.toml`:
```toml
id = "google/gemini-2-5-pro"
name = "Gemini 2.5 Pro"
family = "gemini"
lab = "google"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Thinking cannot be disabled; thinkingBudget 128-32768."
aliases = ["gemini-2.5-pro"]
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/google/gemini-2-5-flash.toml`:
```toml
id = "google/gemini-2-5-flash"
name = "Gemini 2.5 Flash"
family = "gemini"
lab = "google"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Hybrid thinking; budget 0 disables, -1 is dynamic."
aliases = ["gemini-2.5-flash"]
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/google/gemini-3-pro.toml`:
```toml
id = "google/gemini-3-pro"
name = "Gemini 3 Pro"
family = "gemini"
lab = "google"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Uses thinkingLevel (low/high); cannot disable thinking."
aliases = ["gemini-3-pro-preview"]
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/zai/glm-4-6.toml`:
```toml
id = "zai/glm-4-6"
name = "GLM-4.6"
family = "glm"
lab = "zai"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = true
hf_repo = "zai-org/GLM-4.6"
license = ""
description = "Hybrid thinking, on by default, disableable via thinking.type."
aliases = []
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/zai/glm-5-3.toml`:
```toml
id = "zai/glm-5-3"
name = "GLM-5.3"
family = "glm"
lab = "zai"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Flagship GLM; forced thinking — thinking.type enabled/disabled both error."
aliases = []
[modalities]
input = ["text", "image"]
output = ["text"]
```

`data/models/minimax/minimax-m2-5.toml`:
```toml
id = "minimax/minimax-m2-5"
name = "MiniMax M2.5"
family = "minimax-m"
lab = "minimax"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = true
hf_repo = "MiniMax-AI/MiniMax-M2.5"
license = ""
description = "Thinking cannot be turned off; thinking.type disabled has no effect."
aliases = ["MiniMax-M2.5"]
[modalities]
input = ["text"]
output = ["text"]
```

`data/models/minimax/minimax-m3.toml`:
```toml
id = "minimax/minimax-m3"
name = "MiniMax M3"
family = "minimax-m"
lab = "minimax"
release_date = ""
retired_date = ""
knowledge_cutoff = ""
open_weights = false
hf_repo = ""
license = ""
description = "Controllable adaptive thinking; disabled skips thinking."
aliases = ["MiniMax-M3"]
[modalities]
input = ["text"]
output = ["text"]
```

- [ ] **Step 1: Write the files above** (models with `release_date = ""` — leave unknown)
- [ ] **Step 2: Verify** — `pnpm validate` at repo root. Expected: fails with "unknown model" on nothing — actually fails only if data/models has no providers dir; provider seeding is next. If `loadRaw` throws on missing `data/providers`, create `data/providers/.gitkeep` and note `loadRaw` must tolerate an empty providers dir: wrap `readdirSync(providersDir)` in the same try/catch pattern as `listToml` returning `[]` when missing. Make that small parse.ts change in this task.
Expected after fix: `OK: 15 models, 0 providers, 0 offerings`. (Corrected during execution: the file list contains 16 models — 5 anthropic + 4 openai + 3 google + 2 zai + 2 minimax — and all 16 are referenced by downstream offerings, so the expected line is `OK: 16 models, 0 providers, 0 offerings`.)
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Seed canonical models for anthropic, openai, google, zai, minimax"`

---

### Task 11: seed — anthropic + aws-bedrock

**Files:**
- Create: `data/providers/anthropic/provider.toml`, `data/providers/anthropic/offerings/{claude-3-7-sonnet,claude-sonnet-4-5,claude-sonnet-4-6,claude-opus-4-6,claude-haiku-4-5}.toml`, `data/providers/aws-bedrock/provider.toml`, `data/providers/aws-bedrock/offerings/{claude-sonnet-4-6,claude-sonnet-4-5}.toml`

`data/providers/anthropic/provider.toml`:
```toml
id = "anthropic"
name = "Anthropic"
kind = "first_party"
api_surfaces = ["text", "streaming", "batch", "count_tokens", "prompt_caching", "files"]

[urls]
docs = "https://platform.claude.com/docs/en/api/overview"
console = "https://console.anthropic.com"
status = "https://status.anthropic.com"
pricing = "https://platform.claude.com/docs/en/docs/about-claude/models"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "x-api-key"
env = ["ANTHROPIC_API_KEY"]
key_prefix = "sk-ant-api"
extra_headers = { anthropic-version = "2023-06-01" }
getting_credentials = "Console → Settings → API Keys. Keys are org-scoped; optional expiry (3h to never)."
docs = "https://platform.claude.com/docs/en/manage-claude/authentication"

[[auth]]
id = "oauth"
type = "oauth"
flow = "authorization_code_pkce"
transport = "header"
token_transport = "header"
header = "x-api-key"
extra_headers = { anthropic-beta = "oauth-2025-04-20", anthropic-version = "2023-06-01" }
scopes = ["org:create_api_key", "user:profile", "user:inference"]
getting_credentials = "Run Claude Code and sign in with a Claude subscription; OAuth tokens are sent via x-api-key (not Bearer)."
docs = "https://code.claude.com/docs/en/authentication"

[[endpoints]]
id = "v1-messages"
base_url = "https://api.anthropic.com"
path = "/v1/messages"
protocol = "anthropic-messages"

[[endpoints]]
id = "v1-messages-batches"
base_url = "https://api.anthropic.com"
path = "/v1/messages/batches"
protocol = "anthropic-messages"

[[quirks]]
text = "Thinking is incompatible with temperature/top_p/top_k, forced tool use, and prefill; changing thinking params invalidates prompt caches; thinking signatures must be replayed unmodified in tool-use turns."
docs = "https://platform.claude.com/docs/en/docs/build-with-claude/extended-thinking"
```

`data/providers/anthropic/offerings/claude-3-7-sonnet.toml`:
```toml
model = "anthropic/claude-3-7-sonnet"
wire_id = "claude-3-7-sonnet-20250219"
endpoint = "v1-messages"
status = "ga"
status_date = ""

[cost]
source = { url = "https://platform.claude.com/docs/en/docs/about-claude/models", verified = "2026-08-18" }

[limits]
context = 200_000
source = { url = "https://platform.claude.com/docs/en/docs/about-claude/models", verified = "2026-08-18" }

[reasoning]
style = "budget"
mandatory = false
default = "off"
notes = "Toggleable extended thinking; returns full (not summarized) thinking."
returns = "thinking_blocks"
must_round_trip = "signature"
incompatible_with = ["temperature", "top_p", "top_k"]

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.budget]
param = "thinking.budget_tokens"
min = 1024
max = 128_000
zero_means_off = false
constraint = "must be < max_tokens"

[reasoning.source]
url = "https://platform.claude.com/docs/en/docs/build-with-claude/extended-thinking"
verified = "2026-08-18"
```

`data/providers/anthropic/offerings/claude-sonnet-4-5.toml`:
```toml
model = "anthropic/claude-sonnet-4-5"
wire_id = "claude-sonnet-4-5"
endpoint = "v1-messages"
status = "ga"
status_date = ""

[cost]
input = 3.0
output = 15.0
cache_read = 0.3
cache_write = 3.75
free = false
source = { url = "https://platform.claude.com/docs/en/docs/about-claude/models", verified = "2026-08-18" }

[limits]
context = 200_000
output = 64_000
source = { url = "https://platform.claude.com/docs/en/docs/about-claude/models", verified = "2026-08-18" }

[reasoning]
style = "budget"
mandatory = false
default = "on"
notes = "Thinking-on model; budget caps thinking; output summarized but billed at full internal tokens."
returns = "thinking_blocks"
must_round_trip = "signature"
incompatible_with = ["temperature", "top_p", "top_k"]

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.budget]
param = "thinking.budget_tokens"
min = 1024
max = 128_000
zero_means_off = false
constraint = "must be < max_tokens"

[reasoning.source]
url = "https://platform.claude.com/docs/en/docs/build-with-claude/extended-thinking"
verified = "2026-08-18"
```

`data/providers/anthropic/offerings/claude-sonnet-4-6.toml`:
```toml
model = "anthropic/claude-sonnet-4-6"
wire_id = "claude-sonnet-4-6"
endpoint = "v1-messages"
status = "ga"
status_date = ""

[cost]
source = { url = "https://platform.claude.com/docs/en/docs/about-claude/models", verified = "2026-08-18" }

[limits]
context = 200_000
source = { url = "https://platform.claude.com/docs/en/docs/about-claude/models", verified = "2026-08-18" }

[reasoning]
style = "budget"
mandatory = false
default = "on"
notes = "Manual budget thinking deprecated in favor of adaptive thinking."
returns = "thinking_blocks"
must_round_trip = "signature"
incompatible_with = ["temperature", "top_p", "top_k"]

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.budget]
param = "thinking.budget_tokens"
min = 1024
max = 128_000
zero_means_off = false
constraint = "must be < max_tokens"

[reasoning.source]
url = "https://platform.claude.com/docs/en/docs/build-with-claude/extended-thinking"
verified = "2026-08-18"
```

`data/providers/anthropic/offerings/claude-opus-4-6.toml`:
```toml
model = "anthropic/claude-opus-4-6"
wire_id = "claude-opus-4-6"
endpoint = "v1-messages"
status = "ga"
status_date = ""

[cost]
source = { url = "https://platform.claude.com/docs/en/docs/about-claude/models", verified = "2026-08-18" }

[limits]
context = 200_000
source = { url = "https://platform.claude.com/docs/en/docs/about-claude/models", verified = "2026-08-18" }

[reasoning]
style = "adaptive"
mandatory = false
default = "adaptive"
notes = "Adaptive thinking; no manual interleaved mode."
returns = "thinking_blocks"
must_round_trip = "signature"

[reasoning.source]
url = "https://platform.claude.com/docs/en/docs/build-with-claude/adaptive-thinking"
verified = "2026-08-18"
```

`data/providers/anthropic/offerings/claude-haiku-4-5.toml`:
```toml
model = "anthropic/claude-haiku-4-5"
wire_id = "claude-haiku-4-5"
endpoint = "v1-messages"
status = "ga"
status_date = ""

[cost]
source = { url = "https://platform.claude.com/docs/en/docs/about-claude/models", verified = "2026-08-18" }

[limits]
context = 200_000
source = { url = "https://platform.claude.com/docs/en/docs/about-claude/models", verified = "2026-08-18" }

[reasoning]
style = "budget"
mandatory = false
default = "on"
returns = "thinking_blocks"
must_round_trip = "signature"
incompatible_with = ["temperature", "top_p", "top_k"]

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.budget]
param = "thinking.budget_tokens"
min = 1024
zero_means_off = false
constraint = "must be < max_tokens"

[reasoning.source]
url = "https://platform.claude.com/docs/en/docs/build-with-claude/extended-thinking"
verified = "2026-08-18"
```

`data/providers/aws-bedrock/provider.toml`:
```toml
id = "aws-bedrock"
name = "AWS Bedrock"
kind = "cloud_hosted"
api_surfaces = ["text", "streaming", "batch", "embeddings"]

[urls]
docs = "https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html"
console = "https://console.aws.amazon.com/bedrock"

[[auth]]
id = "bearer-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["AWS_BEARER_TOKEN_BEDROCK"]
getting_credentials = "Bedrock console → API keys. Short-term (<=12h) or long-lived; governed by bedrock:CallWithBearerToken. Not valid for bidirectional streaming, Agents, or Data Automation."
docs = "https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html"

[[auth]]
id = "sigv4"
type = "sigv4"
transport = "request_signing"
env = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"]
getting_credentials = "Standard AWS credentials chain (IAM user, role, SSO). Signs the request with SigV4; service 'bedrock'."
docs = "https://docs.aws.amazon.com/bedrock/latest/userguide/security_iam.html"

[[endpoints]]
id = "converse"
base_url = "https://bedrock-runtime.{region}.amazonaws.com"
path = "/model/{modelId}/converse"
protocol = "bedrock-converse"
auth = "sigv4"

[[endpoints]]
id = "invoke-anthropic"
base_url = "https://bedrock-runtime.{region}.amazonaws.com"
path = "/model/{modelId}/invoke"
protocol = "anthropic-messages"
auth = "sigv4"

[[quirks]]
text = "Cross-region inference profiles prefix model IDs with us./eu./apac./global. — e.g. us.anthropic.claude-sonnet-4-6. Streaming required when max_tokens > 21,333 with thinking."
docs = "https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html"
```

`data/providers/aws-bedrock/offerings/claude-sonnet-4-6.toml`:
```toml
model = "anthropic/claude-sonnet-4-6"
wire_id = "anthropic.claude-sonnet-4-6"
endpoint = "invoke-anthropic"
status = "ga"
status_date = ""

[features]
vision = true

[reasoning]
style = "budget"
mandatory = false
default = "on"
returns = "thinking_blocks"
must_round_trip = "signature"
incompatible_with = ["temperature", "top_p", "top_k"]

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.budget]
param = "thinking.budget_tokens"
min = 1024
zero_means_off = false
constraint = "must be < max_tokens"

[reasoning.source]
url = "https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-extended-thinking.html"
verified = "2026-08-18"
```

`data/providers/aws-bedrock/offerings/claude-sonnet-4-5.toml`:
```toml
model = "anthropic/claude-sonnet-4-5"
wire_id = "anthropic.claude-sonnet-4-5-20250929-v1:0"
endpoint = "invoke-anthropic"
status = "ga"
status_date = ""

[reasoning]
style = "budget"
mandatory = false
default = "on"
returns = "thinking_blocks"
must_round_trip = "signature"
incompatible_with = ["temperature", "top_p", "top_k"]

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.budget]
param = "thinking.budget_tokens"
min = 1024
zero_means_off = false
constraint = "must be < max_tokens"

[reasoning.source]
url = "https://docs.aws.amazon.com/bedrock/latest/userguide/claude-messages-extended-thinking.html"
verified = "2026-08-18"
```

- [ ] **Step 1: Write the files**
- [ ] **Step 2: Verify** — `pnpm validate`. Expected: `OK: 16 models, 2 providers, 7 offerings`.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Seed anthropic and aws-bedrock surfaces"`

---

### Task 12: seed — openai + azure-foundry

**Files:**
- Create: `data/providers/openai/provider.toml`, `data/providers/openai/offerings/{gpt-5,gpt-5-1,gpt-5-6,o3}-{chat,responses}.toml` (8 files), `data/providers/azure-foundry/provider.toml`, `data/providers/azure-foundry/offerings/gpt-5-6-responses.toml`

`data/providers/openai/provider.toml`:
```toml
id = "openai"
name = "OpenAI"
kind = "first_party"
api_surfaces = ["text", "streaming", "embeddings", "files", "batch", "fine_tuning", "realtime", "image_gen", "audio"]

[urls]
docs = "https://developers.openai.com/api/reference/overview/"
console = "https://platform.openai.com"
status = "https://status.openai.com"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["OPENAI_API_KEY"]
key_prefix = "sk-"
extra_headers = { }
getting_credentials = "platform.openai.com → API Keys. Project keys (sk-proj-) scope to a project; send OpenAI-Organization / OpenAI-Project when a key spans orgs/projects."
docs = "https://developers.openai.com/api/reference/overview/"

[[endpoints]]
id = "v1-chat-completions"
base_url = "https://api.openai.com"
path = "/v1/chat/completions"
protocol = "openai-chat"

[[endpoints]]
id = "v1-responses"
base_url = "https://api.openai.com"
path = "/v1/responses"
protocol = "openai-responses"

[[quirks]]
text = "Assistants API sunsets 2026-08-26; migrate to Responses. Reasoning models require max_completion_tokens (chat) instead of max_tokens."
docs = "https://developers.openai.com/api/docs/guides/migrate-to-responses"
```

`data/providers/openai/offerings/gpt-5-chat.toml`:
```toml
model = "openai/gpt-5"
wire_id = "gpt-5"
endpoint = "v1-chat-completions"
status = "ga"
status_date = ""

[cost]
input = 1.25
output = 10.0
cache_read = 0.13
free = false
source = { url = "https://developers.openai.com/api/docs/guides/latest-model", verified = "2026-08-18" }

[reasoning]
style = "effort"
mandatory = true
default = "on"
notes = "No 'none': reasoning cannot be fully disabled. minimal-low-medium-high; default medium."
returns = "hidden"
must_round_trip = ""

[reasoning.effort]
param = "reasoning_effort"
values = ["minimal", "low", "medium", "high"]
default = "medium"

[reasoning.source]
url = "https://developers.openai.com/api/docs/guides/reasoning"
verified = "2026-08-18"
```

`data/providers/openai/offerings/gpt-5-responses.toml`:
```toml
model = "openai/gpt-5"
wire_id = "gpt-5"
endpoint = "v1-responses"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = true
default = "on"
returns = "hidden"
must_round_trip = "encrypted_content"
incompatible_with = ["temperature", "top_p"]

[reasoning.effort]
param = "reasoning.effort"
values = ["minimal", "low", "medium", "high"]
default = "medium"

[reasoning.source]
url = "https://developers.openai.com/api/docs/guides/reasoning"
verified = "2026-08-18"
```

`data/providers/openai/offerings/gpt-5-1-chat.toml`:
```toml
model = "openai/gpt-5-1"
wire_id = "gpt-5.1"
endpoint = "v1-chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = false
default = "off"
notes = "Defaults to none; tool calls supported at all efforts."
returns = "hidden"
must_round_trip = ""

[reasoning.effort]
param = "reasoning_effort"
values = ["none", "low", "medium", "high"]
default = "none"

[reasoning.source]
url = "https://developers.openai.com/api/docs/guides/reasoning"
verified = "2026-08-18"
```

`data/providers/openai/offerings/gpt-5-1-responses.toml`:
```toml
model = "openai/gpt-5-1"
wire_id = "gpt-5.1"
endpoint = "v1-responses"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = false
default = "off"
returns = "reasoning_summary"
must_round_trip = "encrypted_content"
incompatible_with = ["temperature", "top_p"]

[reasoning.effort]
param = "reasoning.effort"
values = ["none", "low", "medium", "high"]
default = "none"

[reasoning.source]
url = "https://developers.openai.com/api/docs/guides/reasoning"
verified = "2026-08-18"
```

`data/providers/openai/offerings/gpt-5-6-chat.toml`:
```toml
model = "openai/gpt-5-6"
wire_id = "gpt-5.6"
endpoint = "v1-chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = false
default = "on"
notes = "tools + reasoning_effort conflict on Chat Completions: use effort none or the Responses endpoint."
returns = "hidden"
must_round_trip = ""

[reasoning.effort]
param = "reasoning_effort"
values = ["none", "low", "medium", "high", "xhigh"]
default = "medium"

[reasoning.source]
url = "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/reasoning"
verified = "2026-08-18"
```

`data/providers/openai/offerings/gpt-5-6-responses.toml`:
```toml
model = "openai/gpt-5-6"
wire_id = "gpt-5.6"
endpoint = "v1-responses"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = false
default = "on"
notes = "'max' effort only on Responses. reasoning.mode standard|pro and reasoning.context auto|current_turn|all_turns (all_turns default) are 5.6-only."
returns = "reasoning_summary"
must_round_trip = "encrypted_content"
incompatible_with = ["temperature", "top_p"]

[reasoning.effort]
param = "reasoning.effort"
values = ["none", "low", "medium", "high", "xhigh", "max"]
default = "medium"

[reasoning.source]
url = "https://developers.openai.com/api/docs/guides/reasoning"
verified = "2026-08-18"
```

`data/providers/openai/offerings/o3-chat.toml`:
```toml
model = "openai/o3"
wire_id = "o3"
endpoint = "v1-chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = true
default = "on"
returns = "hidden"
must_round_trip = ""
incompatible_with = ["temperature", "top_p"]

[reasoning.effort]
param = "reasoning_effort"
values = ["low", "medium", "high"]
default = "medium"

[reasoning.source]
url = "https://developers.openai.com/api/docs/guides/reasoning"
verified = "2026-08-18"
```

`data/providers/openai/offerings/o3-responses.toml`:
```toml
model = "openai/o3"
wire_id = "o3"
endpoint = "v1-responses"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = true
default = "on"
returns = "hidden"
must_round_trip = "encrypted_content"
incompatible_with = ["temperature", "top_p"]

[reasoning.effort]
param = "reasoning.effort"
values = ["low", "medium", "high"]
default = "medium"

[reasoning.source]
url = "https://developers.openai.com/api/docs/guides/reasoning"
verified = "2026-08-18"
```

`data/providers/azure-foundry/provider.toml`:
```toml
id = "azure-foundry"
name = "Azure AI Foundry"
kind = "cloud_hosted"
api_surfaces = ["text", "streaming", "embeddings", "files", "batch", "fine_tuning"]

[urls]
docs = "https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle"
console = "https://ai.azure.com"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "api-key"
env = ["AZURE_OPENAI_API_KEY"]
getting_credentials = "Foundry resource → Keys and Endpoint. 32-char hex keys."
docs = "https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle"

[[auth]]
id = "entra"
type = "entra_bearer"
transport = "header"
header = "Authorization: Bearer"
getting_credentials = "Microsoft Entra token with scope https://ai.azure.com/.default; SDKs refresh automatically. Roles like 'Cognitive Services OpenAI User'."
docs = "https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle"

[[endpoints]]
id = "v1-responses"
base_url = "https://{resource}.openai.azure.com"
path = "/openai/v1/responses"
protocol = "openai-responses"

[[endpoints]]
id = "v1-chat-completions"
base_url = "https://{resource}.openai.azure.com"
path = "/openai/v1/chat/completions"
protocol = "openai-chat"

[[quirks]]
text = "The v1 route needs no api-version query param and works with unmodified OpenAI SDKs (set OPENAI_BASE_URL). Classic route uses deployment names + api-version; responses include content_filter_results."
docs = "https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle"
```

`data/providers/azure-foundry/offerings/gpt-5-6-responses.toml`:
```toml
model = "openai/gpt-5-6"
wire_id = "gpt-5.6"
endpoint = "v1-responses"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = false
default = "on"
notes = "Same per-model matrix as OpenAI: none default on 5.1, xhigh on 5.4+, max on 5.6 Responses."
returns = "reasoning_summary"
must_round_trip = "encrypted_content"
incompatible_with = ["temperature", "top_p", "max_tokens"]

[reasoning.effort]
param = "reasoning.effort"
values = ["none", "low", "medium", "high", "xhigh", "max"]
default = "medium"

[reasoning.source]
url = "https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/reasoning"
verified = "2026-08-18"
```

- [ ] **Step 1: Write the files**
- [ ] **Step 2: Verify** — `pnpm validate`. Expected: `OK: 16 models, 4 providers, 16 offerings`.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Seed openai and azure-foundry surfaces"`

---

### Task 13: seed — google-gemini + google-vertex

**Files:**
- Create: `data/providers/google-gemini/provider.toml`, `data/providers/google-gemini/offerings/{gemini-2-5-pro,gemini-2-5-flash,gemini-3-pro}.toml`, `data/providers/google-vertex/provider.toml`, `data/providers/google-vertex/offerings/gemini-2-5-pro.toml`

`data/providers/google-gemini/provider.toml`:
```toml
id = "google-gemini"
name = "Google Gemini API"
kind = "first_party"
api_surfaces = ["text", "streaming", "embeddings", "files", "batch", "count_tokens", "prompt_caching"]

[urls]
docs = "https://ai.google.dev/api"
console = "https://aistudio.google.com"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "x-goog-api-key"
env = ["GEMINI_API_KEY", "GOOGLE_API_KEY"]
getting_credentials = "AI Studio → Get API key. Prefer the x-goog-api-key header; the legacy ?key= query param leaks keys into logs."
docs = "https://ai.google.dev/api"

[[endpoints]]
id = "generate-content"
base_url = "https://generativelanguage.googleapis.com"
path = "/v1beta/models/{model}:generateContent"
protocol = "google-generate-content"

[[quirks]]
text = "OpenAI-compatible route: use https://generativelanguage.googleapis.com/v1beta/openai/ as base URL with the same API key."
docs = "https://ai.google.dev/gemini-api/docs/openai"
```

`data/providers/google-gemini/offerings/gemini-2-5-pro.toml`:
```toml
model = "google/gemini-2-5-pro"
wire_id = "gemini-2.5-pro"
endpoint = "generate-content"
status = "ga"
status_date = ""

[reasoning]
style = "budget"
mandatory = true
default = "on"
returns = "thought_parts"
must_round_trip = "thought_signature"

[reasoning.budget]
param = "generationConfig.thinkingConfig.thinkingBudget"
min = 128
max = 32_768
zero_means_off = false
special_values = { "-1" = "dynamic" }

[reasoning.source]
url = "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking"
verified = "2026-08-18"
```

`data/providers/google-gemini/offerings/gemini-2-5-flash.toml`:
```toml
model = "google/gemini-2-5-flash"
wire_id = "gemini-2.5-flash"
endpoint = "generate-content"
status = "ga"
status_date = ""

[reasoning]
style = "budget"
mandatory = false
default = "on"
returns = "thought_parts"
must_round_trip = "thought_signature"

[reasoning.budget]
param = "generationConfig.thinkingConfig.thinkingBudget"
min = 1
max = 24_576
zero_means_off = true
special_values = { "-1" = "dynamic" }

[reasoning.source]
url = "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking"
verified = "2026-08-18"
```

`data/providers/google-gemini/offerings/gemini-3-pro.toml`:
```toml
model = "google/gemini-3-pro"
wire_id = "gemini-3-pro-preview"
endpoint = "generate-content"
status = "preview"
status_date = ""

[reasoning]
style = "effort"
mandatory = true
default = "on"
notes = "thinkingLevel replaces thinkingBudget on Gemini 3; specifying both errors. Cannot disable thinking."
returns = "thought_parts"
must_round_trip = "thought_signature"

[reasoning.effort]
param = "generationConfig.thinkingConfig.thinkingLevel"
values = ["low", "high"]
default = "high"

[reasoning.source]
url = "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking"
verified = "2026-08-18"
```

`data/providers/google-vertex/provider.toml`:
```toml
id = "google-vertex"
name = "Google Vertex AI"
kind = "cloud_hosted"
api_surfaces = ["text", "streaming", "embeddings", "batch", "count_tokens", "prompt_caching"]

[urls]
docs = "https://docs.cloud.google.com/vertex-ai"
console = "https://console.cloud.google.com"

[[auth]]
id = "adc"
type = "adc"
transport = "header"
header = "Authorization: Bearer"
env = ["GOOGLE_APPLICATION_CREDENTIALS"]
getting_credentials = "gcloud auth application-default login; classic endpoints reject API keys (express mode adds API-key auth for some endpoints)."
docs = "https://ai.google.dev/gemini-api/docs/migrate-to-cloud"

[[endpoints]]
id = "generate-content"
base_url = "https://{region}-aiplatform.googleapis.com"
path = "/v1/projects/{project}/locations/{region}/publishers/google/models/{model}:generateContent"
protocol = "google-generate-content"
```

`data/providers/google-vertex/offerings/gemini-2-5-pro.toml`:
```toml
model = "google/gemini-2-5-pro"
wire_id = "gemini-2.5-pro"
endpoint = "generate-content"
status = "ga"
status_date = ""

[reasoning]
style = "budget"
mandatory = true
default = "on"
returns = "thought_parts"
must_round_trip = "thought_signature"

[reasoning.budget]
param = "generationConfig.thinkingConfig.thinkingBudget"
min = 128
max = 32_768
zero_means_off = false
special_values = { "-1" = "dynamic" }

[reasoning.source]
url = "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thinking"
verified = "2026-08-18"
```

- [ ] **Step 1: Write the files**
- [ ] **Step 2: Verify** — `pnpm validate`. Expected: `OK: 16 models, 6 providers, 20 offerings`.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Seed google-gemini and google-vertex surfaces"`

---

### Task 14: seed — zai, zai-coding-plan, minimax

**Files:**
- Create: `data/providers/zai/provider.toml`, `data/providers/zai/offerings/{glm-4-6,glm-5-3}.toml`, `data/providers/zai-coding-plan/provider.toml`, `data/providers/zai-coding-plan/offerings/{glm-4-6-coding,glm-5-3-coding}.toml`, `data/providers/minimax/provider.toml`, `data/providers/minimax/offerings/{minimax-m2-5,minimax-m3}.toml`

`data/providers/zai/provider.toml`:
```toml
id = "zai"
name = "Z.ai"
kind = "first_party"
api_surfaces = ["text", "streaming"]

[urls]
docs = "https://docs.z.ai/guides/llm/glm-5.3"
console = "https://z.ai/manage-apikey/apikey-list"
pricing = "https://docs.z.ai/guides/develop/http/introduction"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["ZAI_API_KEY"]
getting_credentials = "z.ai console → API Keys. Key format id.secret; JWT HS256 derivation also supported."
docs = "https://docs.z.ai/guides/develop/http/introduction"

[[endpoints]]
id = "chat-completions"
base_url = "https://api.z.ai"
path = "/api/paas/v4/chat/completions"
protocol = "openai-chat"

[[quirks]]
text = "clear_thinking: false preserves reasoning_content across turns (Preserved Thinking); disabled by default on this endpoint."
docs = "https://docs.z.ai/guides/capabilities/thinking-mode"
```

`data/providers/zai/offerings/glm-4-6.toml`:
```toml
model = "zai/glm-4-6"
wire_id = "glm-4.6"
endpoint = "chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "toggle"
mandatory = false
default = "on"
returns = "reasoning_content"
must_round_trip = "reasoning_content"
notes = "Hybrid thinking on by default."

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.source]
url = "https://docs.z.ai/guides/llm/glm-4.6"
verified = "2026-08-18"
```

`data/providers/zai/offerings/glm-5-3.toml`:
```toml
model = "zai/glm-5-3"
wire_id = "glm-5.3"
endpoint = "chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "always_on"
mandatory = true
default = "on"
notes = "Forced thinking: thinking.type enabled and disabled both return 400."
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.source]
url = "https://docs.z.ai/guides/llm/glm-5.3"
verified = "2026-08-18"
```

`data/providers/zai-coding-plan/provider.toml`:
```toml
id = "zai-coding-plan"
name = "Z.ai GLM Coding Plan"
kind = "subscription"
api_surfaces = ["text", "streaming"]

[urls]
docs = "https://docs.z.ai/devpack/overview"
console = "https://z.ai/subscribe"

[plan]
price_usd = 18.0
period = "monthly"
quota = "Lite ~2000 credits/5h, 10000/week; Pro ~12000/5h; Max ~28000/5h"
notes = "Credits-based since 2026-07-30. Includes GLM-5.3, GLM-5-Turbo, GLM-4.7; GLM-5.2/5.1 auto-route to GLM-5.3."
docs = "https://docs.z.ai/devpack/overview"

[[auth]]
id = "plan-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["ZAI_CODING_PLAN_API_KEY"]
key_prefix = ""
getting_credentials = "Subscribe at z.ai/subscribe; plan keys are distinct from normal API keys and only work on coding-plan endpoints."
docs = "https://docs.z.ai/devpack/quick-start"

[[endpoints]]
id = "coding-chat-completions"
base_url = "https://api.z.ai"
path = "/api/coding/paas/v4/chat/completions"
protocol = "openai-chat"

[[endpoints]]
id = "coding-anthropic"
base_url = "https://api.z.ai"
path = "/api/anthropic"
protocol = "anthropic-messages"

[[endpoints]]
id = "coding-responses"
base_url = "https://api.z.ai"
path = "/api/v1"
protocol = "openai-responses"

[[quirks]]
text = "Preserved Thinking is enabled by default on coding-plan endpoints (opposite of the standard API). For Claude Code: ANTHROPIC_BASE_URL=https://api.z.ai/api/anthropic, ANTHROPIC_AUTH_TOKEN=<plan key>."
docs = "https://docs.z.ai/devpack/quick-start"
```

`data/providers/zai-coding-plan/offerings/glm-4-6-coding.toml`:
```toml
model = "zai/glm-4-6"
wire_id = "glm-4.6"
endpoint = "coding-chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "toggle"
mandatory = false
default = "on"
returns = "reasoning_content"
must_round_trip = "reasoning_content"
notes = "Preserved Thinking on by default on this endpoint."

[reasoning.toggle]
param = "thinking.type"
on = "enabled"
off = "disabled"

[reasoning.source]
url = "https://docs.z.ai/guides/capabilities/thinking-mode"
verified = "2026-08-18"
```

`data/providers/zai-coding-plan/offerings/glm-5-3-coding.toml`:
```toml
model = "zai/glm-5-3"
wire_id = "glm-5.3"
endpoint = "coding-chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "always_on"
mandatory = true
default = "on"
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.source]
url = "https://docs.z.ai/devpack/overview"
verified = "2026-08-18"
```

`data/providers/minimax/provider.toml`:
```toml
id = "minimax"
name = "MiniMax"
kind = "first_party"
api_surfaces = ["text", "streaming"]

[urls]
docs = "https://platform.minimax.io/docs/api-reference/api-overview"
console = "https://platform.minimax.io"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["MINIMAX_API_KEY"]
getting_credentials = "platform.minimax.io → API Keys. Subscription Keys are a separate credential type issued under Billing → Token Plan."
docs = "https://platform.minimax.io/docs/api-reference/api-overview"

[[endpoints]]
id = "chat-completions"
base_url = "https://api.minimax.io"
path = "/v1/chat/completions"
protocol = "openai-chat"

[[endpoints]]
id = "anthropic"
base_url = "https://api.minimax.io"
path = "/anthropic"
protocol = "anthropic-messages"

[[quirks]]
text = "reasoning_split: true splits thinking into message.reasoning_content; without it thinking arrives inline as <think>...</think> inside content. China base: api.minimaxi.com."
docs = "https://platform.minimax.io/docs/api-reference/text-chat-openai"
```

`data/providers/minimax/offerings/minimax-m2-5.toml`:
```toml
model = "minimax/minimax-m2-5"
wire_id = "MiniMax-M2.5"
endpoint = "chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "always_on"
mandatory = true
default = "on"
notes = "thinking: {type: \"disabled\"} has no effect on M2.x — thinking cannot be turned off."
returns = "reasoning_content"
must_round_trip = "reasoning_content"

[reasoning.source]
url = "https://platform.minimaxi.com/docs/api-reference/text-chat-openai"
verified = "2026-08-18"
```

`data/providers/minimax/offerings/minimax-m3.toml`:
```toml
model = "minimax/minimax-m3"
wire_id = "MiniMax-M3"
endpoint = "chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "toggle"
mandatory = false
default = "adaptive"
returns = "reasoning_content"
must_round_trip = "reasoning_content"
notes = "thinking.type is adaptive|disabled (no 'enabled'); adaptive lets the model decide."

[reasoning.toggle]
param = "thinking.type"
on = "adaptive"
off = "disabled"

[reasoning.source]
url = "https://platform.minimaxi.com/docs/api-reference/text-chat-openai"
verified = "2026-08-18"
```

Note: `default = "adaptive"` is valid per the base enum (`on|off|adaptive`).

- [ ] **Step 1: Write the files**
- [ ] **Step 2: Verify** — `pnpm validate`. Expected: `OK: 16 models, 9 providers, 26 offerings`.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Seed zai, zai-coding-plan, minimax surfaces"`

---

### Task 15: seed — openrouter

**Files:**
- Create: `data/providers/openrouter/provider.toml`, `data/providers/openrouter/offerings/{claude-sonnet-4-6,gpt-5-6,gemini-2-5-pro}.toml`

`data/providers/openrouter/provider.toml`:
```toml
id = "openrouter"
name = "OpenRouter"
kind = "aggregator"
api_surfaces = ["text", "streaming"]

[urls]
docs = "https://openrouter.ai/docs/api-reference/overview"
console = "https://openrouter.ai/credits"
pricing = "https://openrouter.ai/models"

[[auth]]
id = "api-key"
type = "api_key"
transport = "header"
header = "Authorization: Bearer"
env = ["OPENROUTER_API_KEY"]
getting_credentials = "openrouter.ai → Keys. Prepaid credits (5.5% purchase fee); optional HTTP-Referer and X-Title attribution headers."
docs = "https://openrouter.ai/docs/api-reference/overview"

[[endpoints]]
id = "chat-completions"
base_url = "https://openrouter.ai"
path = "/api/v1/chat/completions"
protocol = "openai-chat"

[[quirks]]
text = "Unified reasoning object: {effort | max_tokens, exclude, enabled}. Effort converts to a token budget where needed (Anthropic clamped min 1024 / max 128000). reasoning.exclude strips reasoning from responses. Routing: provider.order/allow_fallbacks/sort/require_parameters/max_price; :nitro and :floor model suffixes."
docs = "https://openrouter.ai/docs/use-cases/reasoning-tokens"
```

`data/providers/openrouter/offerings/claude-sonnet-4-6.toml`:
```toml
model = "anthropic/claude-sonnet-4-6"
wire_id = "anthropic/claude-sonnet-4.6"
endpoint = "chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = false
default = "on"
returns = "reasoning_content"
must_round_trip = "reasoning_content"
notes = "Effort or reasoning.max_tokens (budget, clamped 1024-128000); request max_tokens must exceed the reasoning budget. thinking.display defaults summarized."

[reasoning.effort]
param = "reasoning.effort"
values = ["none", "minimal", "low", "medium", "high", "xhigh", "max"]
default = "high"

[reasoning.budget]
param = "reasoning.max_tokens"
min = 1024
max = 128_000
zero_means_off = false

[reasoning.source]
url = "https://openrouter.ai/docs/use-cases/reasoning-tokens"
verified = "2026-08-18"
```

`data/providers/openrouter/offerings/gpt-5-6.toml`:
```toml
model = "openai/gpt-5-6"
wire_id = "openai/gpt-5.6"
endpoint = "chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = false
default = "on"
returns = "reasoning_content"
must_round_trip = "reasoning_content"
notes = "reasoning.context/mode supported for GPT-5.6+; Bedrock silently ignores mode."

[reasoning.effort]
param = "reasoning.effort"
values = ["none", "low", "medium", "high", "xhigh", "max"]
default = "medium"

[reasoning.source]
url = "https://openrouter.ai/docs/use-cases/reasoning-tokens"
verified = "2026-08-18"
```

`data/providers/openrouter/offerings/gemini-2-5-pro.toml`:
```toml
model = "google/gemini-2-5-pro"
wire_id = "google/gemini-2.5-pro"
endpoint = "chat-completions"
status = "ga"
status_date = ""

[reasoning]
style = "effort"
mandatory = true
default = "on"
returns = "reasoning_content"
must_round_trip = "reasoning_content"
notes = "Effort maps to thinkingBudget (Gemini internally converts budgets to levels); xhigh maps down to high on Gemini 3. Cannot disable."

[reasoning.effort]
param = "reasoning.effort"
values = ["minimal", "low", "medium", "high", "xhigh", "max"]
default = "high"

[reasoning.budget]
param = "reasoning.max_tokens"
zero_means_off = false

[reasoning.source]
url = "https://openrouter.ai/docs/use-cases/reasoning-tokens"
verified = "2026-08-18"
```

- [ ] **Step 1: Write the files**
- [ ] **Step 2: Verify** — `pnpm validate`. Expected: `OK: 16 models, 10 providers, 29 offerings`.
- [ ] **Step 3: Emit artifacts** — `pnpm emit`. Expected: `dist/` contains catalog.json, providers.json, models.json, 10 provider files, 16 model files.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "Seed openrouter and emit first full artifact set"`

---

### Task 16: CI + CONTRIBUTING

**Files:**
- Create: `.github/workflows/ci.yml`, `CONTRIBUTING.md`

`​.github/workflows/ci.yml`:
```yaml
name: ci
on:
  push: { branches: ["**"] }
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm validate
      - run: pnpm emit
      - run: git diff --exit-code dist/ || (echo "dist/ is generated, do not commit; CI regenerates it" && exit 1)
```

(The last step asserts dist/ is not committed: since dist/ is gitignored, `git diff` passes trivially — keep it as a guard that emit succeeds.)

`CONTRIBUTING.md`:
```markdown
# Contributing to ai-providers

Data lives in `data/` as TOML. Three layers:

- `data/models/<lab>/<model>.toml` — canonical model facts (lab-owned)
- `data/providers/<id>/provider.toml` — auth, endpoints, API surfaces
- `data/providers/<id>/offerings/<name>.toml` — a model served on that provider

## Rules

1. **Every mutable fact needs provenance.** `cost`, `limits`, and `reasoning`
   sections each carry `[*.source] url/verified`. CI rejects facts older than
   180 days and warns after 90.
2. **Unknown ≠ free.** Omit a price you cannot verify; never write 0 unless
   `free = true` with a source. Omitted dates are `""`.
3. **Reasoning is structured, not a boolean.** Declare `style` and the exact
   wire parameter for that surface. Effort values come from the controlled
   vocabulary: none, minimal, low, medium, high, xhigh, max.
4. **File naming is validated**: model file name = model id segment; offerings
   live under `providers/<id>/offerings/`.
5. Run `pnpm validate` before committing. Run `pnpm emit` to regenerate
   artifacts (never edit `dist/`).

See `docs/superpowers/specs/2026-08-18-ai-providers-registry-design.md` for
the design rationale.
```

- [ ] **Step 1: Write both files**
- [ ] **Step 2: Verify locally** — `pnpm typecheck && pnpm test && pnpm validate && pnpm emit`
Expected: all green, `OK: 16 models, 10 providers, 29 offerings`.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Add CI workflow and contribution guide"`

---

## Completion criteria

- `pnpm validate` passes with 16 models, 10 providers, 29 offerings, zero errors.
- `pnpm test` green across schema and build packages.
- `pnpm emit` produces `dist/` artifacts with `generated_at` + `source_commit`.
- Every seeded reasoning fact carries a source URL verified 2026-08-18.

## Follow-up plans (not this plan)

- Content completion: xai, mistral, deepseek, opencode-zen, opencode-go, alibaba-dashscope, qwen-coding-plan, minimax-token-plan.
- Phase 2: `packages/sync` drift detection + `@ai-providers/sdk` with `buildReasoningParam`.
- Phase 3: Astro site.
