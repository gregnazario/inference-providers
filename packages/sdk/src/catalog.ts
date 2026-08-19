import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Model, Offering, Provider } from "@ai-providers/schema"

export type SdkCatalog = {
  providers: (Provider & { offerings: Offering[] })[]
  models: (Model & { offered_via: { provider: string; wire_id: string; endpoint: string }[] })[]
}

/** Default location of the emitted catalog, resolved from the SDK source tree. */
const DEFAULT_CATALOG_PATH = join(import.meta.dirname, "../../../dist/catalog.json")

export class ModelNotFoundError extends Error {
  readonly providerId: string
  readonly wireId: string

  constructor(providerId: string, wireId: string) {
    super(`model "${wireId}" not found on provider "${providerId}"`)
    this.name = "ModelNotFoundError"
    this.providerId = providerId
    this.wireId = wireId
  }
}

/** Load the emitted catalog. Throws when the file is missing (run `pnpm emit` first). */
export function loadCatalog(path: string = DEFAULT_CATALOG_PATH): SdkCatalog {
  if (!existsSync(path)) {
    throw new Error("catalog not found — run pnpm emit")
  }
  return JSON.parse(readFileSync(path, "utf8")) as SdkCatalog
}

/**
 * Resolve a provider's wire id to its model, offering, and provider entries.
 * Wire ids are unique per (provider, endpoint); a provider may expose the same
 * wire id on multiple endpoints, so only the first matching offering is used.
 * Throws {@link ModelNotFoundError} when the provider or wire id is unknown.
 */
export function resolveModel(
  c: SdkCatalog,
  providerId: string,
  wireId: string,
): { model: SdkCatalog["models"][number]; offering: Offering; provider: Provider } {
  const provider = c.providers.find((p) => p.id === providerId)
  if (!provider) throw new ModelNotFoundError(providerId, wireId)
  const offering = provider.offerings.find((o) => o.wire_id === wireId)
  if (!offering) throw new ModelNotFoundError(providerId, wireId)
  const model = c.models.find((m) => m.id === offering.model)
  if (!model) throw new ModelNotFoundError(providerId, wireId)
  return { model, offering, provider }
}
