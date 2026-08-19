import {
  authHeaders,
  buildReasoningParam,
  ReasoningParamError,
  type EffortValue,
} from "@ai-providers/sdk"
import type { Offering, Provider } from "@ai-providers/schema"

/** Provider as materialized in the SDK catalog: schema Provider plus its offerings. */
export type CatalogProvider = Provider & { offerings: Offering[] }
export type CatalogOffering = Offering
export type CatalogEndpoint = Provider["endpoints"][number]

export interface ComputedExample {
  url: string
  /** Auth + Content-Type headers, inserted in case-insensitive sorted order. */
  headers: Record<string, string>
  /** True when the endpoint signs requests (sigv4) and a Bearer placeholder was substituted. */
  sigv4Fallback: boolean
  body: Record<string, unknown>
}

const PROMPT = "Tell me about the weather."

/** Structural view of the reasoning spec used to pick the example's fragment. */
type ReasoningControls = {
  style: string
  effort?: { default?: EffortValue }
  budget?: { min?: number; max?: number }
  toggle?: unknown
}

/**
 * The offering's own default reasoning control as a wire fragment:
 * effort default, else a mid-range budget sample, else the on-toggle.
 * Styles without a control block (none/always_on/adaptive-without-effort)
 * contribute nothing. Never throws — an example must not fail the build.
 */
function reasoningFragment(offering: CatalogOffering): Record<string, unknown> | null {
  const r = offering.reasoning as ReasoningControls
  try {
    if (r.effort?.default) {
      return buildReasoningParam(offering, { kind: "effort", effort: r.effort.default })
    }
    if (r.budget) {
      const sample = Math.min(Math.max(r.budget.min ?? 512, 2048), r.budget.max ?? Infinity)
      return buildReasoningParam(offering, { kind: "budget", budget: sample })
    }
    if (r.toggle) {
      return buildReasoningParam(offering, { kind: "enabled", enabled: true })
    }
    return null
  } catch (err) {
    if (err instanceof ReasoningParamError) return null
    throw err
  }
}

/**
 * Compute a runnable example request for one offering on one endpoint:
 * the URL ({model} filled with the wire id), sorted auth headers with the
 * `<YOUR_API_KEY>` placeholder, and the per-protocol body with the offering's
 * default reasoning fragment merged in. Request-signing auths (sigv4) are not
 * expressible as headers, so those fall back to a Bearer placeholder and set
 * `sigv4Fallback`.
 */
export function computeExample(
  provider: CatalogProvider,
  offering: CatalogOffering,
  endpoint: CatalogEndpoint,
): ComputedExample {
  // 1. URL: only {model} is filled in; other {slots} stay visible for substitution.
  const url = `${endpoint.base_url}${endpoint.path}`.replaceAll("{model}", offering.wire_id)

  // 2. Headers from the SDK, sorted case-insensitively by name.
  let headers: Record<string, string> = {}
  let sigv4Fallback = false
  try {
    const raw: Record<string, string> = {
      ...authHeaders(provider, { credential: "<YOUR_API_KEY>", authId: endpoint.auth }),
      "Content-Type": "application/json",
    }
    for (const name of Object.keys(raw).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    )) {
      headers[name] = raw[name]
    }
  } catch {
    headers = {
      Authorization: "Bearer <YOUR_API_KEY>",
      "Content-Type": "application/json",
    }
    sigv4Fallback = true
  }

  // 3. Protocol body; the reasoning fragment merges at the top level.
  const message = { role: "user", content: PROMPT }
  let body: Record<string, unknown> = {}
  switch (endpoint.protocol) {
    case "openai-chat":
      body = { model: offering.wire_id, messages: [message] }
      break
    case "openai-responses":
      body = { model: offering.wire_id, input: PROMPT }
      break
    case "anthropic-messages":
      body = { model: offering.wire_id, max_tokens: 1024, messages: [message] }
      break
    case "google-generate-content":
      body = { contents: [{ parts: [{ text: PROMPT }] }] }
      break
    case "bedrock-converse":
      body = { modelId: offering.wire_id, messages: [message] }
      break
  }

  const fragment = reasoningFragment(offering)
  if (fragment) {
    body = { ...body, ...fragment }
  }

  // Validity guard: the anthropic-messages budget constraint requires
  // max_tokens to exceed the thinking budget — keep the example servable.
  const thinking = body.thinking as { budget_tokens?: number } | undefined
  if (
    typeof thinking?.budget_tokens === "number" &&
    typeof body.max_tokens === "number" &&
    body.max_tokens <= thinking.budget_tokens
  ) {
    body.max_tokens = thinking.budget_tokens + 1024
  }

  return { url, headers, sigv4Fallback, body }
}

/**
 * Escape only the HTML-significant characters so single quotes stay literal
 * in the rendered source (shell quoting must survive copy-paste and greps).
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}
