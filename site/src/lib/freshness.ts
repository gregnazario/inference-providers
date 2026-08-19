import type { SdkCatalog } from "@inference-providers/sdk"

type CatalogModel = SdkCatalog["models"][number]

/** A model is archived once it is older than this many days at build time. */
const FRESHNESS_WINDOW_DAYS = 365

/**
 * The archive cutoff as an ISO date (YYYY-MM-DD): build date minus 365 days.
 * Computed at build time so the window moves automatically with each rebuild;
 * never a hardcoded date. ISO strings compare lexicographically as dates.
 */
export function cutoffDate(now: Date = new Date()): string {
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - FRESHNESS_WINDOW_DAYS)
  return cutoff.toISOString().slice(0, 10)
}

const CUTOFF = cutoffDate()

/**
 * Models exempt from the age rule despite a release date past the cutoff —
 * still the current generation of their line with no successor. GPT-OSS is
 * the open-weight standard still served everywhere (decision 2026-08-19).
 * Their true release dates stay in the data; only the archive rule skips.
 */
const GRANDFATHERED = new Set(["openai/gpt-oss-120b", "openai/gpt-oss-20b"])

/**
 * Single source of truth for the archive rule:
 * archived = retired_date is set, or release_date is set and older than the
 * cutoff (unless grandfathered). Unknown ("") release dates stay current —
 * never hide what cannot be dated.
 */
export function isArchived(model: CatalogModel, cutoff: string = CUTOFF): boolean {
  if (GRANDFATHERED.has(model.id)) return false
  return (
    model.retired_date !== "" ||
    (model.release_date !== "" && model.release_date < cutoff)
  )
}

/** Split catalog models into current and archived using {@link isArchived}. */
export function classify(
  models: CatalogModel[],
  cutoff: string = CUTOFF,
): { current: CatalogModel[]; archived: CatalogModel[] } {
  const current: CatalogModel[] = []
  const archived: CatalogModel[] = []
  for (const model of models) {
    ;(isArchived(model, cutoff) ? archived : current).push(model)
  }
  return { current, archived }
}
