import { basename } from "node:path"
import {
  ModelSchema, OfferingSchema, ProviderSchema,
  type Model, type Offering, type Provider,
} from "@ai-providers/schema"
import type { loadRaw } from "./parse.js"

export class ValidationError extends Error {
  constructor(public issues: string[]) {
    super(`validation failed:\n${issues.map((i) => `  - ${i}`).join("\n")}`)
  }
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

export function validateData(
  raw: ReturnType<typeof loadRaw>,
  opts: { today?: string } = {},
): { models: Model[]; providers: Provider[]; offerings: { providerId: string; data: Offering }[]; warnings: string[] } {
  const today = opts.today ?? new Date().toISOString().slice(0, 10)
  const issues: string[] = []
  const warnings: string[] = []

  const models = new Map<string, Model>()
  for (const f of raw.modelFiles) {
    const r = ModelSchema.safeParse(f.data)
    if (!r.success) { issues.push(`${f.path}: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`); continue }
    const m = r.data
    const [lab, slug] = m.id.split("/")
    if (slug !== basename(f.path, ".toml")) issues.push(`${f.path}: file name must match model id "${m.id}"`)
    if (!f.path.includes(`/${lab}/`)) issues.push(`${f.path}: must live under models/${lab}/`)
    if (models.has(m.id)) issues.push(`${f.path}: duplicate model id "${m.id}"`)
    models.set(m.id, m)
  }

  const providers = new Map<string, Provider>()
  for (const f of raw.providerFiles) {
    const r = ProviderSchema.safeParse(f.data)
    if (!r.success) { issues.push(`${f.path}: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`); continue }
    const p = r.data
    if (providers.has(p.id)) issues.push(`${f.path}: duplicate provider id "${p.id}"`)
    providers.set(p.id, p)
  }

  const offerings: { providerId: string; data: Offering }[] = []
  const wireIds = new Map<string, Set<string>>()
  for (const f of raw.offeringFiles) {
    const r = OfferingSchema.safeParse(f.data)
    if (!r.success) { issues.push(`${f.path}: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`); continue }
    const o = r.data
    if (!models.has(o.model)) issues.push(`${f.path}: unknown model "${o.model}"`)
    const provider = providers.get(f.providerId)
    if (!provider) { issues.push(`${f.path}: offering in unknown provider dir "${f.providerId}"`) }
    else if (!provider.endpoints.some((e) => e.id === o.endpoint)) {
      issues.push(`${f.path}: unknown endpoint "${o.endpoint}" on provider "${f.providerId}"`)
    }
    const seen = wireIds.get(f.providerId) ?? new Set<string>()
    if (seen.has(o.wire_id)) issues.push(`${f.path}: duplicate wire_id "${o.wire_id}" on provider "${f.providerId}"`)
    seen.add(o.wire_id)
    wireIds.set(f.providerId, seen)

    const checkSource = (label: string, url: string, verified: string) => {
      const age = daysBetween(verified, today)
      if (age > 180) issues.push(`${f.path}: stale provenance for ${label} (${verified}, ${age} days old) — re-verify`)
      else if (age > 90) warnings.push(`${f.path}: ${label} provenance unverified for ${age} days (over 90 days)`)
      void url
    }
    checkSource("cost", o.cost?.source.url ?? "", o.cost?.source.verified ?? today)
    checkSource("limits", o.limits?.source.url ?? "", o.limits?.source.verified ?? today)
    checkSource("reasoning", o.reasoning.source.url, o.reasoning.source.verified)

    offerings.push({ providerId: f.providerId, data: o })
  }

  if (issues.length > 0) throw new ValidationError(issues)
  return { models: [...models.values()], providers: [...providers.values()], offerings, warnings }
}
