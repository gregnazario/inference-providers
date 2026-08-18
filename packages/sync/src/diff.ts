/** Per-provider drift between the catalog and a live model list. */
export type DriftReport = { providerId: string; added: string[]; removed: string[] }

/**
 * Sorted set arithmetic over wire ids. Inputs are deduplicated first (a
 * catalog may list the same wire id under two endpoints; a live list may
 * repeat an id), then `added` is live-minus-catalog and `removed` is
 * catalog-minus-live, each sorted lexicographically.
 */
export function diffWireIds(catalogWireIds: string[], liveWireIds: string[]): {
  added: string[]
  removed: string[]
} {
  const catalog = new Set(catalogWireIds)
  const live = new Set(liveWireIds)
  const added = [...live].filter((id) => !catalog.has(id)).sort()
  const removed = [...catalog].filter((id) => !live.has(id)).sort()
  return { added, removed }
}
