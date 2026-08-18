# ai-providers Phase 2 — Sync + SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@ai-providers/sdk` (typed catalog access, auth header builder, and the data-driven `buildReasoningParam` request-shaping helper) and `packages/sync` (live model-list drift detection with a daily GitHub Action), plus a small schema fix for nullable `open_weights`.

**Architecture:** The SDK is pure data-driven logic over `dist/catalog.json` — param paths stored in offering data (e.g. `reasoning.effort`, `generationConfig.thinkingConfig.thinkingBudget`, `thinking.type`) are turned into wire fragments by a generic dot-path setter with value coercion; no per-provider code. Sync fetches provider model-list endpoints, maps them to wire ids via per-provider adapters, diffs against the catalog, and writes a report; it never writes capability facts. The GitHub Action is included but inert until the repo is pushed with secrets.

**Tech Stack:** TypeScript ESM strict, zod (catalog revalidation), vitest, tsx CLI, undici-less plain `fetch` (Node 22 global).

## Global Constraints

- English only; plain commit messages, NO AI attribution trailers; branch `feat/phase2-sync-sdk` (never commit to main).
- No live API keys in unit tests — sync fetchers are tested against fixture JSON; live runs happen only in CI with secrets.
- Unknown ≠ false: `open_weights`/`hf_repo` become optional (omitted = unknown); existing data updated accordingly.
- SDK must never invent values: out-of-vocabulary efforts, sub-minimum budgets, and disabling `mandatory` reasoning are typed errors, not clamps.
- Every exported SDK/sync function is TDD'd; use real seeded shapes in tests (grok xhigh-on-4.5 error, anthropic min-1024, qwen boolean toggle, gemini dotted path, openrouter nested effort).

## File Structure

```
packages/sdk/
  package.json tsconfig.json
  src/catalog.ts        # loadCatalog, resolveModel
  src/auth.ts           # authHeaders
  src/reasoning.ts      # buildReasoningParam + ReasoningParamError
  src/index.ts
  test/*.test.ts        # fixtures from dist/catalog.json are NOT used — inline minimal catalog fixtures
packages/sync/
  package.json tsconfig.json
  src/adapters.ts       # per-provider model-list URL + response → wire-id list mappers
  src/diff.ts           # catalog vs live diff (added/removed)
  src/run.ts            # orchestrates fetch → map → diff → report JSON + markdown
  src/cli.ts            # pnpm sync:report (local dry-run against a --live flag)
  test/adapters.test.ts diff.test.ts run.test.ts   # fixture-based, no network
.github/workflows/sync.yml
```

---

### Task 0: schema — nullable open_weights / hf_repo

**Files:**
- Modify: `packages/schema/src/model.ts`
- Test: `packages/schema/test/model.test.ts`
- Modify data: `data/models/mistral/mistral-small-latest.toml`, `data/models/mistral/mistral-medium-3-5.toml` (remove the now-unknown `open_weights`/`hf_repo` values — omit both keys)

**Interfaces:**
- Produces: `open_weights?: boolean` and `hf_repo?: string` (omitted = unknown) in ModelSchema; downstream emit just omits absent keys.

- [ ] **Step 1: Failing tests** — extend model.test.ts:

```ts
it("allows omitted open_weights and hf_repo (unknown)", () => {
  const r = ModelSchema.safeParse({ ...valid, open_weights: undefined })
  expect(r.success).toBe(true)
})
```
and change the existing valid fixture usage — simplest: add `open_weights: z.optional(...)` handling by parsing a copy WITHOUT the keys. Also assert `ModelSchema.parse({ ...valid }).open_weights` is `false` (present) while `ModelSchema.parse({ ...valid, open_weights: undefined }).open_weights` is `undefined`.

- [ ] **Step 2: Verify fail** — `cd packages/schema && pnpm vitest run test/model.test.ts`
- [ ] **Step 3: Implement** — in model.ts change:
```ts
  open_weights: z.boolean().optional(),
  hf_repo: z.string().optional(),
```
- [ ] **Step 4: Update data** — in both mistral model TOMLs delete the `open_weights` and `hf_repo` lines entirely (weights status unknown). Every OTHER model keeps its current values (they were research-verified true/false).
- [ ] **Step 5: Full suite + rebuild + validate** — `cd packages/schema && pnpm vitest run && pnpm build` then repo root `pnpm validate` (expect `OK: 24 models, 18 providers, 44 offerings`).
- [ ] **Step 6: Commit** — `git add -A && git commit -m "Make open_weights and hf_repo optional; unknown is omitted"`

---

### Task 1: sdk — catalog loading and model resolution

