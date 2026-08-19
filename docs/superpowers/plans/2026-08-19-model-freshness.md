# inference-providers — Model Freshness (12-Month Window + Archive)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** The site shows only models released in the last 12 months; older models move to an archive view. Data and JSON artifacts stay complete (archive is a presentation filter, nothing deleted). The cutoff is computed at build time (now − 365 days) so it moves automatically; the daily Pages rebuild keeps the view fresh.

**Archive rule (single source of truth, in site/src/lib/freshness.ts):** `archived = retired_date !== "" || (release_date !== "" && release_date < cutoff)` — cutoff = build date minus 365 days. Unknown (`""`) release dates stay CURRENT (never hide what we cannot date). kimi-k2.5 archives via its retired_date? It has sunset 2026-08-31 (status deprecated on offering, model retired_date "") — leave to the date rule; do not set retired_date until it actually retires.

## Task 1: Backfill confident release dates (data commit — dates only, nothing else)

Set `release_date` (currently "") on these canonical models, using ONLY widely-documented official GA/announcement dates:
- data/models/google/gemini-2-5-pro.toml → "2025-03-31"
- data/models/google/gemini-2-5-flash.toml → "2025-06-17"
- data/models/google/gemini-3-pro.toml → "2025-11-18"
- data/models/openai/o3.toml → "2025-04-16"
- data/models/openai/gpt-oss-120b.toml → "2025-08-05"
- data/models/openai/gpt-oss-20b.toml → "2025-08-05"
- data/models/meta/llama-3-3-70b.toml → "2024-12-06"
- data/models/meta/llama-4-maverick.toml → "2025-04-27"
- data/models/zai/glm-4-6.toml → "2025-09-30"
Leave every other "" date alone. Expected archived set with today's cutoff (2025-08-19): claude-3-7-sonnet (2025-02-19), gpt-5 (2025-08-07), gpt-oss-120b, gpt-oss-20b, gemini-2-5-pro, gemini-2-5-flash, o3, llama-3-3-70b, llama-4-maverick = 9 models archived, 36 current.

## Task 2: Site freshness filter

- NEW `site/src/lib/freshness.ts`: `export function classify(models)  → { current, archived }` implementing the rule above (export `isArchived(model)` too); pure function of build-time date.
- `site/src/pages/models/index.astro`: table shows current only; heading counts; add a link "View archived models (N)" → `${base}models/archive/`.
- NEW `site/src/pages/models/archive.astro`: same table layout for archived models, intro line "Models released more than 12 months ago (or retired). Kept for reference — provider offerings remain in the full artifacts."
- `site/src/pages/index.astro`: stat line counts CURRENT models only (label it: "N current models · M providers · K offerings"; add second muted line "9 archived — view archive"). Homepage provider cards unchanged.
- `site/src/pages/models/[id].astro`: if archived, render a prominent banner at top: "Archived — released more than 12 months ago" (muted chip style).
- `site/src/pages/providers/[id].astro`: in the Models offered table, append an "archived" chip (reuse status chip styling, gray) to the model-name cell when that model is archived — pass the archived set in from the catalog classification.
- Download page: one-line note that site views filter to current models while artifacts contain everything.
- Verification greps after build: models index does NOT contain a row for "Gemini 2.5 Pro" but DOES contain current models; archive page exists and contains "Gemini 2.5 Pro" and "Claude 3.7 Sonnet"; gpt-5-6 model page current (no banner); gpt-5 model page HAS banner; homepage shows "36" current count and archive link; catalog.json still lists all 45 models (grep '"id": "google/gemini-2-5-pro"' site/dist/artifacts/catalog.json).

## Constraints
English only; plain commits ("Backfill release dates for older models", "Filter site to last-12-months models with archive view"), NO trailers; branch `feat/model-freshness`; artifacts/SDK/validator untouched (counts in `pnpm validate` stay 45/30/98); no client-side JS.
