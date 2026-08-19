# ai-providers Site Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the four deferred site follow-ups: round-trip/incompatibility warnings on model pages, Python + TypeScript request examples beside curl, Pagefind search, and raw JSON artifacts served from the site with real download links.

**Architecture:** All four extend the existing site/ package without workflow changes — everything (artifact copy, pagefind indexing) is folded into the site `build` script so `pages.yml` and `ci.yml` need at most a site-build step. Request computation is extracted from CurlExample into a shared `site/src/lib/example.ts` so the three language renderers share one source of truth. Not in scope (need inputs/events): custom domain (awaiting a domain from Greg), Zen/Go offering pages (awaiting publish + first live sync).

**Tech Stack:** Astro (existing), pagefind ^1 (new site devDep), plain Node scripts.

## Global Constraints

- English only; plain commit messages, NO AI attribution trailers; branch `feat/site-followups` (never commit to main).
- Entity content stays 100% catalog-driven; examples derive from SDK functions only.
- Zero hand-written JS: Python/TS examples render in native `<details>` (no JS); Pagefind is the one sanctioned exception (its own bundled JS under /pagefind/).
- Existing verification greps from Phase 3 must stay green (no regressions to curl output).
- Build order invariant: schema build → sdk build → `pnpm emit` → site build.

## File Structure (deltas)

```
site/src/lib/example.ts             # NEW: computeExample(provider, offering, endpoint) → {url, headers, body, notes}
site/src/components/CurlExample.astro   # MODIFY: use lib; render curl + <details> Python/TS + notes block
site/src/components/ReasoningBadge.astro # MODIFY: append "· round-trips X" when must_round_trip set
site/scripts/copy-artifacts.mjs     # NEW: copy repo dist/*.json + providers/ + models/ into site/dist/artifacts/
site/src/pages/search.astro         # NEW: Pagefind default UI
site/src/layouts/Base.astro         # MODIFY: data-pagefind-body on <main>; Search nav link
site/src/pages/download.astro       # MODIFY: real artifact links (/artifacts/...)
site/package.json                   # MODIFY: pagefind devDep; build = astro build && copy-artifacts && pagefind
.github/workflows/ci.yml            # MODIFY: add site build step (catches site regressions on branches)
```

---

### Task 1: extract example computation + Python/TS renderers

**Files:**
- Create: `site/src/lib/example.ts`
- Modify: `site/src/components/CurlExample.astro`, `site/src/pages/models/[id].astro` (only if props change)

**Interfaces:**
- Produces: `computeExample(provider: Provider, offering: Offering, endpoint: Endpoint): { url: string; headers: Record<string, string>; body: Record<string, unknown>; sigv4Fallback: boolean }` — the exact logic currently inline in CurlExample (URL with {model}→wire_id, sorted authHeaders with `<YOUR_API_KEY>`, Content-Type, per-protocol body, fragment selection + merge, max_tokens guard, sigv4 fallback flag). Move verbatim; CurlExample imports it.
- Renderers in CurlExample, all under the existing label: the current `<pre><code>` curl block unchanged; then `<details><summary>Python (requests)</summary>` rendering:

```python
import requests

resp = requests.post(
    "<url>",
    headers=<headers dict, JSON.stringify with 2-space indent>,
    json=<body, JSON.stringify(indent=2)>,
)
print(resp.json())
```

then `<details><summary>TypeScript (fetch)</summary>`:

```ts
const resp = await fetch("<url>", {
  method: "POST",
  headers: <headers as TS object literal>,
  body: JSON.stringify(<body>),
})
console.log(await resp.json())
```

- JSON embedded in Python/TS blocks reuses the same `& < >`-escaping helper as curl. Header dicts: Python `{"x-api-key": "<YOUR_API_KEY>", ...}` — render from the same sorted headers map via JSON.stringify (valid in both languages).

- [ ] **Step 1: Write lib + refactored component; rebuild**
- [ ] **Step 2: Verify no regression** — all Phase 3 curl greps still pass on sonnet-4-6 (`curl 'https://api.anthropic.com/v1/messages'`, `"budget_tokens": 2048`, `"max_tokens": 3072`), gemini-2-5-flash (`"thinkingBudget": 2048`), gpt-5-1 (`"reasoning_effort": "none"`, `"effort": "none"`), grok-4-5 (`"reasoning_effort": "high"`, no xhigh in examples)
- [ ] **Step 3: Verify new renderers** — `grep -c "requests.post" site/dist/models/anthropic-claude-sonnet-4-6/index.html` ≥ 1; `grep -c "await fetch" …` ≥ 1; `<details>` count ≥ 2 per multi-example page; Python block contains `"budget_tokens": 2048` too
- [ ] **Step 4: Commit** — `git add -A && git commit -m "Share example computation and add Python and TypeScript renderers"`

---