**Files:**
- Create: `packages/sdk/package.json`, `packages/sdk/tsconfig.json`, `packages/sdk/src/catalog.ts`, `packages/sdk/src/index.ts`
- Test: `packages/sdk/test/catalog.test.ts`

**Interfaces:**
- Produces:
  - `type SdkCatalog = { providers: (Provider & { offerings: Offering[] })[]; models: (Model & { offered_via: { provider: string; wire_id: string; endpoint: string }[] })[] }`
  - `loadCatalog(path?: string): SdkCatalog` — default path `<repo>/dist/catalog.json` resolved from the SDK package; throws `Error("catalog not found — run pnpm emit")` when missing.
  - `resolveModel(c: SdkCatalog, providerId: string, wireId: string): { model: SdkCatalog["models"][number]; offering: Offering; provider: Provider }` — throws `ModelNotFoundError` (exported class, `.providerId`, `.wireId`) when absent.

`packages/sdk/package.json`:
```json
{
  "name": "@ai-providers/sdk",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "test": "vitest run", "typecheck": "tsc --noEmit", "build": "tsc -p tsconfig.json" },
  "dependencies": { "@ai-providers/schema": "workspace:*" },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^3.0.0" }
}
```
tsconfig mirrors packages/build's (extends root base, outDir dist, rootDir src, include src).

- [ ] **Step 1: Failing test** — `packages/sdk/test/catalog.test.ts` with an inline minimal catalog fixture (one provider, one offering, one model) asserting `resolveModel` returns the triple and throws `ModelNotFoundError` for a bad wire id, and `loadCatalog` throws the not-found error for a bogus path.
- [ ] **Step 2: Verify fail** → **Step 3: Implement** → **Step 4: Verify pass** (suite from packages/sdk)
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add SDK catalog loading and model resolution"`

---

### Task 2: sdk — authHeaders

**Files:**
- Create: `packages/sdk/src/auth.ts`
- Test: `packages/sdk/test/auth.test.ts`

**Interfaces:**
- Produces: `authHeaders(provider: Provider, opts: { credential: string; authId?: string }): Record<string, string>`
  - Picks `provider.auth[0]` or the entry with matching `id`; throws `Error("auth method ... not found")` otherwise.
  - Bearer-style (`header = "Authorization: Bearer"`) → `{ Authorization: "Bearer <credential>" }`; custom header (`x-api-key`) → `{ "x-api-key": credential }`; `api-key` Azure header similarly.
  - Merges `extra_headers` (e.g. anthropic-version) — credential headers win on collision.
  - sigv4 → throws `Error("sigv4 requires request signing — not a header scheme")`.

- [ ] **Step 1: Failing test** — anthropic fixture (x-api-key + anthropic-version extra header), openai fixture (Bearer), azure fixture (api-key header), bedrock fixture (sigv4 throws), unknown authId throws.
- [ ] **Step 2..4: TDD cycle**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add SDK auth header builder"`

---

### Task 3: sdk — buildReasoningParam (the centerpiece)

**Files:**
- Create: `packages/sdk/src/reasoning.ts`
- Test: `packages/sdk/test/reasoning.test.ts`

**Interfaces:**
- Produces:
```ts
export type ReasoningRequest =
  | { kind: "effort"; effort: EffortValue }
  | { kind: "budget"; budget: number }
  | { kind: "enabled"; enabled: boolean }
export class ReasoningParamError extends Error {
  constructor(public code: "unsupported" | "invalid_value" | "out_of_range" | "mandatory", message: string) {}
}
export function buildReasoningParam(offering: Offering, req: ReasoningRequest): Record<string, unknown>
```
Rules (table-driven, all data from `offering.reasoning`):
- `setPath(obj, "thinking.budget_tokens", v)` — generic dotted-path setter for ALL params; that is the ONLY wire-shaping mechanism.
- Value coercion: toggle `on`/`off` exactly `"true"`/`"false"` → booleans (Qwen `enable_thinking`); everything else passes through as given.
- `{ kind: "effort", effort }`: style must be `effort` or `adaptive` (adaptive = soft steering; if no effort block → error `unsupported`); effort must be in `values` → else `invalid_value`. Fragment = effort at `effort.param`.
- `{ kind: "budget", budget }`: style must be `budget` (or `effort` when `reasoning.budget` exists — OpenRouter); if `budget.min` and budget < min → `out_of_range`; same for max. Fragment = budget at `budget.param`. Special values (e.g. `-1`) are allowed when listed in `budget.special_values` — callers pass them as numbers; validate membership.
- `{ kind: "enabled", enabled: false }`: if `mandatory` → error `mandatory` ("reasoning cannot be disabled on this surface"); else style must have a toggle (or budget with `zero_means_off` → emit `0` at `budget.param`); fragment = off value at `toggle.param`.
- `{ kind: "enabled", enabled: true }`: fragment = on value at `toggle.param` (or nothing when style is `adaptive`/`always_on` with no toggle → return `{}`).
- `style: "none"` → any request errors `unsupported`.
- Returned fragment is ONLY the reasoning parameter tree — callers merge it into their request body.

