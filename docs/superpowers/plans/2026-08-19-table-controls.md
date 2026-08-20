# inference-providers — Table Filtering & Ordering

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Sortable columns + filter controls on the models index, archive, and providers index tables — progressive enhancement over the fully-rendered static tables.

**Approach:** ONE vanilla TypeScript module `site/src/scripts/table-enhance.ts` (no framework, no CDN, <200 lines) imported by the three pages. It targets `.table-wrap[data-enhance]`, reads facet/sort metadata from data attributes on the table, injects a controls bar (text filter + one `<select>` per declared facet + Reset), and wires header clicks for sorting. **Without JS the tables render exactly as today** (controls absent, default order). Astro `<script>` with `type="module"` on the page bundles it.

## Data contract (markup changes in the three pages)

- On each sortable `<th>`: `data-sort-key="context"` (etc.) + `data-sort-type="text"|"num"|"date"`; header content wrapped in a `<button>` ONLY via the script (progressive: markup keeps plain th text; script injects buttons + aria-sort). Simpler alternative if cleaner: script wraps th content automatically when data-sort-key present.
- On each `<td>`: `data-sort="<normalized key>"` — numbers as plain numeric strings (context tokens as integer, offerings/providers counts as int, weights "" vs "1"/"0", release_date ISO or "" → empty sorts last asc, first desc? define: empty always last regardless of direction).
- Facets: on the `<table>` tag, `data-facets='[{"key":"lab","label":"Lab"},{"key":"weights","label":"Weights"},{"key":"providersKind","label":"Kind"},{"key":"protocol","label":"Protocol"}]'` (only the facets each page wants); each `<tr>` carries matching `data-facet-lab="openai"`, `data-facet-weights="open"|"closed"`, `data-facet-kind="subscription"`, `data-facet-protocol="openai-chat"` (first protocol for providers index? providers have several — use a data-facet-protocol per row listing all, comma-separated; select matches if the value is contained — keep the match logic "row value contains selected value").
- Pages: models/index (facets: lab, weights; sortable: name, lab, release, context, output, offerings, providers), models/archive (same), providers/index (facets: kind, protocol; sortable: name, kind).

## Script behavior

- Controls bar injected above the table inside the wrap: text `<input type="search" placeholder="Filter rows…">`, one select per facet (options derived from unique row values, sorted, first option "All <label>"), Reset button (appears only when any control is active).
- Filtering: text input matches row `textContent` (case-insensitive); selects match per containment rule above. Row count indicator "N of M" updates; "No matching rows" empty state row when zero.
- Sorting: click header toggles asc/desc (second click flips, third restores original order? two-state is fine: asc/desc toggle); numeric/date/text compare by declared type; empty values always last; `aria-sort` maintained; visual arrow indicator via CSS (`.sort-asc::after`/`.sort-desc::after` using existing tokens).
- State is NOT persisted (no URL params) — keep v1 simple.
- Escape XSS: all control labels/values created via createElement/textContent — never innerHTML with data.

## Verification

- Build greps: the three pages reference the bundled script (`<script type="module" src="…table-enhance…">`); `data-sort-key` present on headers; dist tables unchanged server-side otherwise (standing greps still pass — stat line, prov-pop, help, search form).
- Browser smoke (implementer, Playwright or equivalent): on /models/ — sort by context desc (gpt-5.6-family tops), filter Lab=alibaba (rows shrink, count updates), text "kimi" narrows further, Reset restores; providers/ — filter Kind=subscription, sort name asc; archive — weights filter open. Record screenshots or DOM assertions in the report.
- `pnpm test`, `pnpm validate` (45/30/98), full build chain green.

## Constraints
English; plain commits ("Add sortable, filterable tables as progressive enhancement"), NO trailers; branch `feat/table-controls`; no framework deps; design tokens for all injected UI; no standing-grep regressions.
