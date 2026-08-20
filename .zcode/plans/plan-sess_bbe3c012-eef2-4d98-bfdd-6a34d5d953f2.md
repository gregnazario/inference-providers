## Goal

Upgrade the site from Astro **5.18.2** → latest **7.x** (currently 7.2.4), crossing the v6 and v7 major releases. The repo's Astro surface is minimal (no `@astrojs/*` integrations, no adapter, static output, no content collections, no experimental flags), so the change itself is a one-line dependency bump — the work is verification.

## Relevant breaking changes (mapped to this repo)

**Astro 6 (Vite 7, Node ≥22.12 required):**
- Node 22.12+ required. CI pins `node-version: 22` (resolves to latest 22.x, so fine). Local Node must be ≥22.12 — will check.
- `getStaticPaths` can no longer return numeric params — site uses string slugs only; verify build passes.
- `import.meta.env` values always inlined — site only uses `BASE_URL`, unaffected.

**Astro 7 (Vite 8, Rust compiler):**
- New Rust compiler **errors on unclosed/invalid HTML** — build will catch any malformed template.
- `compressHTML` default changed `true` → `'jsx'` (more aggressive whitespace removal; adjacent inline elements can lose separating spaces). If rendered pages show missing spaces, explicitly set `compressHTML: true` in `site/astro.config.mjs` to keep v5 behavior.
- Markdown pipeline replaced (Sätteri) — `site/src/pages/verify.md` must be re-checked; no custom remark/rehype plugins used, so nothing to migrate.
- Reserved filename `src/fetch.ts` — site doesn't have one.
- Vite 8 — `vite.build.rollupOptions.output.entryFileNames` is still a supported config path, but the custom hook string-matches Astro's internal chunk naming (`chunk.name.includes("type_script")`), which could change under the new compiler. Must verify `dist/_astro/table-enhance.<hash>.js` is still produced and referenced.

## Steps

1. **Baseline build (pre-upgrade):** run `pnpm --filter site run build` on current 5.18.2 and copy `site/dist` to a temp dir for later comparison.
2. **Bump dependency:** in `site/package.json`, change `"astro": "^5.0.0"` → `"^7.0.0"` (matches repo's existing caret-range style; lockfile pins the exact latest).
3. **Install:** `pnpm install` to update `pnpm-lock.yaml`. Confirm local pnpm major matches CI's pnpm 9 so the lockfile format stays compatible.
4. **Rebuild and verify:**
   - Build succeeds (fixes any template the Rust compiler flags).
   - `dist/_astro/table-enhance.<hash>.js` exists and pages reference it — adjust the `entryFileName` matcher in `site/astro.config.mjs` if Astro 7's chunk naming changed.
   - Diff pre/post build HTML: whitespace-only diffs are expected from the `compressHTML` change; look for genuinely missing visible spaces between inline elements (e.g. in prose/tables). Set `compressHTML: true` if real regressions appear.
   - `verify.md` renders correctly.
   - `search.astro` inline script (`define:vars` + `is:inline`) intact in output.
   - Root workspace still green: `pnpm build` / `pnpm typecheck`.
5. **Report:** summarize version jump, any config/template fixes made, and diff findings.

No commits unless you ask. Only `site/package.json` + `pnpm-lock.yaml` are expected to change (plus `astro.config.mjs` only if a fallback or chunk-name fix is needed).