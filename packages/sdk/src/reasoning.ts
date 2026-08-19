import type { EFFORT_VOCAB, Offering } from "@inference-providers/schema"

/** Effort vocabulary, derived from the schema package's single source of truth. */
export type EffortValue = (typeof EFFORT_VOCAB)[number]

export type ReasoningRequest =
  | { kind: "effort"; effort: EffortValue }
  | { kind: "budget"; budget: number }
  | { kind: "enabled"; enabled: boolean }

export type ReasoningParamErrorCode = "unsupported" | "invalid_value" | "out_of_range" | "mandatory"

/** Typed error carrying the rule that rejected the request; never clamps silently. */
export class ReasoningParamError extends Error {
  constructor(
    public code: ReasoningParamErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "ReasoningParamError"
  }
}

/** Path segments that would traverse or mutate object prototypes — rejected outright. */
const FORBIDDEN_PATH_SEGMENTS = new Set(["__proto__", "constructor", "prototype"])

/**
 * Generic dotted-path setter — the ONLY wire-shaping mechanism.
 * `setPath(o, "a.b.c", v)` mutates `o` so that `o.a.b.c === v`, creating
 * intermediate objects as needed (e.g. gemini's generationConfig.thinkingConfig).
 * Paths containing "__proto__", "constructor", or "prototype" are rejected
 * before any mutation to prevent prototype pollution.
 */
function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".")
  if (keys.some((key) => FORBIDDEN_PATH_SEGMENTS.has(key))) {
    throw new ReasoningParamError("unsupported", `invalid param path "${path}"`)
  }
  let cursor = obj
  for (const key of keys.slice(0, -1)) {
    const next = cursor[key]
    if (typeof next !== "object" || next === null) {
      cursor[key] = {}
    }
    cursor = cursor[key] as Record<string, unknown>
  }
  cursor[keys[keys.length - 1]!] = value
}

/** Toggle on/off values of exactly "true"/"false" coerce to booleans (Qwen enable_thinking); everything else passes through. */
function coerceToggleValue(value: string): string | boolean {
  if (value === "true") return true
  if (value === "false") return false
  return value
}

function unsupported(offering: Offering, what: string): ReasoningParamError {
  return new ReasoningParamError(
    "unsupported",
    `${offering.model} (${offering.endpoint}) does not support ${what} (reasoning style "${offering.reasoning.style}")`,
  )
}

/**
 * Turn an offering's structured reasoning spec into the exact wire parameter
 * fragment for the requested control. The returned object contains ONLY the
 * reasoning parameter tree — callers merge it into their request body.
 * Throws {@link ReasoningParamError} for values the surface cannot express.
 */
export function buildReasoningParam(offering: Offering, req: ReasoningRequest): Record<string, unknown> {
  const reasoning = offering.reasoning

  if (reasoning.style === "none") {
    throw unsupported(offering, "any reasoning control")
  }

  if (req.kind === "effort") {
    const effort = reasoning.style === "effort" || reasoning.style === "adaptive" ? reasoning.effort : undefined
    if (!effort) {
      throw unsupported(offering, "effort control")
    }
    if (!effort.values.includes(req.effort)) {
      throw new ReasoningParamError(
        "invalid_value",
        `effort "${req.effort}" is not valid for ${offering.model}; allowed values: ${effort.values.join(", ")}`,
      )
    }
    const fragment: Record<string, unknown> = {}
    setPath(fragment, effort.param, req.effort)
    return fragment
  }

  if (req.kind === "budget") {
    const budget = reasoning.style === "budget" || reasoning.style === "effort" ? reasoning.budget : undefined
    if (!budget) {
      throw unsupported(offering, "budget control")
    }
    // Special values (e.g. gemini's -1 = dynamic) bypass range validation when listed.
    const special = Object.keys(budget.special_values ?? {})
    if (!special.includes(String(req.budget))) {
      if (budget.min !== undefined && req.budget < budget.min) {
        throw new ReasoningParamError(
          "out_of_range",
          `budget ${req.budget} is below the minimum ${budget.min} for ${offering.model}`,
        )
      }
      if (budget.max !== undefined && req.budget > budget.max) {
        throw new ReasoningParamError(
          "out_of_range",
          `budget ${req.budget} is above the maximum ${budget.max} for ${offering.model}`,
        )
      }
    }
    const fragment: Record<string, unknown> = {}
    setPath(fragment, budget.param, req.budget)
    return fragment
  }

  // req.kind === "enabled"
  const toggle =
    reasoning.style === "budget" || reasoning.style === "effort" || reasoning.style === "toggle"
      ? reasoning.toggle
      : undefined

  if (!req.enabled) {
    if (reasoning.mandatory) {
      throw new ReasoningParamError(
        "mandatory",
        `reasoning cannot be disabled on this surface (${offering.model} on ${offering.endpoint})`,
      )
    }
    if (toggle) {
      const fragment: Record<string, unknown> = {}
      setPath(fragment, toggle.param, coerceToggleValue(toggle.off))
      return fragment
    }
    if (reasoning.style === "budget" && reasoning.budget.zero_means_off) {
      const fragment: Record<string, unknown> = {}
      setPath(fragment, reasoning.budget.param, 0)
      return fragment
    }
    throw unsupported(offering, "disabling reasoning")
  }

  if (toggle) {
    const fragment: Record<string, unknown> = {}
    setPath(fragment, toggle.param, coerceToggleValue(toggle.on))
    return fragment
  }
  // Nothing to turn on: adaptive/always_on (or default-on budget surfaces) with no toggle.
  return {}
}
