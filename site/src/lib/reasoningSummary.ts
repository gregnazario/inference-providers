import type { Reasoning } from "@inference-providers/schema"

/**
 * Derived, build-time-only views of offering reasoning data and wire ids.
 * Shared by the models index (per-model Reasoning column) and the model
 * detail page (Variant chips) so both render the same derivations.
 */

/** Effort vocabulary in ascending order (schema EFFORT_VOCAB). */
const EFFORT_ORDER = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const

/** Control styles ordered by fidelity: discrete levels first, none last. */
const STYLE_ORDER = ["effort", "budget", "toggle", "adaptive", "always_on"] as const

/** Tokens that mark a speed/size variant in a wire id (case-insensitive). */
const VARIANT_TOKENS = [
  "fast", "turbo", "highspeed", "ultraspeed", "lite", "mini", "nano",
  "flash", "air", "pro", "sol", "terra", "luna", "contributor",
] as const

/** Compact form for the index summary's default marker (spec: "none–max (med)"). */
const abbrev = (v: string) => (v === "medium" ? "med" : v === "minimal" ? "min" : v)

/** Token counts as compact k units (spec: "budget 1k–128k"). */
const fmtK = (n: number) => (n >= 1024 ? `${Math.round(n / 1024)}k` : String(n))

const rank = (v: string) => EFFORT_ORDER.indexOf(v as (typeof EFFORT_ORDER)[number])

const effortSummary = (blocks: { values: string[]; default: string }[]) => {
  // Prefer the highest-fidelity block (widest value set) for the default.
  const widest = blocks.reduce((a, b) => (b.values.length > a.values.length ? b : a))
  const min = blocks.flatMap((b) => b.values).reduce((a, b) => (rank(b) < rank(a) ? b : a))
  const max = blocks.flatMap((b) => b.values).reduce((a, b) => (rank(b) > rank(a) ? b : a))
  return min === max ? `effort ${min}` : `effort ${min}–${max} (${abbrev(widest.default)})`
}

const budgetSummary = (blocks: { min?: number; max?: number }[]) => {
  const b = blocks[0]
  const lo = b.min !== undefined ? fmtK(b.min) : null
  const hi = b.max !== undefined ? fmtK(b.max) : null
  if (lo && hi) return `budget ${lo}–${hi}`
  if (lo) return `budget ${lo}+`
  if (hi) return `budget ≤${hi}`
  return "budget"
}

const toggleSummary = () => "toggle"
const adaptiveSummary = () => "adaptive"
const alwaysOnSummary = () => "always-on"

/**
 * Compact per-model reasoning summary for the models index: one term per
 * distinct control style across the model's offerings, highest fidelity
 * first, joined with " / "; "—" when nothing offers reasoning controls.
 */
export function reasoningSummary(reasonings: Reasoning[]): string {
  const byStyle = new Map<string, string>()
  for (const r of reasonings) {
    if (r.style === "none") continue
    if (r.style === "effort") {
      const blocks = reasonings
        .filter((o): o is Extract<Reasoning, { style: "effort" }> => o.style === "effort")
        .map((o) => o.effort)
      byStyle.set("effort", effortSummary(blocks))
    } else if (r.style === "budget") {
      const blocks = reasonings
        .filter((o): o is Extract<Reasoning, { style: "budget" }> => o.style === "budget")
        .map((o) => o.budget)
      if (!byStyle.has("budget")) byStyle.set("budget", budgetSummary(blocks))
    } else if (r.style === "toggle") {
      byStyle.set("toggle", toggleSummary())
    } else if (r.style === "adaptive") {
      byStyle.set("adaptive", adaptiveSummary())
    } else {
      byStyle.set("always_on", alwaysOnSummary())
    }
  }
  const parts = STYLE_ORDER.filter((s) => byStyle.has(s)).map((s) => byStyle.get(s) as string)
  return parts.length > 0 ? parts.join(" / ") : "—"
}

/**
 * The variant token a wire id carries ("gpt-5.6-luna" → "luna"), or null for
 * base ids. Tokens match whole id segments — never substrings — so names like
 * "gemini" or "MiniMax" are never mistaken for "mini". First (leftmost) match.
 */
export function variantToken(wireId: string): string | null {
  for (const segment of wireId.toLowerCase().split(/[^a-z0-9]+/)) {
    if ((VARIANT_TOKENS as readonly string[]).includes(segment)) return segment
  }
  return null
}
