import { describe, expect, it } from "vitest"
import { OfferingSchema } from "../src/offering.js"

const src = { url: "https://docs.example.com", verified: "2026-08-18" }
const valid = {
  model: "anthropic/claude-sonnet-4-6", wire_id: "claude-sonnet-4-6", endpoint: "v1-messages",
  status: "ga", status_date: "",
  cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75, free: false, source: src },
  limits: { context: 200000, output: 64000, source: src },
  reasoning: {
    style: "budget", mandatory: false, default: "on", returns: "thinking_blocks",
    must_round_trip: "signature", incompatible_with: ["temperature", "top_p", "top_k"],
    budget: { param: "thinking.budget_tokens", min: 1024, max: 128000, zero_means_off: false },
    toggle: { param: "thinking.type", on: "enabled", off: "disabled" },
    source: src,
  },
}

describe("OfferingSchema", () => {
  it("accepts a full offering", () => expect(OfferingSchema.safeParse(valid).success).toBe(true))
  it("accepts cost/limits omitted entirely (unknown)", () => {
    const { cost, limits, ...rest } = valid
    expect(OfferingSchema.safeParse(rest).success).toBe(true)
  })
  it("defaults features to all-true", () => {
    expect(OfferingSchema.parse(valid).features).toEqual({
      streaming: true, tools: true, structured_output: true, prompt_caching: true, vision: true,
    })
  })
  it("rejects bad model ref", () => {
    expect(OfferingSchema.safeParse({ ...valid, model: "nope" }).success).toBe(false)
  })
})
