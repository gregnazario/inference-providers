import type { SdkCatalog } from "@inference-providers/sdk"

type CatalogModel = SdkCatalog["models"][number]

/** One provider serving a model, as listed in the Providers popover. */
export type ProviderRef = {
  id: string
  name: string
  /** Distinct wire ids this provider uses for the model across its endpoints. */
  wireIds: string[]
  /** Number of offerings (endpoint surfaces) the provider serves the model on. */
  endpoints: number
}

/** Everything the models index and archive tables render per model row. */
export type ModelRow = {
  model: CatalogModel
  /** Total offerings of this model across all providers. */
  offerings: number
  /** Max context / output limits across the offerings that record limits. */
  context: number
  output: number
  /** Unique providers serving the model (a multi-endpoint provider once). */
  providers: ProviderRef[]
}

/**
 * Build the table rows for a set of catalog models (current or archived) in
 * one pass over the providers: counts offerings, tracks limit maxima, and
 * collects each model's unique providers with their wire ids. Rows sort by
 * lab, then model name — the shared rendering for both tables.
 */
export function modelRows(catalog: SdkCatalog, models: CatalogModel[]): ModelRow[] {
  const byModel = new Map<string, Omit<ModelRow, "model">>()
  for (const p of catalog.providers) {
    for (const o of p.offerings) {
      let row = byModel.get(o.model)
      if (!row) {
        row = { offerings: 0, context: 0, output: 0, providers: [] }
        byModel.set(o.model, row)
      }
      row.offerings += 1
      if (o.limits) {
        if (o.limits.context > row.context) row.context = o.limits.context
        if (o.limits.output != null && o.limits.output > row.output) row.output = o.limits.output
      }
      let ref = row.providers.find((r) => r.id === p.id)
      if (!ref) {
        ref = { id: p.id, name: p.name, wireIds: [], endpoints: 0 }
        row.providers.push(ref)
      }
      ref.endpoints += 1
      if (!ref.wireIds.includes(o.wire_id)) ref.wireIds.push(o.wire_id)
    }
  }

  return models
    .map((model) => ({
      model,
      ...(byModel.get(model.id) ?? { offerings: 0, context: 0, output: 0, providers: [] }),
    }))
    .sort((a, b) => a.model.lab.localeCompare(b.model.lab) || a.model.name.localeCompare(b.model.name))
}