### Task 2: round-trip + incompatibility warnings

**Files:**
- Modify: `site/src/components/CurlExample.astro` (notes block under each example), `site/src/components/ReasoningBadge.astro`

**Interfaces:**
- Notes block (only when data present), styled as a muted warning list under the example renderers:
  - `must_round_trip` non-empty → "⚠ Responses include **{value}** artifacts — pass them back unmodified on subsequent turns (dropping them triggers 400s or quality loss)."
  - `incompatible_with` non-empty → "Reported incompatible with thinking controls: {list}."
- ReasoningBadge: append `· round-trips {value}` chip text when `must_round_trip` is non-empty (affects provider pages too — consistent).

- [ ] **Step 1: Implement; rebuild**
- [ ] **Step 2: Verify** — sonnet-4-6 page: `grep -c "signature" …` increases and contains "pass them back unmodified"; gpt-5-1 responses offering page shows `encrypted_content` note; deepseek-v4-flash chat page shows `reasoning_content` note; anthropic page badge shows `round-trips signature`; grok pages show the incompatibility line for `presence_penalty`… (check: grok incompatible_with is empty in data — the penalties note lives in the provider quirk; verify only what the data actually carries: anthropic-family `temperature, top_p, top_k` note on sonnet-4-6 page)
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Surface round-trip artifacts and incompatibilities on model pages"`

---

### Task 3: serve raw artifacts + download links

**Files:**
- Create: `site/scripts/copy-artifacts.mjs`
- Modify: `site/package.json` (build chain), `site/src/pages/download.astro`

**Interfaces:**
- copy-artifacts.mjs: from `import.meta.dirname/../../dist` copy `catalog.json`, `providers.json`, `models.json`, `providers/*.json`, `models/*.json` into `site/dist/artifacts/` preserving structure; throw with a clear message if the source dist is missing. No node_modules deps (node:fs builtins only).
- site build script becomes: `astro build && node scripts/copy-artifacts.mjs && pagefind --site dist` — pagefind added in Task 4; until then: `astro build && node scripts/copy-artifacts.mjs`.
- download.astro: replace the regeneration-only guidance with a links section — `/ai-providers/artifacts/catalog.json` (full join), `providers.json`, `models.json` (normalized), plus a line that per-entity files live under `artifacts/providers/` and `artifacts/models/`; keep the `pnpm emit` provenance explanation and note the copies embed `generated_at`/`source_commit`.

- [ ] **Step 1: Implement; rebuild**
- [ ] **Step 2: Verify** — `ls site/dist/artifacts/catalog.json site/dist/artifacts/providers/anthropic.json site/dist/artifacts/models/openai-gpt-5-6.json` all exist; `grep -o "/ai-providers/artifacts/catalog.json" site/dist/download/index.html | head -1` matches; artifacts/catalog.json parses (`node -e "JSON.parse(require('fs').readFileSync('site/dist/artifacts/catalog.json'))" && echo JSON-OK`)
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Serve catalog artifacts from the site with download links"`

---

### Task 4: Pagefind search + CI site build

**Files:**
- Create: `site/src/pages/search.astro`
- Modify: `site/package.json` (add pagefind devDep ^1; final build script `astro build && node scripts/copy-artifacts.mjs && pagefind --site dist`), `site/src/layouts/Base.astro` (`data-pagefind-body` on `<main>`; Search nav link between Models and Download), `.github/workflows/ci.yml` (after `pnpm emit`: `pnpm --filter site run build`)

**Interfaces:**
- search.astro: h1 "Search"; load Pagefind UI from `${import.meta.env.BASE_URL}pagefind/pagefind.js` as a module script; render `<pagefind-search></pagefind-search>` (their default web component). Page copy: "Index covers provider guides and model pages."
- Base.astro `<main data-pagefind-body>` so nav/footer are excluded from the index; search page itself excluded via `data-pagefind-ignore="all"` on its content wrapper.

- [ ] **Step 1: Implement; full rebuild (final build script with pagefind)**
- [ ] **Step 2: Verify** — `ls site/dist/pagefind/pagefind.js` exists; `grep -c "pagefind" site/dist/search/index.html` ≥ 2; `grep -o 'href="/ai-providers/search/"' site/dist/index.html | head -1` matches; YAML still parses (`npx --yes js-yaml .github/workflows/ci.yml > /dev/null && echo YAML-OK`); whole previous verification set still green
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Add Pagefind search and site build to CI"`

---

## Completion criteria

- `pnpm --filter site run build` runs the full chain (astro → copy-artifacts → pagefind); 47 pages + /artifacts/ + /pagefind/ in site/dist.
- All Phase 3 verification greps still pass; new greps for Python/TS renderers, round-trip notes, artifact links, and search pass.
- ci.yml builds the site on every branch; pages.yml needs no changes (it already runs the site build script).
- All commits plain, no attribution.
