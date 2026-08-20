import { describe, expect, it } from "vitest"
import { CostSchema, SourceSchema, EFFORT_VOCAB } from "../src/common.js"

describe("SourceSchema", () => {
  it("accepts url + ISO date", () => {
    expect(SourceSchema.safeParse({ url: "https://x.ai/docs", verified: "2026-08-18" }).success).toBe(true)
  })
  it("rejects non-ISO date", () => {
    expect(SourceSchema.safeParse({ url: "https://x.ai", verified: "Aug 18" }).success).toBe(false)
  })
  it("rejects non-url", () => {
    expect(SourceSchema.safeParse({ url: "not-a-url", verified: "2026-08-18" }).success).toBe(false)
  })
})

describe("CostSchema", () => {
  it("accepts omitted fields as unknown and requires source", () => {
    const r = CostSchema.safeParse({ input: 3, source: { url: "https://a.com", verified: "2026-08-18" } })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.output).toBeNull()
  })
  it("rejects zero output without free=true", () => {
    expect(CostSchema.safeParse({ output: 0, free: false, source: { url: "https://a.com", verified: "2026-08-18" } }).success).toBe(false)
  })
  it("accepts zero output with free=true", () => {
    expect(CostSchema.safeParse({ output: 0, free: true, source: { url: "https://a.com", verified: "2026-08-18" } }).success).toBe(true)
  })
  it("parses an optional notes field through to output", () => {
    const r = CostSchema.safeParse({ input: 1, notes: "Tiered pricing.", source: { url: "https://a.com", verified: "2026-08-20" } })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.notes).toBe("Tiered pricing.")
  })
})

describe("EFFORT_VOCAB", () => {
  it("contains the controlled set", () => {
    expect(EFFORT_VOCAB).toEqual(["none", "minimal", "low", "medium", "high", "xhigh", "max"])
  })
})
