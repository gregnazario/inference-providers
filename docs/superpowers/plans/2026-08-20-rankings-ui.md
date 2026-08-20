# inference-providers — Intelligence Rankings + Model-Page Controls UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** (1) Artificial Analysis Intelligence Index per model with compliant attribution; (2) context/output always visible (fill official gaps); (3) model pages expose full reasoning controls (effort levels, budget ranges, toggles) and speed-variant knobs (fast/turbo/highspeed/luna-class).

**Attribution compliance (AA brand kit):** every score display states **"Intelligence Index v4.1.1"** + access date **2026-08-20** + hyperlink to the specific AA model page; global credit line "Source: Artificial Analysis" adjacent to scores; never imply endorsement. Data: `[ranking]` block on ModelSchema — `aa_index` (number), `aa_variant` (string — the variant/effort the score refers to), `url` (AA model page), `verified` (ISO date).

## Task 1: Schema + scores (data)

**Schema** (`packages/schema/src/model.ts`): add optional `ranking` object: `{ aa_index: z.number(), aa_variant: z.string().min(1), url: z.string().regex(/^https:\/\//), verified: IsoDate }`. Optional — models without it omit. Tests: valid block parses; junk rejected (missing variant, bad url). Note: schema `IsoDate` import exists.

**Scores** (from the 2026-08-20 research table — write EXACTLY these, `aa_variant` from the "Variant" column, url = `https://artificialanalysis.ai` + page path, verified 2026-08-20):
opus-5 63 "Adaptive Reasoning, Max Effort"; sonnet-5 55 "Adaptive Reasoning, Max Effort"; fable-5 62 "Adaptive Reasoning, Max Effort"; haiku-4-5 30 "reasoning" (url /models/claude-4-5-haiku-reasoning); gpt-5-6 61 "Sol variant, max effort" (/models/gpt-5-6-sol); gpt-5-1 37 "high effort"; gpt-5 35 "high effort"; o3 31 "estimated"; gpt-oss-120b 24 "high effort"; gpt-oss-20b 15 "high effort"; gemini-3-pro 41 "Gemini 3 Pro Preview (high)"; gemini-3-7-flash 56 "high effort"; gemini-3-6-flash 52 ""; gemini-3-5-flash-lite 37 ""; gemma-4 30 "Gemma 4 31B reasoning" (/models/gemma-4-31b); grok-4-6 61 "high effort"; grok-4-5 56 "high effort"; muse-spark-1-2 57 "xhigh effort"; muse-glimmer-30b 35 "high"; llama-4-maverick 14 ""; glm-5-3 60 "max effort"; glm-5-2 53 "max"; glm-4-7 34 "Reasoning"; glm-4-6 29 "Reasoning" (/models/glm-4-6-reasoning); kimi-k3 60 "max effort"; kimi-k2-7-code 43 ""; kimi-k2-6 45 "reasoning"; minimax-m3 45 ""; minimax-m2-7 39 "reasoning"; mistral-large-3 16 ""; mistral-medium-3-5 30 ""; deepseek-v4-pro 53 "V4 Pro 0813, max effort"; deepseek-v4-flash 52 "V4 Flash 0731, max"; qwen3-8-max 58 ""; qwen3-7-plus 39 ""; qwen3-8-27b 52 ""; nemotron-3-ultra 38 "550B-A55B" (/models/nvidia-nemotron-3-ultra-550b-a55b); nemotron-3-5-lightning 24 ""; hy3 42 ""; mimo-v2-5 38 "reasoning, 0424 build" (/models/mimo-v2-5-0424); mimo-v2-5-pro 43 "reasoning"; step-3-5-flash 27 "estimated" (/models/step-3-5-flash); step-3-7-flash 31 ""; command-a-plus 23 ""; inkling 42 ""; inkling-small 41 ""; motif-3 47 "". NO ranking block: laguna-s-2-1, laguna-xs-2-1, command-a-reasoning, phi-4-mini-flash-reasoning (unscored).

