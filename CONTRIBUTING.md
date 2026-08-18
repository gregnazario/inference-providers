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