- [ ] **Step 1: Failing tests** — one per rule using REAL seeded shapes:
```ts
// effort, chat protocol, top-level param
buildReasoningParam(openaiGpt5ChatOffering, { kind: "effort", effort: "high" }) // => { reasoning_effort: "high" }
// effort, responses protocol, nested param
buildReasoningParam(openaiGpt5ResponsesOffering, { kind: "effort", effort: "high" }) // => { reasoning: { effort: "high" } }
// xhigh on grok-4-5 (not in values)
expect(() => buildReasoningParam(grok45ChatOffering, { kind: "effort", effort: "xhigh" })).toThrow(ReasoningParamError)
// budget below min
expect(() => buildReasoningParam(claudeSonnetOffering, { kind: "budget", budget: 512 })).toThrow(/1024/)
// budget on anthropic
buildReasoningParam(claudeSonnetOffering, { kind: "budget", budget: 4096 }) // => { thinking: { budget_tokens: 4096 } }
// budget on gemini dotted path
buildReasoningParam(gemini25ProOffering, { kind: "budget", budget: 8192 }) // => { generationConfig: { thinkingConfig: { thinkingBudget: 8192 } } }
// qwen boolean toggle
buildReasoningParam(qwen3MaxOffering, { kind: "enabled", enabled: true }) // => { enable_thinking: true }
// disable mandatory
expect(() => buildReasoningParam(grok46ChatOffering, { kind: "enabled", enabled: false })).toThrow(ReasoningParamError)
// minimax adaptive toggle
buildReasoningParam(minimaxM3Offering, { kind: "enabled", enabled: true }) // => { thinking: { type: "adaptive" } }
// openrouter effort with optional budget
buildReasoningParam(orClaudeOffering, { kind: "budget", budget: 2048 }) // => { reasoning: { max_tokens: 2048 } }
// gemini flash zero-off
buildReasoningParam(gemini25FlashOffering, { kind: "enabled", enabled: false }) // => { generationConfig: { thinkingConfig: { thinkingBudget: 0 } } }
// deepseek effort+toggle combo offering, disable via toggle
buildReasoningParam(dsV4ChatOffering, { kind: "enabled", enabled: false }) // => { thinking: { type: "disabled" } }
```
Fixtures: inline minimal Offering objects copied from the seed data (not loaded from dist).
- [ ] **Step 2..4: TDD cycle**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add data-driven buildReasoningParam with typed errors"`

---

### Task 4: sync — adapters and diff

**Files:**
- Create: `packages/sync/package.json`, `packages/sync/tsconfig.json`, `packages/sync/src/adapters.ts`, `packages/sync/src/diff.ts`
- Test: `packages/sync/test/adapters.test.ts`, `packages/sync/test/diff.test.ts`

