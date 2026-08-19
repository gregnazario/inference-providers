# Contributing to inference-providers

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
