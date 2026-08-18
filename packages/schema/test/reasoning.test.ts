import { describe, expect, it } from "vitest"
import { ReasoningSchema } from "../src/reasoning.js"

const src = { url: "https://docs.example.com", verified: "2026-08-18" }
const base = { mandatory: false, default: "on", returns: "hidden", must_round_trip: "", source: src }

describe("ReasoningSchema", () => {
  it("effort style requires effort block with vocab values", () => {
    const ok = { ...base, style: "effort", effort: { param: "reasoning_effort", values: ["low", "medium", "high"], default: "medium" } }
    expect(ReasoningSchema.safeParse(ok).success).toBe(true)
    const badValue = { ...base, style: "effort", effort: { param: "reasoning_effort", values: ["turbo"], default: "turbo" } }
    expect(ReasoningSchema.safeParse(badValue).success).toBe(false)
  })
  it("effort default must be in values", () => {
    const bad = { ...base, style: "effort", effort: { param: "reasoning_effort", values: ["low", "high"], default: "medium" } }
    expect(ReasoningSchema.safeParse(bad).success).toBe(false)
  })
  it("budget style requires budget, rejects effort block", () => {
    const ok = { ...base, style: "budget", budget: { param: "thinking.budget_tokens", min: 1024, max: 128000, zero_means_off: false } }
    expect(ReasoningSchema.safeParse(ok).success).toBe(true)
    const bad = { ...ok, effort: { param: "x", values: ["low", "high"], default: "low" } }
    expect(ReasoningSchema.safeParse(bad).success).toBe(false)
  })
  it("budget min must be < max", () => {
    const bad = { ...base, style: "budget", budget: { param: "b", min: 5000, max: 4000, zero_means_off: false } }
    expect(ReasoningSchema.safeParse(bad).success).toBe(false)
  })
  it("toggle style requires toggle block; mandatory allows empty off", () => {
    const ok = { ...base, style: "toggle", mandatory: true, default: "on", toggle: { param: "thinking.type", on: "enabled", off: "" } }
    expect(ReasoningSchema.safeParse(ok).success).toBe(true)
    expect(ReasoningSchema.safeParse({ ...base, style: "toggle" }).success).toBe(false)
  })
  it("adaptive style allows optional effort steering", () => {
    const ok = { ...base, style: "adaptive", default: "adaptive", effort: { param: "output_config.effort", values: ["low", "medium", "high"], default: "high" } }
    expect(ReasoningSchema.safeParse(ok).success).toBe(true)
  })
  it("always_on rejects toggle/budget/effort blocks", () => {
    const ok = { ...base, style: "always_on", mandatory: true, default: "on", returns: "hidden" }
    expect(ReasoningSchema.safeParse(ok).success).toBe(true)
    const bad = { ...ok, toggle: { param: "t", on: "enabled", off: "disabled" } }
    expect(ReasoningSchema.safeParse(bad).success).toBe(false)
  })
  it("none style is valid for non-reasoning models", () => {
    expect(ReasoningSchema.safeParse({ ...base, style: "none", default: "off" }).success).toBe(true)
  })
  it("effort style allows optional toggle block (deepseek-style surfaces)", () => {
    const ok = {
      ...base, style: "effort",
      effort: { param: "reasoning_effort", values: ["low", "high", "max"], default: "high" },
      toggle: { param: "thinking.type", on: "enabled", off: "disabled" },
    }
    expect(ReasoningSchema.safeParse(ok).success).toBe(true)
    const noEffort = { ...base, style: "effort", toggle: { param: "thinking.type", on: "enabled", off: "disabled" } }
    expect(ReasoningSchema.safeParse(noEffort).success).toBe(false)
  })
})