**Interfaces:**
- Produces:
```ts
export type SyncTarget = { providerId: string; url: string; map: (body: unknown) => string[] }
export const TARGETS: SyncTarget[]   // per-provider entries below
export type DriftReport = { providerId: string; added: string[]; removed: string[] }
export function diffWireIds(catalogWireIds: string[], liveWireIds: string[]): { added: string[]; removed: string[] }
```
`packages/sync/package.json`:
```json
{
  "name": "@ai-providers/sync",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.json",
    "report": "tsx src/cli.ts"
  },
  "dependencies": { "@ai-providers/sdk": "workspace:*", "@ai-providers/schema": "workspace:*" },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^3.0.0", "tsx": "^4.19.0" }
}
```
(tsconfig mirrors the sdk's.)

TARGETS (URLs verified in research):
- openai `https://api.openai.com/v1/models` → `body.data[].id`
- anthropic `https://api.anthropic.com/v1/models` → `body.data[].id`
- xai `https://api.x.ai/v1/models` → `body.data[].id`
- mistral `https://api.mistral.ai/v1/models` → `body.data[].id`
- deepseek `https://api.deepseek.com/models` → `body.data[].id` (root path per quirk; also `/v1/models` works — use `/models`)
- openrouter `https://openrouter.ai/api/v1/models` → `body.data[].id` (already `vendor/model` shaped)
- opencode-zen `https://opencode.ai/zen/v1/models` and opencode-go `https://opencode.ai/zen/go/v1/models` → `body.data[].id`
- minimax `https://api.minimax.io/v1/models` → `body.models[].name ?? .id`
- alibaba-dashscope compatible-mode `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models` → `body.data[].id`
All mapped to plain wire-id string lists; `diffWireIds` is sorted set arithmetic.

- [ ] **Step 1: Failing tests** — adapters: each mapper against a small inline sample response body; diff: added/removed/both-empty/renamed-as-add+remove.
- [ ] **Step 2..4: TDD cycle**
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add sync adapters and wire-id diff"`

---

### Task 5: sync — run orchestration + CLI + workflow

**Files:**
- Create: `packages/sync/src/run.ts`, `packages/sync/src/cli.ts`, `.github/workflows/sync.yml`
- Test: `packages/sync/test/run.test.ts`

**Interfaces:**
- Produces:
```ts
export async function runSync(opts: {
  catalog: SdkCatalog
  fetchImpl?: typeof fetch          // injectable; tests pass fixture fetcher
  env?: Record<string, string | undefined>  // provider API keys
}): Promise<{ reports: DriftReport[]; missingTargets: string[] }>
```
- For each TARGET with a non-empty env key (map providerId → env var: OPENAI_API_KEY, ANTHROPIC_API_KEY, XAI_API_KEY, MISTRAL_API_KEY, DEEPSEEK_API_KEY, OPENROUTER_API_KEY, OPENCODE_API_KEY, MINIMAX_API_KEY, DASHSCOPE_API_KEY), fetch with Bearer auth, map, diff against the catalog's wire ids for that provider (dedupe across endpoints), collect DriftReport (only when non-empty). Providers whose env key is absent go to `missingTargets` (not an error — local dry-runs and first CI runs have no secrets).
- CLI (`pnpm --filter @ai-providers/sync run report`): loads dist/catalog.json, runs runSync with real fetch + process.env, prints a markdown summary (`## provider` + added/removed bullet lists) and writes `.superpowers/sync-report.json` (gitignored scratch); exit 0 always unless fetch throws.
- `.github/workflows/sync.yml`: daily `schedule: cron: "0 6 * * *"`, checkout, pnpm install, emit, run report with secrets mapped to the env names above, and `uses: actions/upload-artifact@v4` with the report. Inert until the repo is pushed and secrets exist.

- [ ] **Step 1: Failing test** — runSync with injected fetchImpl returning fixture bodies for two providers + env for one only: asserts one DriftReport and the other in missingTargets; diff numbers correct.
- [ ] **Step 2..4: TDD cycle** (no network in tests)
- [ ] **Step 5: Manual smoke** — `pnpm --filter @ai-providers/sync run report` with no env keys → prints "no targets with credentials", exit 0.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "Add sync orchestration, CLI, and daily workflow"`

---

### Task 6: docs — README + CONTRIBUTING updates

**Files:**
- Modify: `README.md`, `CONTRIBUTING.md`

- [ ] **Step 1: README** — replace the "Status: design phase" paragraph with: project summary (two-layer registry, provenance-gated), current counts (24 models / 18 providers / 44 offerings), usage snippets:
```bash
pnpm validate   # validate data + provenance gates
pnpm emit       # regenerate dist/ artifacts
pnpm --filter @ai-providers/sync run report   # drift check (needs provider env keys)
```
plus a short SDK example:
```ts
import { loadCatalog, resolveModel, authHeaders, buildReasoningParam } from "@ai-providers/sdk"
const c = loadCatalog()
const { offering, provider } = resolveModel(c, "anthropic", "claude-sonnet-4-6")
const headers = authHeaders(provider, { credential: process.env.ANTHROPIC_API_KEY! })
const reasoning = buildReasoningParam(offering, { kind: "budget", budget: 4096 })
```
- [ ] **Step 2: CONTRIBUTING** — add a "Sync drift detection" section: what runSync does, that it never writes capability facts, that new wire ids land as offerings only after human verification with sources.
- [ ] **Step 3: Verify** — `pnpm typecheck && pnpm test && pnpm validate && pnpm emit` all green.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "Document SDK usage and sync workflow"`

---

## Completion criteria

- Full pipeline green: typecheck, 31+10+SDK+sync tests, `pnpm validate` OK (24/18/44), emit.
- SDK exports loadCatalog/resolveModel/authHeaders/buildReasoningParam with typed errors, tested against real seeded shapes.
- Sync diff engine + adapters tested fixture-only; CLI dry-run works without credentials; sync.yml present.
- All commits plain, no attribution.

## Follow-up (Phase 3)

- Astro docs site rendering dist/catalog.json; generated request examples using buildReasoningParam; zen/go offering population from first live sync run.