**Official limits fills** (offerings missing them; source + verified 2026-08-20):
- minimax provider m2-5 + m2-7 offerings: context 204_800 (source https://platform.minimax.io/docs/guides/text-generation — "input+output combined" goes in a note? limits have no notes — put the combined note in the offering reasoning notes? NO — add to provider quirks instead: append one quirk "Context windows count input+output combined; M2.x output cap per third parties is 131,072." Hmm keep simpler: just context fills; skip quirk).
- alibaba-dashscope qwen3-7-plus offering: limits 1_048_576 / 65_536 (source https://www.alibabacloud.com/blog/qwen3-7-plus-multimodal-agent-intelligence_603206).
- opencode-go hy3 offering: limits 262_144 / 131_072 (source https://www.tencentcloud.com/document/product/1300/80695 — hy3 256k ctx / 128k out, max input 192k; put "max input 192k" in reasoning notes).
- openrouter mistral-large-3 offering: limits 262_144 (source https://docs.mistral.ai/resources/known-limitations).
- google-gemini gemma-4 offering: limits 262_144 (31B/medium 256K — source https://ai.google.dev/gemma/docs/core/model_card_4) if not already present.
- opencode-zen/OR mimo offerings: add limits 1_048_576 to the two xiaomi provider offerings ONLY if missing (they should already have them — check; fill OR mimo offerings too: source mimo.xiaomi.com).
NO output fills where only third-party numbers exist (gemma-4 output, mimo outputs, step outputs, nemotron output, laguna output) — stay "—".

## Task 2: Site UI

**Models index** (`models/index.astro` + modelRows.ts):
- New "AA Index" column: score bold + tiny "v4.1.1" muted superscript; "—" unscored. Sortable (data-sort numeric, empties last — existing convention). data-facet none.
- New "Reasoning" column: compact per-model summary derived from its offerings — prefer the highest-fidelity offering: effort → `effort low–max` (min–max of values, marking default with ° e.g. `none–max (med)`), budget → `budget 1k–128k`, toggle → `toggle`, adaptive → `adaptive`, always_on → `always-on`, none/absent → "—". Join distinct styles with " / " when a model has mixed styles across offerings (dedupe). data-sort key = the summary string.
- Footer line under the table: "Intelligence Index v4.1.1 scores by Artificial Analysis, accessed 2026-08-20 — methodology." linked to https://artificialanalysis.ai/leaderboards/models.
**Model detail** (`models/[id].astro`):
- Facts hero: add "Context (max)" and "Max output" rows computed across offerings (formatted with commas; "—" if none) — ensures they always show even when tables scroll.
- Ranking line near the top (under description): "Intelligence Index v4.1.1: 63 · Adaptive Reasoning, Max Effort · Source: Artificial Analysis (accessed 2026-08-20)" with the AA page hyperlinked; omit when unscored.
- NEW "Reasoning controls" section after Offerings: one panel per offering (grouped by provider) showing: style chip (existing), effort values as pill list with default marked (e.g. `low · medium● · high`), budget `min–max tokens` (+zero-means-off/special values notes), toggle on/off values, mandatory/returns/round-trip chips (reuse existing), incompatible_with as muted list. Panels render from offering data only.
- Variant knobs: in the Offerings table add a "Variant" cell — a small chip when the offering's wire_id contains one of `fast|turbo|highspeed|ultraspeed|lite|mini|nano|flash|air|pro|sol|terra|luna|contributor` (case-insensitive), labeled by the matched token (first match); no chip on base ids. Purely derived display.
**Provider pages**: no change (ranking lives on models).
**Search/pagefind**: new sections index automatically; no filter changes.

## Task 3: Verification
- `pnpm validate` → 55/34/206 unchanged (ranking/limits don't change counts); schema tests updated+green; full suite.
- rm -rf dist && emit && site build; greps: models index contains "v4.1.1" + "61" (grok/opus) + sorted column header "AA Index"; model page opus-5 shows "Intelligence Index v4.1.1: 63" + AA link; gpt-5-6 page shows Reasoning controls with values list incl. default marker; kimi-k2-7-code-highspeed offering shows "highspeed" variant chip (on kimi-k2-7-code model page); minimax-m2-7 page shows "204,800" context; laguna page shows "—" score and no ranking line; attribution footer on models index; standing greps (table-enhance, prov-pop, search form, stat line 55/34/206).

## Constraints
English; plain commits ("Add AA intelligence rankings with attribution", "Show reasoning controls, context hero, and variant knobs on model pages"), NO trailers; branch `feat/rankings-ui`; scores verbatim from the research table; never display third-party-only outputs; zero new client-side JS (variant chips and controls panels are static).
