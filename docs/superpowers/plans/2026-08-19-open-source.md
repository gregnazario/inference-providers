# inference-providers — Open-Source Scaffolding + Drift Automation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.

**Goal:** Fully open-source the repo under Apache-2.0 (LICENSE, NOTICE, package license fields, README section, CONTRIBUTING expansion, CODE_OF_CONDUCT, SECURITY.md, CODEOWNERS, issue templates) and make the daily sync actively open a tracking issue when provider drift is detected (or refresh the existing one).

**Architecture:** Docs/config only plus one workflow extension — no schema/data/SDK changes. The drift-issue step runs after the existing report step in sync.yml, reads `.superpowers/sync-report.json`, and uses the runner's `gh` CLI with `GITHUB_TOKEN` to create/update a single recurring issue titled exactly `Provider drift detected` (search by title; update body + comment if it exists, create if not; skip silently when no drift).

## Global Constraints

English only; plain commits, NO trailers; branch `feat/open-source`. Apache-2.0 license text must be the canonical full text. No secrets. CI (ci.yml) already covers branches+PRs and needs no changes.

## Task 1: Licensing

- `LICENSE`: canonical Apache License 2.0 full text, with the appendix copyright line `Copyright 2026 Greg Nazario` at the standard `   Copyright 2026 Greg Nazario` position in the appendix notice block.
- `NOTICE`:
  ```
  inference-providers
  Copyright 2026 Greg Nazario

  This product includes software developed by Greg Nazario
  (https://github.com/gregnazario).
  ```
- Root `package.json` + `packages/{schema,build,sdk,sync}/package.json` + `site/package.json`: add `"license": "Apache-2.0"` (keep field order tidy — after `version`).
- README: add a `## License` section at the end (Apache-2.0, link LICENSE) and a `## Contributing` section pointing at CONTRIBUTING.md and the /verify/ methodology; add CI + Pages badges at the top under the title.

## Task 2: Community files

- `CONTRIBUTING.md`: prepend an intro section: project welcomes contributions; contributions are licensed under Apache-2.0 (submitting = agreement); PR checklist (validate green, provenance complete, verify-notes for uncertain facts, run emit); pointer to the "Verify" page and site/src/pages/verify.md; keep all existing content below it.
- `CODE_OF_CONDUCT.md`: Contributor Covenant v2.1 canonical English text with contact `gregnazario` via GitHub (contact = open a private message on GitHub / link https://github.com/gregnazario).
- `SECURITY.md`: short policy — report privately via GitHub Security Advisories (repo Security tab); note that provider data is public web-scraped docs, not sensitive; supported behavior = latest main.
- `.github/CODEOWNERS`: `* @gregnazario`.
- `.github/ISSUE_TEMPLATE/provider-request.md` (name, docs URL, why) and `.github/ISSUE_TEMPLATE/data-correction.md` (file/field, correct value, source URL) — both markdown templates (no forms YAML, keep simple).

## Task 3: Drift-issue automation in sync.yml

Modify `.github/workflows/sync.yml`:
- permissions: add `issues: write` (keep contents: read).
- After the report step, add:

```yaml
      - name: Open or update drift issue
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          node --input-type=module -e '
            import { readFileSync } from "node:fs";
            const r = JSON.parse(readFileSync(".superpowers/sync-report.json", "utf8"));
            if (!r.reports || r.reports.length === 0) { console.log("no drift"); process.exit(0); }
            const body = r.reports.map((d) =>
              `## ${d.providerId}\n\n${d.added.length ? "**Added:**\\n" + d.added.map((x) => "- `" + x + "`").join("\\n") : ""}${d.removed.length ? "\\n**Removed:**\\n" + d.removed.map((x) => "- `" + x + "`").join("\\n") : ""}`
            ).join("\\n\\n") + "\\n\\n---\\n\\nDetected by the daily sync run. Offerings land only after human verification with sources — see the Verify page.";
            const title = "Provider drift detected";
            const { execSync } = await import("node:child_process");
            const existing = execSync(`gh issue list --repo "$GITHUB_REPOSITORY" --search "in:title ${JSON.stringify(title)}" --state open --json number --jq ".[0].number"`, { env: process.env }).toString().trim();
            if (existing) {
              execSync(`gh issue comment "${existing}" --repo "$GITHUB_REPOSITORY" --body-file -`, { input: body, env: process.env });
            } else {
              execSync(`gh issue create --repo "$GITHUB_REPOSITORY" --title "${title}" --body-file -`, { input: body, env: process.env });
            }
            console.log("drift issue updated");
          '
```

(Adjust quoting as needed to be valid YAML + bash — single-quote the node program, keep `--input-type=module`, verify with js-yaml and `bash -n` reasoning; the report JSON shape is `{ reports: [{ providerId, added, removed }], missingTargets, failed }` — confirm against packages/sync/src/run.ts before wiring.)

## Verification

- `pnpm test` + `pnpm validate` green (license fields must not break anything).
- `npx --yes js-yaml .github/workflows/sync.yml > /dev/null && echo YAML-OK`.
- Local drift-node smoke: run the node snippet against a hand-made two-report JSON in a temp dir with `GH_TOKEN` unset — expect it to attempt `gh` and fail cleanly AFTER printing the body; simpler: test the body-building path by adding an early `console.log(body); process.exit(0)` dry-run variant in a scratch file — verification = body renders both Added/Removed sections correctly.
- README renders badges; LICENSE present at repo root.
