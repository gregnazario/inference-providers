import type { Model, Offering, Provider } from "@ai-providers/schema"

export type Catalog = {
  providers: (Provider & { offerings: Offering[] })[]
  models: (Model & { offered_via: { provider: string; wire_id: string }[] })[]
}

export function buildCatalog(v: {
  models: Model[]; providers: Provider[]; offerings: { providerId: string; data: Offering }[]
}): Catalog {
  const offeringsByProvider = new Map<string, Offering[]>()
  for (const { providerId, data } of v.offerings) {
    const list = offeringsByProvider.get(providerId) ?? []
    list.push(data)
    offeringsByProvider.set(providerId, list)
  }
  const providers = v.providers
    .map((p) => ({ ...p, offerings: offeringsByProvider.get(p.id) ?? [] }))
    .map((p) => ({ ...p, offerings: p.offerings.sort((a, b) => a.model.localeCompare(b.model)) }))
  const models = v.models.map((m) => ({
    ...m,
    offered_via: v.offerings
      .filter((o) => o.data.model === m.id)
      .map((o) => ({ provider: o.providerId, wire_id: o.data.wire_id })),
  }))
  return { providers, models }
}
