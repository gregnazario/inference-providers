# Contributing to inference-providers

Thanks for contributing! This project welcomes contributions of all kinds —
data corrections, new providers and models, docs, and tooling.

Contributions are licensed under the [Apache License 2.0](LICENSE). By
submitting a pull request (or otherwise contributing), you agree that your
contributions are licensed under Apache-2.0 and that the project may
redistribute them under that license.

### PR checklist

- [ ] `pnpm validate` is green (data + provenance gates)
- [ ] Every mutable fact carries complete provenance (`[*.source] url/verified`)
- [ ] Facts you could not fully verify are flagged with a note in the PR
      describing what was checked and against which source
- [ ] `pnpm emit` was run and the regenerated `dist/` changes are included
      (never hand-edit `dist/`)

The verification procedure for every fact dimension — pricing, models,
features (reasoning), auth, and API compatibility — is documented on the
[Verify page](https://gregnazario.github.io/inference-providers/verify/)
(source: [`site/src/pages/verify.md`](site/src/pages/verify.md)). When in
doubt about how to verify a fact, start there.

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

## Sync drift detection

`runSync` (in `packages/sync`) compares live provider APIs against the catalog:
adapters list each provider's wire ids, the diff engine classifies them as
added/removed/unchanged versus `data/`, and `pnpm --filter @inference-providers/sync
run report` prints a dry-run summary. Two invariants:

- **Sync never writes capability facts.** It only reports drift — every cost,
  limit, and reasoning fact in `data/` still needs a human-verified source URL.
- **New wire ids land as offerings only after human verification.** An added
  wire id from a sync run is a lead, not a fact: create the offering TOML only
  once you've confirmed the model mapping and filled `[*.source]` entries from
  provider documentation.

## Verification methodology

Every fact dimension has a defined verification procedure — pricing, models,
features (reasoning), auth models, and API compatibility. The full guide lives
in [`site/src/pages/verify.md`](site/src/pages/verify.md) and is rendered at
`/verify/` on the site. The short version:

- **Pricing**: the provider's canonical pricing page, cross-checked against a
  live request; `source.url` must point at the exact page. Subscription
  surfaces carry a `[plan]` block, never per-token costs.
- **Models**: live `GET /models` is ground truth for wire IDs
  (`pnpm --filter @inference-providers/sync run report`); copy IDs verbatim;
  record deprecations as `status` with dates.
- **Features**: classify the reasoning control style from the provider's
  thinking docs, then confirm with a live request — the site's generated
  examples are the test templates. `mandatory` never combines with `none` in
  values. `incompatible_with` is for params that error; ignored behavior goes
  in notes.
- **Auth**: enumerate every method (key header scheme, OAuth flow + token
  transport, signing, subscription keys); a live 401 usually names the
  expected header; traps go in quirks.
- **Compatible APIs**: point the official SDK at the base URL and make a
  minimal call; classify the protocol per endpoint; record every divergence
  and the presence/absence of operation families in `api_surfaces`.

