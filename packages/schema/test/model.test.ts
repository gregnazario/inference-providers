import { describe, expect, it } from "vitest"
import { ModelSchema } from "../src/model.js"

const valid = {
  id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", family: "claude", lab: "anthropic",
  release_date: "2025-09-29", retired_date: "", knowledge_cutoff: "2025-07-31",
  open_weights: false, hf_repo: "", license: "",
  modalities: { input: ["text", "image"], output: ["text"] },
  description: "Flagship Claude model.",
}

describe("ModelSchema", () => {
  it("accepts a valid model", () => expect(ModelSchema.safeParse(valid).success).toBe(true))
  it("accepts unknown dates as empty strings", () => {
    expect(ModelSchema.safeParse({ ...valid, release_date: "", knowledge_cutoff: "" }).success).toBe(true)
  })
  it("rejects non-qualified id", () => {
    expect(ModelSchema.safeParse({ ...valid, id: "claude-sonnet-4-6" }).success).toBe(false)
  })
  it("rejects bad modality value", () => {
    expect(ModelSchema.safeParse({ ...valid, modalities: { input: ["vibes"], output: ["text"] } }).success).toBe(false)
  })
  it("allows omitted open_weights and hf_repo (unknown)", () => {
    const r = ModelSchema.safeParse({ ...valid, open_weights: undefined, hf_repo: undefined })
    expect(r.success).toBe(true)
  })
  it("allows fully absent open_weights and hf_repo keys", () => {
    const noWeights = { ...valid } as Partial<typeof valid>
    delete noWeights.open_weights
    delete noWeights.hf_repo
    const r = ModelSchema.safeParse(noWeights)
    expect(r.success).toBe(true)
  })
  it("preserves open_weights when present and undefined when omitted", () => {
    expect(ModelSchema.parse({ ...valid }).open_weights).toBe(false)
    expect(ModelSchema.parse({ ...valid }).hf_repo).toBe("")
    expect(ModelSchema.parse({ ...valid, open_weights: undefined }).open_weights).toBeUndefined()
    expect(ModelSchema.parse({ ...valid, hf_repo: undefined }).hf_repo).toBeUndefined()
  })
  it("defaults aliases to []", () => {
    const r = ModelSchema.parse(valid)
    expect(r.aliases).toEqual([])
  })
})
